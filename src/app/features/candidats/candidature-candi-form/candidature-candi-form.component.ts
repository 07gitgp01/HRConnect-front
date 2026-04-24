// src/app/features/candidats/candidature-candi-form/candidature-candi-form.component.ts

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

  candidature: Candidature = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    poste_vise: '',
    lettreMotivation: '',
    statut: 'en_attente',
    projectId: '',
    volontaireId: '',
    typePiece: 'CNIB',
    numeroPiece: '',
    niveau_experience: undefined,
    disponibilite: '',
    competences: []
  };

  projet: Project | null = null;
  selectedFile: File | null = null;
  filePreview: string | null = null;
  loading = false;
  loadingProjet = false;
  user: any;
  volontaire: any;
  profilComplet = false;
  formSubmitted = false;

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
        this.candidature.projectId = projet.id ?? projetId;
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
  // Récupérer l'ID du volontaire depuis le user connecté
  const volontaireId = this.user?.volontaireId || this.authService.getVolontaireId();
  
  console.log('🔍 ID du volontaire à récupérer:', volontaireId);
  
  if (volontaireId) {
    // ✅ Aller chercher le volontaire complet via l'API
    this.volontaireService.getVolontaire(volontaireId).subscribe({
      next: (volontaire) => {
        console.log('✅ Volontaire récupéré depuis API:', volontaire);
        console.log('📝 typePiece:', volontaire.typePiece);
        console.log('📝 numeroPiece:', volontaire.numeroPiece);
        
        // Pré-remplir avec les données du volontaire (qui sont complètes)
        this.candidature.prenom = volontaire.prenom || '';
        this.candidature.nom = volontaire.nom || '';
        this.candidature.email = volontaire.email || '';
        this.candidature.telephone = volontaire.telephone || '';
        this.candidature.volontaireId = volontaire.id || '';
        this.candidature.typePiece = volontaire.typePiece || 'CNIB';
        this.candidature.numeroPiece = volontaire.numeroPiece || '';
        
        console.log('✅ Après pré-remplissage - numeroPiece:', this.candidature.numeroPiece);
      },
      error: (err) => {
        console.error('❌ Erreur récupération volontaire:', err);
        // Fallback sur l'utilisateur localStorage
        this.preRemplirAvecUser();
      }
    });
  } else {
    this.preRemplirAvecUser();
  }
}

private preRemplirAvecUser(): void {
  if (this.user) {
    console.log('⚠️ Fallback sur user localStorage:', this.user);
    this.candidature.prenom = this.user.prenom || '';
    this.candidature.nom = this.user.nom || '';
    this.candidature.email = this.user.email || '';
    this.candidature.telephone = this.user.telephone || '';
    this.candidature.volontaireId = this.user.id || this.user.userId || '';
    this.candidature.typePiece = this.user.typePiece || 'CNIB';
    this.candidature.numeroPiece = this.user.numeroPiece || '';
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
              'Votre profil doit être complet à 100% pour pouvoir postuler.',
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
      this.selectedFile = null;
      this.filePreview = null;
      return;
    }
    this.selectedFile = file;
    this.filePreview = file.name;
  }

  onSubmit(): void {
    this.formSubmitted = true;

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
        !this.candidature.email  || !this.candidature.poste_vise ||
        !this.candidature.lettreMotivation) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }

    if (!this.selectedFile) {
      this.snackBar.open('Veuillez joindre votre CV (PDF) - obligatoire', 'Fermer', { duration: 4000 });
      return;
    }

    if (!this.candidature.volontaireId || this.candidature.volontaireId.toString().trim() === '') {
      this.snackBar.open('Erreur: Identifiant volontaire manquant', 'Fermer', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.formatCompetences();

    // Construction complète de la candidature
    const candidatureASoumettre: any = {
      prenom: this.candidature.prenom,
      nom: this.candidature.nom,
      email: this.candidature.email,
      telephone: this.candidature.telephone || '',
      posteVise: this.candidature.poste_vise,
      lettreMotivation: this.candidature.lettreMotivation,
      statut: 'en_attente',
      projectId: this.candidature.projectId,
      volontaireId: this.candidature.volontaireId,
      typePiece: this.candidature.typePiece,
      numeroPiece: this.candidature.numeroPiece || '',
      competences: this.candidature.competences || [],
      niveauExperience: this.candidature.niveau_experience || '',
      disponibilite: this.candidature.disponibilite || ''
    };

    console.log('📤 Envoi candidature avec CV:', this.selectedFile.name);

    // ✅ Upload du CV avec l'endpoint /api/upload
    const formData = new FormData();
    formData.append('fichier', this.selectedFile);

    this.candidatureService.uploadFile(formData).subscribe({
      next: (cvResponse) => {
        console.log('✅ CV uploadé avec succès:', cvResponse);
        candidatureASoumettre.cvUrl = cvResponse.url;
        
        this.candidatureService.create(candidatureASoumettre).subscribe({
          next: () => {
            this.snackBar.open('Votre candidature a été envoyée avec succès !', 'Fermer', { duration: 5000 });
            this.router.navigate(['/features/candidats/mes-candidatures']);
            this.loading = false;
          },
          error: (err) => {
            console.error('❌ Erreur création candidature:', err);
            this.snackBar.open('Erreur lors de l\'envoi de votre candidature', 'Fermer', { duration: 3000 });
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('❌ Erreur upload CV:', err);
        this.snackBar.open('Erreur lors de l\'upload du CV', 'Fermer', { duration: 3000 });
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
    if (!this.candidature.competences) {
      this.candidature.competences = [];
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
      this.candidature.lettreMotivation &&
      this.candidature.projectId &&
      this.selectedFile !== null
    );
  }

  supprimerFichier(): void {
    this.selectedFile = null;
    this.filePreview = null;
    const fileInput = document.getElementById('cvFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  getTypePieceLabel(): string {
    return this.candidature.typePiece === 'CNIB' ? 'CNIB' : 'Passeport';
  }

  getStatusLabel(status: string): string {
    const map: { [key: string]: string } = {
      'en_attente': 'En attente',
      'actif': 'Actif',
      'cloture': 'Clôturé'
    };
    return map[status] || status;
  }
}