// src/app/features/admin/components/creer-candidat/creer-candidat.component.ts
import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminCandidatService } from '../../../services/service_candidats/admin-candidat.service';
import { InscriptionVolontaire, ProfilVolontaire } from '../../../models/volontaire.model';
import { AuthService } from '../../../services/service_auth/auth.service';

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
    private authService: AuthService
  ) {
    this.creationForm = this.creerCreationForm();
    this.profilForm = this.creerProfilForm();
  }

  creerCreationForm(): FormGroup {
    // ✅ CORRECTION : typePiece et numeroPiece déplacés ici (étape identité),
    // car ce sont des données fixes saisies à l'inscription, pas dans le profil.
    return this.fb.group({
      nom:                    ['', [Validators.required, Validators.minLength(2)]],
      prenom:                 ['', [Validators.required, Validators.minLength(2)]],
      email:                  ['', [Validators.required, Validators.email]],
      telephone:              ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{10,}$/)]],
      dateNaissance:          ['', [Validators.required, this.ageValidator(18)]],
      nationalite:            ['', [Validators.required]],
      sexe:                   ['', [Validators.required]],
      // ✅ Pièce d'identité dans le formulaire d'identité
      typePiece:              ['CNIB', [Validators.required]],
      numeroPiece:            ['', [Validators.required]],
      motDePasse:             ['', [Validators.required, Validators.minLength(6)]],
      confirmerMotDePasse:    ['', [Validators.required]]
    }, { validators: this.motsDePasseEgaux });
  }

  creerProfilForm(): FormGroup {
    // ✅ CORRECTION : typePiece et numeroPiece RETIRÉS du profilForm.
    // ProfilVolontaire ne les contient plus — ils sont en lecture seule
    // dans le profil et ont été saisis à l'étape identité.
    return this.fb.group({
      adresseResidence:   [''],
      regionGeographique: [''],
      niveauEtudes:       [''],
      domaineEtudes:      [''],
      competences:        [[]],
      motivation:         [''],
      disponibilite:      ['Temps plein'],
      urlCV:              [''],
      urlPieceIdentite:   ['']  // document scanné — reste dans le profil
    });
  }

  ageValidator(minAge: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const birthDate = new Date(control.value);
      const today     = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age >= minAge ? null : { tooYoung: { requiredAge: minAge, actualAge: age } };
    };
  }

  motsDePasseEgaux(group: FormGroup): { [key: string]: any } | null {
    const mdp     = group.get('motDePasse')?.value;
    const confirm = group.get('confirmerMotDePasse')?.value;
    return mdp === confirm ? null : { motsDePasseDifferents: true };
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

    this.isLoading    = true;
    this.messageErreur = '';
    this.messageSucces = '';

    // ✅ inscriptionData inclut typePiece et numeroPiece depuis creationForm
    const inscriptionData: InscriptionVolontaire = {
      ...this.creationForm.value,
      consentementPolitique: true
    };

    // ✅ profilData ne contient que les 9 champs de ProfilVolontaire
    const profilData: ProfilVolontaire = {
      adresseResidence:   this.profilForm.get('adresseResidence')?.value   || '',
      regionGeographique: this.profilForm.get('regionGeographique')?.value || '',
      niveauEtudes:       this.profilForm.get('niveauEtudes')?.value       || '',
      domaineEtudes:      this.profilForm.get('domaineEtudes')?.value      || '',
      competences:        this.profilForm.get('competences')?.value        || [],
      motivation:         this.profilForm.get('motivation')?.value         || '',
      disponibilite:      this.profilForm.get('disponibilite')?.value      || 'Temps plein',
      urlCV:              this.profilForm.get('urlCV')?.value              || '',
      urlPieceIdentite:   this.profilForm.get('urlPieceIdentite')?.value   || ''
      // ✅ SUPPRIMÉ : typePiece et numeroPiece (n'existent plus sur ProfilVolontaire)
    };

    this.adminCandidatService.creerCandidatComplet(inscriptionData, profilData).subscribe({
      next: (result) => {
        this.isLoading    = false;
        this.messageSucces = `Candidat ${result.user.prenom} ${result.user.nom} créé avec succès !`;
        setTimeout(() => {
          this.router.navigate(['/features/admin/comptes/gestion-candidats']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading    = false;
        this.messageErreur = 'Erreur lors de la création du candidat: ' + error.message;
      }
    });
  }

  private marquerChampsCommeTouches(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  ajouterCompetence(valeur: string): void {
    const trimmed = valeur.trim();
    if (trimmed) {
      const actuelles = this.profilForm.get('competences')?.value || [];
      if (!actuelles.includes(trimmed)) {
        this.profilForm.patchValue({ competences: [...actuelles, trimmed] });
      }
    }
  }

  supprimerCompetence(competence: string): void {
    const actuelles = this.profilForm.get('competences')?.value || [];
    this.profilForm.patchValue({
      competences: actuelles.filter((c: string) => c !== competence)
    });
  }

  annuler(): void {
    this.router.navigate(['/features/admin/comptes/gestion-candidats'], {
      replaceUrl: true
    }).then(success => {
      if (!success) window.location.href = '/features/admin/comptes/gestion-candidats';
    }).catch(() => {
      window.location.href = '/features/admin/comptes/gestion-candidats';
    });
  }
}