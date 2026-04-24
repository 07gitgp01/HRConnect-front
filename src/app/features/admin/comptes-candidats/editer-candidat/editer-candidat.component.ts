// src/app/features/admin/components/editer-candidat/editer-candidat.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminCandidatService } from '../../../services/service_candidats/admin-candidat.service';
import { VolontaireService } from '../../../services/service_volont/volontaire.service';
import { UploadService } from '../../../services/upload.service';
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
  volontaireId: string = '';
  statutActuel: string = '';

  // URLs des documents
  urlCVActuel: string = '';
  urlPieceIdentiteActuel: string = '';

  typePieceActuel: 'CNIB' | 'PASSEPORT' = 'CNIB';
  numeroPieceActuel: string = '';

  niveauxEtudes = ['Sans diplôme', 'Bac', 'Bac+2', 'Licence', 'Master', 'Doctorat'];
  domainesEtudes = ['Informatique', 'Médecine', 'Droit', 'Commerce', 'Ingénierie', 'Éducation', 'Autre'];
  regions = [
    'Boucle du Mouhoun', 'Cascades', 'Centre', 'Centre-Est', 'Centre-Nord',
    'Centre-Ouest', 'Centre-Sud', 'Est', 'Hauts-Bassins', 'Nord',
    'Plateau-Central', 'Sahel', 'Sud-Ouest'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private adminCandidatService: AdminCandidatService,
    private volontaireService: VolontaireService,
    private uploadService: UploadService
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
      this.isChargement = false;
    }
  }

  chargerCandidat(): void {
    console.log(`📥 [EditerCandidat] Chargement du candidat avec ID: ${this.candidatId}`);
    
    this.isChargement = true;
    
    this.adminCandidatService.getCandidatById(this.candidatId!).subscribe({
      next: (candidat) => {
        console.log('✅ [EditerCandidat] Candidat chargé:', candidat);
        
        if (candidat && candidat.user && candidat.volontaire) {
          this.volontaireId = candidat.volontaire.id || '';
          this.statutActuel = candidat.volontaire.statut || 'Candidat';
          this.nomCandidat = `${candidat.user.prenom || ''} ${candidat.user.nom || ''}`.trim() || 
                            `${candidat.volontaire.prenom} ${candidat.volontaire.nom}`;

          this.typePieceActuel = (candidat.volontaire.typePiece as 'CNIB' | 'PASSEPORT') || 'CNIB';
          this.numeroPieceActuel = candidat.volontaire.numeroPiece || '';
          this.urlCVActuel = candidat.volontaire.urlCV || '';
          this.urlPieceIdentiteActuel = candidat.volontaire.urlPieceIdentite || '';

          this.profilForm.patchValue({
            adresseResidence: candidat.volontaire.adresseResidence || '',
            regionGeographique: candidat.volontaire.regionGeographique || '',
            niveauEtudes: candidat.volontaire.niveauEtudes || '',
            domaineEtudes: candidat.volontaire.domaineEtudes || '',
            competences: candidat.volontaire.competences || [],
            motivation: candidat.volontaire.motivation || '',
            disponibilite: candidat.volontaire.disponibilite || 'Temps plein'
          });
          
          console.log('📝 Formulaire pré-rempli:', this.profilForm.value);
        } else {
          this.messageErreur = 'Candidat non trouvé ou données incomplètes';
        }
        this.isChargement = false;
      },
      error: (error) => {
        console.error('❌ [EditerCandidat] Erreur:', error);
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
      disponibilite: ['Temps plein']
    });
  }

  // ✅ Ouvrir un document dans un nouvel onglet
  ouvrirDocument(url: string | undefined, type: 'cv' | 'identity'): void {
    if (!url) {
      this.messageErreur = `Aucun ${type === 'cv' ? 'CV' : 'document'} trouvé`;
      return;
    }
    
    const fullUrl = this.uploadService.getFullUrl(url);
    console.log(`📄 Ouverture ${type}:`, fullUrl);
    window.open(fullUrl, '_blank');
  }

  // ✅ Télécharger un document
  telechargerDocument(url: string | undefined, type: 'cv' | 'identity'): void {
    if (!url) {
      this.messageErreur = `Aucun ${type === 'cv' ? 'CV' : 'document'} trouvé`;
      return;
    }
    
    const fullUrl = this.uploadService.getFullUrl(url);
    console.log(`📥 Téléchargement ${type}:`, fullUrl);
    
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = `${type === 'cv' ? 'CV' : 'piece_identite'}_${this.nomCandidat || 'candidat'}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ✅ RENDRE PUBLIC pour utilisation dans le template
  public getProfilData(): ProfilVolontaire {
    return {
      adresseResidence: this.profilForm.get('adresseResidence')?.value || '',
      regionGeographique: this.profilForm.get('regionGeographique')?.value || '',
      niveauEtudes: this.profilForm.get('niveauEtudes')?.value || '',
      domaineEtudes: this.profilForm.get('domaineEtudes')?.value || '',
      competences: this.profilForm.get('competences')?.value || [],
      motivation: this.profilForm.get('motivation')?.value || '',
      disponibilite: this.profilForm.get('disponibilite')?.value || 'Temps plein',
      urlCV: this.urlCVActuel,
      urlPieceIdentite: this.urlPieceIdentiteActuel
    };
  }

  // ✅ Vérifier si le profil est complet
  estProfilComplet(profilData: ProfilVolontaire): boolean {
  console.log('🔍 Vérification complétion profil:');
  console.log('   - adresseResidence:', profilData.adresseResidence);
  console.log('   - regionGeographique:', profilData.regionGeographique);
  console.log('   - niveauEtudes:', profilData.niveauEtudes);
  console.log('   - domaineEtudes:', profilData.domaineEtudes);
  console.log('   - competences:', profilData.competences?.length);
  console.log('   - motivation:', profilData.motivation?.length);
  console.log('   - disponibilite:', profilData.disponibilite);
  console.log('   - urlCVActuel:', this.urlCVActuel);
  console.log('   - urlPieceIdentiteActuel:', this.urlPieceIdentiteActuel);
  
  const champsRequis = [
    profilData.adresseResidence?.trim(),
    profilData.regionGeographique?.trim(),
    profilData.niveauEtudes?.trim(),
    profilData.domaineEtudes?.trim(),
    profilData.competences?.length > 0,
    profilData.motivation?.trim(),
    profilData.disponibilite,
    this.urlCVActuel?.trim(),
    this.urlPieceIdentiteActuel?.trim()
  ];
  
  const estComplet = champsRequis.every(champ => champ && champ.toString().trim() !== '');
  console.log('   - Résultat:', estComplet);
  
  return estComplet;
}

  // ✅ Mettre à jour le profil
  mettreAJourProfil(): void {
    if (!confirm('Voulez-vous vraiment mettre à jour ce profil ?')) {
      return;
    }

    this.isLoading = true;
    
    const profilData = this.getProfilData();
    console.log('📤 Admin envoie:', profilData);
    
    this.adminCandidatService.mettreAJourProfilCandidat(this.candidatId!, profilData)
      .subscribe({
        next: (result) => {
          console.log('✅ Admin - réponse:', result);
          this.isLoading = false;
          this.messageSucces = '✅ Profil mis à jour !';
          this.chargerCandidat();
          setTimeout(() => this.messageSucces = '', 3000);
        },
        error: (error) => {
          console.error('❌ Admin - erreur:', error);
          this.isLoading = false;
          this.messageErreur = 'Erreur: ' + error.message;
        }
      });
  }

  // ✅ Valider le profil (Candidat → En attente)
  validerProfil(): void {
    if (!this.volontaireId) {
      this.messageErreur = 'ID volontaire non trouvé';
      return;
    }
    
    if (!this.estProfilComplet(this.getProfilData())) {
      this.messageErreur = 'Le profil n\'est pas encore complet. Tous les champs doivent être remplis.';
      return;
    }
    
    if (this.statutActuel !== 'Candidat') {
      this.messageErreur = `Seul un volontaire avec le statut 'Candidat' peut être validé. Statut actuel: ${this.statutActuel}`;
      return;
    }
    
    if (!confirm(`Voulez-vous valider le profil de ${this.nomCandidat} ?\nLe volontaire pourra alors postuler aux missions.`)) {
      return;
    }

    this.isLoading = true;
    this.messageErreur = '';
    this.messageSucces = '';

    this.volontaireService.validerProfil(this.volontaireId).subscribe({
      next: (result) => {
        this.isLoading = false;
        this.statutActuel = 'En attente';
        this.messageSucces = `✅ Profil de ${this.nomCandidat} validé ! Statut: "En attente". Le volontaire peut maintenant postuler.`;
        this.chargerCandidat();
        setTimeout(() => this.messageSucces = '', 5000);
      },
      error: (error) => {
        this.isLoading = false;
        this.messageErreur = '❌ Erreur lors de la validation: ' + error.message;
      }
    });
  }

  ajouterCompetence(event: any): void {
    const input = event.target as HTMLInputElement;
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

  annuler(): void {
    this.router.navigate(['/features/admin/comptes/gestion-candidats']);
  }

  // ✅ Helper pour afficher le badge du statut
  getStatutClass(): string {
    const classes: Record<string, string> = {
      'Candidat': 'badge bg-secondary',
      'En attente': 'badge bg-warning text-dark'
    };
    return classes[this.statutActuel] || 'badge bg-secondary';
  }
}