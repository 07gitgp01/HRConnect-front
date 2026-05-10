import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminCandidatService } from '../../../services/service_candidats/admin-candidat.service';
import { VolontaireService } from '../../../services/service_volont/volontaire.service';
import { UploadService } from '../../../services/upload.service';

@Component({
  selector: 'app-editer-candidat',
  templateUrl: './editer-candidat.component.html',
  styleUrls: ['./editer-candidat.component.scss']
})
export class EditerCandidatComponent implements OnInit {
  candidatId: string | null = null;
  isLoading = false;
  isChargement = true;
  messageSucces = '';
  messageErreur = '';
  nomCandidat = '';
  volontaireId = '';
  statutActuel = '';

  // URLs des documents
  urlCVActuel = '';
  urlPieceIdentiteActuel = '';

  typePieceActuel: 'CNIB' | 'PASSEPORT' = 'CNIB';
  numeroPieceActuel = '';

  // Données du profil (affichage seul)
  adresseResidence = '';
  regionGeographique = '';
  niveauEtudes = '';
  domaineEtudes = '';
  competences: string[] = [];
  motivation = '';
  disponibilite = '';

  // Listes pour affichage (non utilisées pour édition)
  niveauxEtudes = ['Sans diplôme', 'Bac', 'Bac+2', 'Licence', 'Master', 'Doctorat'];
  domainesEtudes = ['Informatique', 'Médecine', 'Droit', 'Commerce', 'Ingénierie', 'Éducation', 'Autre'];
  regions = [
    'Boucle du Mouhoun', 'Cascades', 'Centre', 'Centre-Est', 'Centre-Nord',
    'Centre-Ouest', 'Centre-Sud', 'Est', 'Hauts-Bassins', 'Nord',
    'Plateau-Central', 'Sahel', 'Sud-Ouest'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminCandidatService: AdminCandidatService,
    private volontaireService: VolontaireService,
    private uploadService: UploadService
  ) {}

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
    this.isChargement = true;
    this.adminCandidatService.getCandidatById(this.candidatId!).subscribe({
      next: (candidat) => {
        if (candidat && candidat.user && candidat.volontaire) {
          this.volontaireId = candidat.volontaire.id || '';
          this.statutActuel = candidat.volontaire.statut || 'Candidat';
          this.nomCandidat = `${candidat.user.prenom || ''} ${candidat.user.nom || ''}`.trim() ||
                            `${candidat.volontaire.prenom} ${candidat.volontaire.nom}`;

          this.typePieceActuel = (candidat.volontaire.typePiece as 'CNIB' | 'PASSEPORT') || 'CNIB';
          this.numeroPieceActuel = candidat.volontaire.numeroPiece || '';
          this.urlCVActuel = candidat.volontaire.urlCV || '';
          this.urlPieceIdentiteActuel = candidat.volontaire.urlPieceIdentite || '';

          // Remplir les propriétés d'affichage
          this.adresseResidence = candidat.volontaire.adresseResidence || '';
          this.regionGeographique = candidat.volontaire.regionGeographique || '';
          this.niveauEtudes = candidat.volontaire.niveauEtudes || '';
          this.domaineEtudes = candidat.volontaire.domaineEtudes || '';
          this.competences = candidat.volontaire.competences || [];
          this.motivation = candidat.volontaire.motivation || '';
          this.disponibilite = candidat.volontaire.disponibilite || 'Temps plein';
        } else {
          this.messageErreur = 'Candidat non trouvé ou données incomplètes';
        }
        this.isChargement = false;
      },
      error: (error) => {
        this.messageErreur = 'Erreur lors du chargement du candidat: ' + error.message;
        this.isChargement = false;
      }
    });
  }

  // Vérifier si le profil est complet (basé sur les données affichées)
  estProfilComplet(): boolean {
    const champsRequis = [
      this.adresseResidence?.trim(),
      this.regionGeographique?.trim(),
      this.niveauEtudes?.trim(),
      this.domaineEtudes?.trim(),
      this.competences?.length > 0,
      this.motivation?.trim(),
      this.disponibilite,
      this.urlCVActuel?.trim(),
      this.urlPieceIdentiteActuel?.trim()
    ];
    return champsRequis.every(champ => champ && champ.toString().trim() !== '');
  }

  // Valider le profil (Candidat → En attente)
  validerProfil(): void {
    if (!this.volontaireId) {
      this.messageErreur = 'ID volontaire non trouvé';
      return;
    }
    if (!this.estProfilComplet()) {
      this.messageErreur = 'Le profil n\'est pas complet. Tous les champs sont obligatoires.';
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
      next: () => {
        this.isLoading = false;
        this.statutActuel = 'En attente';
        this.messageSucces = `✅ Profil de ${this.nomCandidat} validé ! Statut: "En attente". Le volontaire peut maintenant postuler.`;
        this.chargerCandidat(); // recharger pour rafraîchir le statut
        setTimeout(() => this.messageSucces = '', 5000);
      },
      error: (error) => {
        this.isLoading = false;
        this.messageErreur = '❌ Erreur lors de la validation: ' + error.message;
      }
    });
  }

  // Ouvrir document
  ouvrirDocument(url: string | undefined, type: 'cv' | 'identity'): void {
    if (!url) {
      this.messageErreur = `Aucun ${type === 'cv' ? 'CV' : 'document'} trouvé`;
      return;
    }
    const fullUrl = this.uploadService.getFullUrl(url);
    window.open(fullUrl, '_blank');
  }

  // Télécharger document
  telechargerDocument(url: string | undefined, type: 'cv' | 'identity'): void {
    if (!url) {
      this.messageErreur = `Aucun ${type === 'cv' ? 'CV' : 'document'} trouvé`;
      return;
    }
    const fullUrl = this.uploadService.getFullUrl(url);
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = `${type === 'cv' ? 'CV' : 'piece_identite'}_${this.nomCandidat || 'candidat'}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Retour à la liste
  annuler(): void {
    this.router.navigate(['/features/admin/comptes/gestion-candidats']);
  }

  // Classe CSS pour le badge du statut
  getStatutClass(): string {
    const classes: Record<string, string> = {
      'Candidat': 'badge bg-secondary',
      'En attente': 'badge bg-warning text-dark'
    };
    return classes[this.statutActuel] || 'badge bg-secondary';
  }
}