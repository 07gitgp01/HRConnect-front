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
  candidatId:   string | null = null;
  isLoading     = false;
  isChargement  = true;
  messageSucces = '';
  messageErreur = '';
  nomCandidat   = '';

  typePieceActuel:   'CNIB' | 'PASSEPORT' = 'CNIB';
  numeroPieceActuel: string = '';

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
    console.log('🔍 [EditerCandidat] ID reçu:', this.candidatId);
    
    if (this.candidatId) {
      this.chargerCandidat();
    } else {
      this.messageErreur = 'ID candidat non spécifié';
      this.isChargement  = false;
    }
  }

  chargerCandidat(): void {
    console.log(`📥 [EditerCandidat] Chargement du candidat avec ID: ${this.candidatId}`);
    
    this.adminCandidatService.getCandidatById(this.candidatId!).subscribe({
      next: (candidat) => {
        console.log('✅ [EditerCandidat] Candidat chargé:', candidat);
        
        if (candidat && candidat.user && candidat.volontaire) {
          this.nomCandidat = `${candidat.user.prenom || ''} ${candidat.user.nom || ''}`.trim() || 
                            `${candidat.volontaire.prenom} ${candidat.volontaire.nom}`;

          this.typePieceActuel   = candidat.volontaire.typePiece;
          this.numeroPieceActuel = candidat.volontaire.numeroPiece;

          console.log('📝 [EditerCandidat] Pré-remplissage du formulaire avec:', {
            adresseResidence: candidat.volontaire.adresseResidence,
            regionGeographique: candidat.volontaire.regionGeographique,
            niveauEtudes: candidat.volontaire.niveauEtudes,
            domaineEtudes: candidat.volontaire.domaineEtudes,
            competences: candidat.volontaire.competences,
            motivation: candidat.volontaire.motivation,
            disponibilite: candidat.volontaire.disponibilite,
            urlCV: candidat.volontaire.urlCV,
            urlPieceIdentite: candidat.volontaire.urlPieceIdentite
          });

          this.profilForm.patchValue({
            adresseResidence:   candidat.volontaire.adresseResidence   || '',
            regionGeographique: candidat.volontaire.regionGeographique || '',
            niveauEtudes:       candidat.volontaire.niveauEtudes       || '',
            domaineEtudes:      candidat.volontaire.domaineEtudes      || '',
            competences:        candidat.volontaire.competences        || [],
            motivation:         candidat.volontaire.motivation         || '',
            disponibilite:      candidat.volontaire.disponibilite      || 'Temps plein',
            urlCV:              candidat.volontaire.urlCV              || '',
            urlPieceIdentite:   candidat.volontaire.urlPieceIdentite   || ''
          });
          
          console.log('📝 [EditerCandidat] Formulaire après patch:', this.profilForm.value);
        } else {
          this.messageErreur = 'Candidat non trouvé ou données incomplètes';
        }
        this.isChargement = false;
      },
      error: (error) => {
        console.error('❌ [EditerCandidat] Erreur:', error);
        this.messageErreur = 'Erreur lors du chargement du candidat: ' + error.message;
        this.isChargement  = false;
      }
    });
  }

  creerProfilForm(): FormGroup {
    return this.fb.group({
      adresseResidence:   [''],
      regionGeographique: [''],
      niveauEtudes:       [''],
      domaineEtudes:      [''],
      competences:        [[]],
      motivation:         [''],
      disponibilite:      ['Temps plein'],
      urlCV:              [''],
      urlPieceIdentite:   ['']
    });
  }

  private getProfilData(): ProfilVolontaire {
    return {
      adresseResidence:   this.profilForm.get('adresseResidence')?.value   || '',
      regionGeographique: this.profilForm.get('regionGeographique')?.value || '',
      niveauEtudes:       this.profilForm.get('niveauEtudes')?.value       || '',
      domaineEtudes:      this.profilForm.get('domaineEtudes')?.value      || '',
      competences:        this.profilForm.get('competences')?.value        || [],
      motivation:         this.profilForm.get('motivation')?.value         || '',
      disponibilite:      this.profilForm.get('disponibilite')?.value      || 'Temps plein',
      urlCV:              this.profilForm.get('urlCV')?.value              || '',
      urlPieceIdentite:   this.profilForm.get('urlPieceIdentite')?.value   || ''
    };
  }

  mettreAJourProfil(): void {
    this.isLoading     = true;
    this.messageErreur = '';
    this.messageSucces = '';

    this.adminCandidatService.mettreAJourProfilCandidat(this.candidatId!, this.getProfilData())
      .subscribe({
        next: () => {
          this.isLoading     = false;
          this.messageSucces = 'Profil mis à jour avec succès !';
        },
        error: (error) => {
          this.isLoading     = false;
          this.messageErreur = 'Erreur lors de la mise à jour: ' + error.message;
        }
      });
  }

  completerProfil(): void {
    this.isLoading     = true;
    this.messageErreur = '';
    this.messageSucces = '';

    this.adminCandidatService.getCandidatById(this.candidatId!).subscribe({
      next: (candidat) => {
        if (candidat.volontaire.id) {
          this.adminCandidatService.completerProfilCandidat(candidat.volontaire.id, this.getProfilData())
            .subscribe({
              next: () => {
                this.isLoading     = false;
                this.messageSucces = 'Profil complété avec succès ! Statut changé à "En attente"';
              },
              error: (error) => {
                this.isLoading     = false;
                this.messageErreur = 'Erreur lors de la complétion du profil: ' + error.message;
              }
            });
        } else {
          this.isLoading = false;
          this.messageErreur = 'ID volontaire non trouvé';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.messageErreur = 'Erreur: ' + error.message;
      }
    });
  }

  annuler(): void {
    this.router.navigate(['/features/admin/comptes/gestion-candidats']);
  }

  ajouterCompetence(event: any): void {
    const input  = event.target as HTMLInputElement;
    const valeur = input.value.trim();
    if (valeur) {
      const actuelles = this.profilForm.get('competences')?.value || [];
      if (!actuelles.includes(valeur)) {
        this.profilForm.patchValue({ competences: [...actuelles, valeur] });
      }
      input.value = '';
    }
  }

  supprimerCompetence(competence: string): void {
    const actuelles = this.profilForm.get('competences')?.value || [];
    this.profilForm.patchValue({
      competences: actuelles.filter((c: string) => c !== competence)
    });
  }
}