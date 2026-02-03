// src/app/features/admin/components/creer-candidat/creer-candidat.component.ts
import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminCandidatService } from '../../../services/service_candidats/admin-candidat.service';
import { InscriptionVolontaire, ProfilVolontaire } from '../../../models/volontaire.model';
import { AuthService } from '../../../services/service_auth/auth.service'; // ← AJOUT IMPORT

@Component({
  selector: 'app-creer-candidat',
  templateUrl: './creer-candidat.component.html',
  styleUrls: ['./creer-candidat.component.scss']
})
export class CreerCandidatComponent {
  creationForm: FormGroup;
  profilForm: FormGroup;
  etapeActuelle: 'identite' | 'profil' = 'identite';
  isLoading = false;
  messageSucces = '';
  messageErreur = '';

  constructor(
    private fb: FormBuilder,
    private adminCandidatService: AdminCandidatService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService // ← AJOUT INJECTION
  ) {
    this.creationForm = this.creerCreationForm();
    this.profilForm = this.creerProfilForm();
  }

  creerCreationForm(): FormGroup {
    return this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{10,}$/)]],
      dateNaissance: ['', [Validators.required, this.ageValidator(18)]],
      nationalite: ['', [Validators.required]],
      sexe: ['', [Validators.required]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      confirmerMotDePasse: ['', [Validators.required]]
    }, { validators: this.motsDePasseEgaux });
  }

  creerProfilForm(): FormGroup {
    return this.fb.group({
      adresseResidence: [''],
      regionGeographique: [''],
      niveauEtudes: [''],
      domaineEtudes: [''],
      competences: [[]],
      motivation: [''],
      disponibilite: ['Temps plein'],
      urlCV: [''],
      typePiece: ['CNIB'],
      numeroPiece: [''],
      urlPieceIdentite: ['']
    });
  }

  // Validateur pour vérifier que l'utilisateur a au moins 18 ans
  ageValidator(minAge: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      
      const birthDate = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age >= minAge ? null : { tooYoung: { requiredAge: minAge, actualAge: age } };
    };
  }

  motsDePasseEgaux(group: FormGroup): { [key: string]: any } | null {
    const motDePasse = group.get('motDePasse')?.value;
    const confirmerMotDePasse = group.get('confirmerMotDePasse')?.value;
    return motDePasse === confirmerMotDePasse ? null : { motsDePasseDifferents: true };
  }

  passerAuProfil(): void {
    if (this.creationForm.valid) {
      this.etapeActuelle = 'profil';
    } else {
      this.marquerChampsCommeTouches(this.creationForm);
    }
  }

  retourIdentite(): void {
    this.etapeActuelle = 'identite';
  }

  creerCandidat(): void {
    if (this.creationForm.invalid) {
      this.marquerChampsCommeTouches(this.creationForm);
      return;
    }

    this.isLoading = true;
    this.messageErreur = '';
    this.messageSucces = '';

    const inscriptionData: InscriptionVolontaire = {
      ...this.creationForm.value,
      consentementPolitique: true
    };

    const profilData: ProfilVolontaire = {
      adresseResidence: this.profilForm.get('adresseResidence')?.value || '',
      regionGeographique: this.profilForm.get('regionGeographique')?.value || '',
      niveauEtudes: this.profilForm.get('niveauEtudes')?.value || '',
      domaineEtudes: this.profilForm.get('domaineEtudes')?.value || '',
      competences: this.profilForm.get('competences')?.value || [],
      motivation: this.profilForm.get('motivation')?.value || '',
      disponibilite: this.profilForm.get('disponibilite')?.value || 'Temps plein',
      urlCV: this.profilForm.get('urlCV')?.value || '',
      typePiece: this.profilForm.get('typePiece')?.value || 'CNIB',
      numeroPiece: this.profilForm.get('numeroPiece')?.value || '',
      urlPieceIdentite: this.profilForm.get('urlPieceIdentite')?.value || ''
    };

    this.adminCandidatService.creerCandidatComplet(inscriptionData, profilData).subscribe({
      next: (result) => {
        this.isLoading = false;
        this.messageSucces = `Candidat ${result.user.prenom} ${result.user.nom} créé avec succès !`;
        
        setTimeout(() => {
          this.router.navigate(['/features/admin/comptes/gestion-candidats']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        this.messageErreur = 'Erreur lors de la création du candidat: ' + error.message;
      }
    });
  }

  private marquerChampsCommeTouches(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  ajouterCompetence(event: any): void {
    const input = event.target as HTMLInputElement;
    const valeur = input.value.trim();
    
    if (valeur) {
      const competencesActuelles = this.profilForm.get('competences')?.value || [];
      if (!competencesActuelles.includes(valeur)) {
        this.profilForm.patchValue({
          competences: [...competencesActuelles, valeur]
        });
      }
      input.value = '';
    }
  }

  supprimerCompetence(competence: string): void {
    const competencesActuelles = this.profilForm.get('competences')?.value || [];
    const nouvellesCompetences = competencesActuelles.filter((c: string) => c !== competence);
    this.profilForm.patchValue({
      competences: nouvellesCompetences
    });
  }

  // Dans creer-candidat.component.ts - CORRIGER la méthode annuler()
annuler(): void {
  console.log('🔄 Navigation depuis annuler()...');
  
  // 🔥 CORRECTION : Utiliser la navigation absolue avec des options
  this.router.navigate(['/features/admin/comptes/gestion-candidats'], {
    replaceUrl: true, // Remplace l'URL actuelle dans l'historique
    skipLocationChange: false // Assure que l'URL change
  }).then(success => {
    if (success) {
      console.log('✅ Navigation annuler réussie');
    } else {
      console.error('❌ Échec navigation annuler');
      // Fallback: rechargement complet
      window.location.href = '/features/admin/comptes/gestion-candidats';
    }
  }).catch(error => {
    console.error('💥 Erreur navigation annuler:', error);
    window.location.href = '/features/admin/comptes/gestion-candidats';
  });
}
}