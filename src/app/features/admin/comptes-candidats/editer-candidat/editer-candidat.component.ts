// src/app/features/admin/components/editer-candidat/editer-candidat.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminCandidatService } from '../../../services/service_candidats/admin-candidat.service';
import { ProfilVolontaire } from '../../../models/volontaire.model';

@Component({
  selector: 'app-editer-candidat',
  templateUrl: './editer-candidat.component.html',
  styleUrls: ['./editer-candidat.component.scss']
})
export class EditerCandidatComponent implements OnInit {
  profilForm: FormGroup;
  candidatId: string | null = null;
  isLoading = false;
  isChargement = true;
  messageSucces = '';
  messageErreur = '';
  nomCandidat = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private adminCandidatService: AdminCandidatService
  ) {
    this.profilForm = this.creerProfilForm();
  }

  ngOnInit(): void {
    this.candidatId = this.route.snapshot.paramMap.get('id');
    if (this.candidatId) {
      this.chargerCandidat();
    } else {
      this.messageErreur = 'ID candidat non spécifié';
      this.isChargement = false;
    }
  }

  chargerCandidat(): void {
    this.adminCandidatService.getCandidatById(this.candidatId!).subscribe({
      next: (candidat) => {
        if (candidat) {
          this.nomCandidat = `${candidat.user.prenom} ${candidat.user.nom}`;
          this.profilForm.patchValue({
            adresseResidence: candidat.volontaire.adresseResidence || '',
            regionGeographique: candidat.volontaire.regionGeographique || '',
            niveauEtudes: candidat.volontaire.niveauEtudes || '',
            domaineEtudes: candidat.volontaire.domaineEtudes || '',
            competences: candidat.volontaire.competences || [],
            motivation: candidat.volontaire.motivation || '',
            disponibilite: candidat.volontaire.disponibilite || 'Temps plein',
            urlCV: candidat.volontaire.urlCV || '',
            typePiece: candidat.volontaire.typePiece || 'CNIB',
            numeroPiece: candidat.volontaire.numeroPiece || '',
            urlPieceIdentite: candidat.volontaire.urlPieceIdentite || ''
          });
        } else {
          this.messageErreur = 'Candidat non trouvé';
        }
        this.isChargement = false;
      },
      error: (error) => {
        this.messageErreur = 'Erreur lors du chargement du candidat: ' + error.message;
        this.isChargement = false;
      }
    });
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

  mettreAJourProfil(): void {
    this.isLoading = true;
    this.messageErreur = '';
    this.messageSucces = '';

    // Créer un objet ProfilVolontaire avec les valeurs du formulaire
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

    this.adminCandidatService.mettreAJourProfilCandidat(this.candidatId!, profilData)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.messageSucces = 'Profil mis à jour avec succès !';
        },
        error: (error) => {
          this.isLoading = false;
          this.messageErreur = 'Erreur lors de la mise à jour: ' + error.message;
        }
      });
  }

  completerProfil(): void {
    this.isLoading = true;
    this.messageErreur = '';
    this.messageSucces = '';

    // Créer un objet ProfilVolontaire avec les valeurs du formulaire
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

    this.adminCandidatService.completerProfilCandidat(this.candidatId!, profilData)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.messageSucces = 'Profil complété avec succès ! Statut changé à "En attente"';
        },
        error: (error) => {
          this.isLoading = false;
          this.messageErreur = 'Erreur lors de la complétion du profil: ' + error.message;
        }
      });
  }

  annuler(): void {
  console.log('🔄 Retour depuis édition candidat...');
  
  // 🔥 CHEMIN ABSOLU CORRECT
  this.router.navigate(['/features/admin/comptes/gestion-candidats']).then(success => {
    if (success) {
      console.log('✅ Retour réussi vers gestion candidats');
    } else {
      console.error('❌ Échec retour, fallback...');
      // Fallback garanti
      window.location.href = '/features/admin/comptes/gestion-candidats';
    }
  }).catch(error => {
    console.error('💥 Erreur retour:', error);
    window.location.href = '/features/admin/comptes/gestion-candidats';
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
}