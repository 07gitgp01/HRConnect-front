import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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

  // ✅ projectId: '' (string vide) — compatible avec number | string du modèle
  // NE PAS mettre 0 ici : 0 est falsy et casse hasValidProjectId()
  candidature: Candidature = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    poste_vise: '',
    lettre_motivation: '',
    statut: 'en_attente',
    projectId: '',   // ✅ string vide — sera remplacé par l'ID réel ("7f1a" ou 42)
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

  constructor(
    private candidatureService: CandidatureService,
    private projectService: ProjectService,
    private authService: AuthService,
    private volontaireService: VolontaireService,
    private route: ActivatedRoute,
    public router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.loadProjet();
    this.preRemplirFormulaire();
    this.verifierProfilComplet();

    setTimeout(() => {
      console.log('📋 État formulaire:', {
        projectId:    this.candidature.projectId,
        volontaireId: this.candidature.volontaireId,
        profilComplet: this.profilComplet,
        isFormValid:  this.isFormValid()
      });
    }, 1500);
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

        // ✅ FIX PRINCIPAL : on garde l'ID tel quel — string hex "7f1a" ou number.
        // Pas de parseInt() : le modèle accepte number | string, pas besoin de convertir.
        // Fallback sur projetId (depuis l'URL) si projet.id est undefined.
        this.candidature.projectId = projet.id ?? projetId;

        this.candidature.poste_vise = projet.titre || '';
        this.loadingProjet = false;

        console.log('✅ Projet chargé — projectId:', this.candidature.projectId,
                    '(type:', typeof this.candidature.projectId, ')');
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
      this.candidature.prenom       = this.user.prenom      || '';
      this.candidature.nom          = this.user.nom         || '';
      this.candidature.email        = this.user.email       || '';
      this.candidature.telephone    = this.user.telephone   || '';
      this.candidature.volontaireId = this.user.id || this.user.userId || '';
      this.candidature.typePiece    = this.user.typePiece   || 'CNIB';
      this.candidature.numeroPiece  = this.user.numeroPiece || '';

      console.log('✅ Pré-remplissage depuis User:', {
        volontaireId: this.candidature.volontaireId,
        typePiece:    this.candidature.typePiece,
        numeroPiece:  this.candidature.numeroPiece
      });
    }
  }

  private verifierProfilComplet(): void {
    const volontaireId = this.authService.getVolontaireId();
    if (volontaireId) {
      this.volontaireService.getVolontaire(volontaireId).subscribe({
        next: (volontaire) => {
          this.volontaire = volontaire;
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
        error: (err) => console.error('Erreur vérification profil:', err)
      });
    }
  }

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

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.snackBar.open('Veuillez sélectionner un fichier PDF uniquement', 'Fermer', { duration: 3000 });
      this.selectedFile = null;
      this.filePreview = null;
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('Le fichier est trop volumineux (max 5MB)', 'Fermer', { duration: 3000 });
      return;
    }
    this.selectedFile = file;
    this.filePreview = file.name;
  }

  onSubmit(): void {
    if (!this.profilComplet) {
      this.snackBar.open(
        'Votre profil doit être complet à 100% pour pouvoir postuler.',
        'Compléter mon profil',
        { duration: 10000 }
      ).onAction().subscribe(() => this.router.navigate(['/features/candidats/profil']));
      return;
    }

    if (!this.projet) {
      this.snackBar.open('Projet non trouvé', 'Fermer', { duration: 3000 });
      return;
    }

    if (!this.candidature.prenom || !this.candidature.nom ||
        !this.candidature.email  || !this.candidature.poste_vise) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    if (!this.candidature.volontaireId ||
        this.candidature.volontaireId.toString().trim() === '') {
      this.snackBar.open('Erreur: Identifiant volontaire manquant', 'Fermer', { duration: 3000 });
      return;
    }

    if (!this.hasValidProjectId()) {
      this.snackBar.open('Erreur: Projet non valide', 'Fermer', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.formatCompetences();

    const candidatureASoumettre: Candidature = {
      ...this.candidature,
      statut: 'en_attente' as const
    };

    console.log('📤 Soumission candidature:', {
      projectId:    candidatureASoumettre.projectId,
      volontaireId: candidatureASoumettre.volontaireId
    });

    if (this.selectedFile) {
      this.uploadCVEtSoumettre(candidatureASoumettre);
    } else {
      this.soumettreCandidature(candidatureASoumettre);
    }
  }

  /**
   * ✅ FIX : valide projectId qu'il soit string hex ("7f1a") ou number (42).
   * - Exclut string vide '', '0', 'NaN', null, undefined
   * - Exclut number 0 et NaN
   */
  private hasValidProjectId(): boolean {
    const id = this.candidature.projectId;
    if (id === null || id === undefined) return false;
    if (typeof id === 'number') return !isNaN(id) && id > 0;
    // string
    const s = id.toString().trim();
    return s !== '' && s !== '0' && s !== 'NaN';
  }

  private uploadCVEtSoumettre(candidature: Candidature): void {
    this.candidatureService.create(candidature).subscribe({
      next: (candidatureCreee) => {
        if (this.selectedFile && candidatureCreee.id) {
          this.candidatureService.uploadCV(candidatureCreee.id, this.selectedFile).subscribe({
            next: (response) => {
              const avecCV = { ...candidatureCreee, cv_url: response.cv_url };
              this.candidatureService.update(candidatureCreee.id!, avecCV).subscribe({
                next: () => {
                  this.snackBar.open('Votre candidature a été envoyée avec succès !', 'Fermer', { duration: 5000 });
                  this.router.navigate(['/features/candidats/mes-candidatures']);
                  this.loading = false;
                },
                error: () => {
                  this.snackBar.open('Candidature envoyée mais erreur avec le CV', 'Fermer', { duration: 3000 });
                  this.router.navigate(['/features/candidats/mes-candidatures']);
                  this.loading = false;
                }
              });
            },
            error: () => {
              this.snackBar.open('Candidature envoyée mais erreur avec le CV', 'Fermer', { duration: 3000 });
              this.router.navigate(['/features/candidats/mes-candidatures']);
              this.loading = false;
            }
          });
        } else {
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
        .map(c => c.trim())
        .filter(c => c.length > 0);
    }
  }

  annuler(): void {
    this.router.navigate(['/features/candidats/projets']);
  }

  isFormValid(): boolean {
    if (!this.profilComplet) return false;
    return !!(
      this.candidature.prenom &&
      this.candidature.nom &&
      this.candidature.email &&
      this.candidature.poste_vise &&
      this.candidature.lettre_motivation &&
      this.hasValidProjectId()
    );
  }

  supprimerFichier(): void {
    this.selectedFile = null;
    this.filePreview = null;
    const fileInput = document.getElementById('cvFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  getStatusLabel(status: string): string {
    const map: { [key: string]: string } = {
      'en_attente': 'En attente',
      'actif':      'Actif',
      'cloture':    'Clôturé'
    };
    return map[status] || status;
  }

  getTypePieceLabel(): string {
    return this.candidature.typePiece === 'CNIB' ? 'CNIB' : 'Passeport';
  }
}