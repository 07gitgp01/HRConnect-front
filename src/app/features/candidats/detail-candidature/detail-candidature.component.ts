// src/app/features/candidat/detail-candidature/detail-candidature.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Candidature } from '../../models/candidature.model';
import { Project } from '../../models/projects.model';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { ProjectService } from '../../services/service_projects/projects.service';
import { AuthService } from '../../services/service_auth/auth.service';

@Component({
  selector: 'app-detail-candidature',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './detail-candidature.component.html',
  styleUrls: ['./detail-candidature.component.css']
})
export class DetailCandidatureComponent implements OnInit {
  candidature: Candidature | null = null;
  projet: Project | null = null;
  loading = true;
  error = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private candidatureService: CandidatureService,
    private projectService: ProjectService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCandidature();
  }

  loadCandidature(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      console.error('❌ Aucun ID de candidature dans l\'URL');
      this.error = true;
      this.errorMessage = 'Identifiant de candidature manquant';
      this.loading = false;
      return;
    }

    console.log('🔍 Chargement de la candidature avec ID:', id);
    this.loading = true;

    // ✅ CORRECTION: Ne pas utiliser parseInt, garder l'ID tel quel
    this.candidatureService.getById(id).subscribe({
      next: (candidature) => {
        console.log('✅ Candidature chargée:', candidature);
        
        // Vérifier que la candidature appartient bien à l'utilisateur connecté
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && candidature.email !== currentUser.email) {
          console.error('❌ Accès non autorisé à cette candidature');
          this.error = true;
          this.errorMessage = 'Vous n\'êtes pas autorisé à consulter cette candidature';
          this.loading = false;
          return;
        }

        this.candidature = candidature;
        
        // Charger le projet associé
        if (candidature.projectId) {
          this.loadProjet(candidature.projectId);
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('❌ Erreur chargement candidature:', error);
        this.error = true;
        this.errorMessage = 'Impossible de charger les détails de la candidature';
        this.loading = false;
      }
    });
  }

  loadProjet(projectId: number | string): void {
    this.projectService.getProject(projectId).subscribe({
      next: (projet) => {
        console.log('✅ Projet chargé:', projet.titre);
        this.projet = projet;
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement projet:', error);
        // La candidature est chargée mais pas le projet
        this.loading = false;
      }
    });
  }

  getStatutBadgeClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'en_attente': 'statut-en-attente',
      'entretien': 'statut-entretien',
      'acceptee': 'statut-acceptee',
      'refusee': 'statut-refusee'
    };
    return classes[statut] || 'statut-en-attente';
  }

  getStatutText(statut: string): string {
    const textes: { [key: string]: string } = {
      'en_attente': 'En attente',
      'entretien': 'En entretien',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée'
    };
    return textes[statut] || statut;
  }

  getStatutIcon(statut: string): string {
    const icons: { [key: string]: string } = {
      'en_attente': 'schedule',
      'entretien': 'event_available',
      'acceptee': 'check_circle',
      'refusee': 'cancel'
    };
    return icons[statut] || 'help_outline';
  }

  getNiveauExperienceText(niveau?: string): string {
    const niveaux: { [key: string]: string } = {
      'debutant': 'Débutant',
      'intermediaire': 'Intermédiaire',
      'expert': 'Expert'
    };
    return niveau ? (niveaux[niveau] || niveau) : 'Non spécifié';
  }

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    if (Array.isArray(competences)) {
      return competences;
    }
    return String(competences).split(',').map(c => c.trim()).filter(c => c.length > 0);
  }

  ouvrirCV(): void {
  const cvUrl = this.candidature?.cv_url;
  
  if (cvUrl) {
    let fullUrl = cvUrl;
    if (!fullUrl.startsWith('http') && !fullUrl.startsWith('/')) {
      fullUrl = '/' + fullUrl;
    }
    if (fullUrl.startsWith('/')) {
      fullUrl = 'http://localhost:8080' + fullUrl;
    }
    window.open(fullUrl, '_blank');
  } else {
    this.snackBar.open('Aucun CV disponible', 'Fermer', { duration: 3000 });
  }
}

  voirProjet(): void {
    if (this.candidature?.projectId) {
      this.router.navigate(['/features/candidats/details', this.candidature.projectId]);
    }
  }

  retirerCandidature(): void {
    if (!this.candidature?.id) return;

    if (!confirm('Êtes-vous sûr de vouloir retirer cette candidature ? Cette action est irréversible.')) {
      return;
    }

    this.candidatureService.delete(this.candidature.id).subscribe({
      next: () => {
        this.snackBar.open('Candidature retirée avec succès', 'Fermer', { duration: 3000 });
        this.router.navigate(['/features/candidats/mes-candidatures']);
      },
      error: (error) => {
        console.error('❌ Erreur suppression candidature:', error);
        this.snackBar.open('Erreur lors du retrait de la candidature', 'Fermer', { duration: 3000 });
      }
    });
  }

  reappliquer(): void {
    if (this.candidature?.projectId) {
      this.router.navigate(['/features/candidats/postuler', this.candidature.projectId]);
    }
  }

  goBack(): void {
    this.location.back();
  }

  getDateEntretienFormatee(dateEntretien?: string): string {
    if (!dateEntretien) return '';
    
    try {
      const date = new Date(dateEntretien);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date invalide';
    }
  }

  aEntretienProgramme(): boolean {
    return this.candidature?.statut === 'entretien' && !!this.candidature.date_entretien;
  }

  peutRetirer(): boolean {
    return this.candidature?.statut === 'en_attente';
  }

  peutReappliquer(): boolean {
    return this.candidature?.statut === 'refusee';
  }

  getDelaiReponse(): string {
    if (!this.candidature?.cree_le) return '';
    
    const dateCreation = new Date(this.candidature.cree_le);
    const aujourdhui = new Date();
    const diffJours = Math.floor((aujourdhui.getTime() - dateCreation.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffJours === 0) return 'Aujourd\'hui';
    if (diffJours === 1) return 'Il y a 1 jour';
    return `Il y a ${diffJours} jours`;
  }
}