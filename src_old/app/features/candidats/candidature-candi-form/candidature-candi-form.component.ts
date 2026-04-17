import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';

import { Candidature } from '../../models/candidature.model';
import { Project } from '../../models/projects.model';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { ProjectService } from '../../services/service_projects/projects.service';
import { AuthService } from '../../services/service_auth/auth.service';
import { VolontaireService } from '../../services/service_volont/volontaire.service';

@Component({
  selector: 'app-candidature-form-candidat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './candidature-candi-form.component.html',
  styleUrls: ['./candidature-candi-form.component.css']
})
export class CandidatureFormCandidatComponent implements OnInit {
  candidature: Candidature = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    poste_vise: '',
    lettre_motivation: '',
    statut: 'en_attente',
    projectId: 0,
    volontaireId: '',
    typePiece: 'CNIB',
    numeroPiece: ''
  };

  projet: Project | null = null;
  selectedFile: File | null = null;
  filePreview: string | null = null;
  loading = false;
  loadingProjet = false;
  user: any;
  volontaire: any;
  profilComplet = false;

  // Variables pour le type de pièce
  typePieceSelectionne: 'CNIB' | 'PASSEPORT' = 'CNIB';

  constructor(
    private candidatureService: CandidatureService,
    private projectService: ProjectService,
    private authService: AuthService,
    private volontaireService: VolontaireService,
    private route: ActivatedRoute,
    public router: Router, // ✅ Changé en public pour le template
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }

    this.loadProjet();
    this.preRemplirFormulaire();
    this.verifierProfilComplet();
  }

  loadProjet(): void {
    const projetId = this.route.snapshot.paramMap.get('projetId');
    if (!projetId) {
      this.snackBar.open('Projet non spécifié', 'Fermer', { duration: 3000 });
      this.router.navigate(['/features/candidats/projets']);
      return;
    }

    this.loadingProjet = true;
    this.projectService.getProject(projetId).subscribe({
      next: (projet) => {
        this.projet = projet;
        // Conversion sécurisée de l'ID du projet
        if (projet.id) {
          this.candidature.projectId = typeof projet.id === 'string' ? parseInt(projet.id, 10) : projet.id;
        }
        this.candidature.poste_vise = projet.titre || '';
        this.loadingProjet = false;
      },
      error: (err) => {
        console.error('Erreur chargement projet', err);
        this.snackBar.open('Erreur lors du chargement du projet', 'Fermer', { duration: 3000 });
        this.router.navigate(['/features/candidats/projets']);
        this.loadingProjet = false;
      }
    });
  }

  preRemplirFormulaire(): void {
    if (this.user) {
      this.candidature.prenom = this.user.prenom || '';
      this.candidature.nom = this.user.nom || '';
      this.candidature.email = this.user.email || '';
      this.candidature.telephone = this.user.telephone || '';
      this.candidature.volontaireId = this.user.id || this.user.userId || '';

      // Charger les informations du volontaire pour pré-remplir le type de pièce
      this.loadVolontaireData();
    }
  }

  private loadVolontaireData(): void {
    const volontaireId = this.authService.getVolontaireId();
    if (volontaireId) {
      this.volontaireService.getVolontaire(volontaireId).subscribe({
        next: (volontaire) => {
          this.volontaire = volontaire;
          // Pré-remplir le type de pièce et numéro si disponibles
          if (volontaire.typePiece) {
            this.candidature.typePiece = volontaire.typePiece;
            this.typePieceSelectionne = volontaire.typePiece;
          }
          if (volontaire.numeroPiece) {
            this.candidature.numeroPiece = volontaire.numeroPiece;
          }
        },
        error: (error) => {
          console.error('Erreur chargement volontaire:', error);
        }
      });
    }
  }

  // NOUVELLE MÉTHODE : Vérifier si le profil est complet
  private verifierProfilComplet(): void {
    const volontaireId = this.authService.getVolontaireId();
    if (volontaireId) {
      this.volontaireService.getVolontaire(volontaireId).subscribe({
        next: (volontaire) => {
          this.profilComplet = this.isProfilComplet(volontaire);
          if (!this.profilComplet) {
            this.snackBar.open(
              'Votre profil doit être complet à 100% pour pouvoir postuler. Veuillez compléter votre profil d\'abord.', 
              'Compléter mon profil', 
              { duration: 10000 }
            ).onAction().subscribe(() => {
              this.router.navigate(['/features/candidats/profil']);
            });
          }
        },
        error: (error) => {
          console.error('Erreur vérification profil:', error);
        }
      });
    }
  }

  // NOUVELLE MÉTHODE : Vérifier si le profil est complet
  private isProfilComplet(volontaire: any): boolean {
    if (!volontaire) return false;
    
    const champsObligatoires = [
      volontaire.adresseResidence,
      volontaire.regionGeographique,
      volontaire.niveauEtudes,
      volontaire.domaineEtudes,
      volontaire.motivation,
      volontaire.disponibilite,
      volontaire.urlCV,
      volontaire.urlPieceIdentite,
      volontaire.typePiece,
      volontaire.numeroPiece,
      volontaire.competences && volontaire.competences.length > 0
    ];

    return champsObligatoires.every(champ => 
      champ && (typeof champ !== 'boolean' ? champ.toString().trim().length > 0 : champ)
    );
  }

  // Méthodes pour le template
  getLabelNumeroPiece(): string {
    return this.candidature.typePiece === 'CNIB' ? 'NIP CNIB *' : 'Numéro de Passeport *';
  }

  getPlaceholderNumeroPiece(): string {
    return this.candidature.typePiece === 'CNIB' ? 'Ex: 123456789012' : 'Ex: AB123456';
  }

  getNumeroPiecePattern(): string {
    return this.candidature.typePiece === 'CNIB' ? '^[0-9]{12}$' : '^[A-Z0-9]{6,9}$';
  }

  getNumeroPieceErrorMessage(): string {
    const numeroPiece = this.candidature.numeroPiece;
    
    if (!numeroPiece || numeroPiece.trim() === '') {
      return this.candidature.typePiece === 'CNIB' ? 'Le NIP CNIB est requis' : 'Le numéro de passeport est requis';
    }
    
    if (this.candidature.typePiece === 'CNIB') {
      if (!/^[0-9]{12}$/.test(numeroPiece)) {
        return 'Le NIP CNIB doit contenir exactement 12 chiffres';
      }
    } else {
      if (!/^[A-Z0-9]{6,9}$/.test(numeroPiece)) {
        return 'Le numéro de passeport doit contenir 6 à 9 caractères (lettres majuscules et chiffres)';
      }
    }
    
    return '';
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        if (file.size > 5 * 1024 * 1024) {
          this.snackBar.open('Le fichier est trop volumineux (max 5MB)', 'Fermer', { duration: 3000 });
          return;
        }
        this.selectedFile = file;
        this.filePreview = file.name;
      } else {
        this.snackBar.open('Veuillez sélectionner un fichier PDF uniquement', 'Fermer', { duration: 3000 });
        this.selectedFile = null;
        this.filePreview = null;
      }
    }
  }

  onSubmit(): void {
    // Vérification du profil complet
    if (!this.profilComplet) {
      this.snackBar.open(
        'Votre profil doit être complet à 100% pour pouvoir postuler. Veuillez compléter votre profil d\'abord.', 
        'Compléter mon profil', 
        { duration: 10000 }
      ).onAction().subscribe(() => {
        this.router.navigate(['/features/candidats/profil']);
      });
      return;
    }

    if (!this.projet) {
      this.snackBar.open('Projet non trouvé', 'Fermer', { duration: 3000 });
      return;
    }

    // Validation des champs obligatoires
    if (!this.candidature.prenom || !this.candidature.nom || !this.candidature.email || !this.candidature.poste_vise) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    // Validation du type de pièce et numéro
    if (!this.candidature.typePiece || !this.candidature.numeroPiece || this.candidature.numeroPiece.trim() === '') {
      this.snackBar.open('Veuillez renseigner votre pièce d\'identité', 'Fermer', { duration: 3000 });
      return;
    }

    // Validation spécifique selon le type de pièce
    if (this.candidature.typePiece === 'CNIB' && !/^[0-9]{12}$/.test(this.candidature.numeroPiece)) {
      this.snackBar.open('Le NIP CNIB doit contenir exactement 12 chiffres', 'Fermer', { duration: 3000 });
      return;
    }

    if (this.candidature.typePiece === 'PASSEPORT' && !/^[A-Z0-9]{6,9}$/.test(this.candidature.numeroPiece)) {
      this.snackBar.open('Le numéro de passeport doit contenir 6 à 9 caractères alphanumériques', 'Fermer', { duration: 3000 });
      return;
    }

    // Validation de l'ID du volontaire
    if (!this.candidature.volontaireId || this.candidature.volontaireId.toString().trim() === '') {
      this.snackBar.open('Erreur: Identifiant volontaire manquant', 'Fermer', { duration: 3000 });
      return;
    }

    // Validation de l'ID du projet
    if (!this.candidature.projectId || this.candidature.projectId === 0) {
      this.snackBar.open('Erreur: Projet non valide', 'Fermer', { duration: 3000 });
      return;
    }

    this.loading = true;

    // Formater les compétences si nécessaire
    this.formatCompetences();

    // Préparer la candidature pour l'envoi
    const candidatureASoumettre: Candidature = {
      ...this.candidature,
      projectId: this.candidature.projectId,
      volontaireId: this.candidature.volontaireId,
      statut: 'en_attente' as const
    };

    // Gérer l'upload du fichier si présent
    if (this.selectedFile) {
      this.uploadCVEtSoumettre(candidatureASoumettre);
    } else {
      this.soumettreCandidature(candidatureASoumettre);
    }
  }

  /**
   * Upload le CV puis soumet la candidature
   */
  private uploadCVEtSoumettre(candidature: Candidature): void {
    // Créer d'abord la candidature sans le CV
    this.candidatureService.create(candidature).subscribe({
      next: (candidatureCreee) => {
        // Puis uploader le CV
        if (this.selectedFile && candidatureCreee.id) {
          this.candidatureService.uploadCV(candidatureCreee.id, this.selectedFile).subscribe({
            next: (response) => {
              // Mettre à jour la candidature avec l'URL du CV
              const candidatureAvecCV = {
                ...candidatureCreee,
                cv_url: response.cv_url
              };
              
              this.candidatureService.update(candidatureCreee.id!, candidatureAvecCV).subscribe({
                next: () => {
                  this.snackBar.open('Votre candidature a été envoyée avec succès !', 'Fermer', { duration: 5000 });
                  this.router.navigate(['/features/candidats/mes-candidatures']);
                  this.loading = false;
                },
                error: (err) => {
                  console.error('Erreur mise à jour candidature avec CV', err);
                  this.snackBar.open('Candidature envoyée mais erreur avec le CV', 'Fermer', { duration: 3000 });
                  this.router.navigate(['/features/candidats/mes-candidatures']);
                  this.loading = false;
                }
              });
            },
            error: (err) => {
              console.error('Erreur upload CV', err);
              this.snackBar.open('Candidature envoyée mais erreur avec le CV', 'Fermer', { duration: 3000 });
              this.router.navigate(['/features/candidats/mes-candidatures']);
              this.loading = false;
            }
          });
        } else {
          // Pas de fichier, candidature créée avec succès
          this.snackBar.open('Votre candidature a été envoyée avec succès !', 'Fermer', { duration: 5000 });
          this.router.navigate(['/features/candidats/mes-candidatures']);
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Erreur enregistrement candidature', err);
        this.snackBar.open('Erreur lors de l\'envoi de votre candidature', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  /**
   * Soumet la candidature sans upload de CV
   */
  private soumettreCandidature(candidature: Candidature): void {
    this.candidatureService.create(candidature).subscribe({
      next: () => {
        this.snackBar.open('Votre candidature a été envoyée avec succès !', 'Fermer', { duration: 5000 });
        this.router.navigate(['/features/candidats/mes-candidatures']);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur enregistrement candidature', err);
        this.snackBar.open('Erreur lors de l\'envoi de votre candidature', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  formatCompetences(): void {
    if (this.candidature.competences && typeof this.candidature.competences === 'string') {
      this.candidature.competences = (this.candidature.competences as string)
        .split(',')
        .map(comp => comp.trim())
        .filter(comp => comp.length > 0);
    }
  }

  annuler(): void {
    this.router.navigate(['/features/candidats/projets']);
  }

  /**
   * Vérifie si le formulaire est valide
   */
  isFormValid(): boolean {
    // Vérifier d'abord si le profil est complet
    if (!this.profilComplet) {
      return false;
    }

    const numeroPieceValide = this.candidature.typePiece === 'CNIB' 
      ? /^[0-9]{12}$/.test(this.candidature.numeroPiece)
      : /^[A-Z0-9]{6,9}$/.test(this.candidature.numeroPiece);

    return !!(
      this.candidature.prenom &&
      this.candidature.nom &&
      this.candidature.email &&
      this.candidature.poste_vise &&
      this.candidature.projectId &&
      this.candidature.projectId > 0 &&
      this.candidature.typePiece &&
      this.candidature.numeroPiece &&
      numeroPieceValide
    );
  }

  /**
   * Supprime le fichier sélectionné
   */
  supprimerFichier(): void {
    this.selectedFile = null;
    this.filePreview = null;
    // Réinitialiser l'input file
    const fileInput = document.getElementById('cvFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Gère le changement du type de pièce
   */
  onTypePieceChange(): void {
    this.typePieceSelectionne = this.candidature.typePiece;
    // Réinitialiser le numéro de pièce quand le type change
    this.candidature.numeroPiece = '';
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'soumis': 'Soumis',
      'en_attente_validation': 'En attente',
      'ouvert_aux_candidatures': 'Ouvert',
      'en_cours': 'En cours',
      'a_cloturer': 'À clôturer',
      'cloture': 'Clôturé'
    };
    return statusMap[status] || status;
  }
}