// src/app/features/candidat/mes-candidatures/mes-candidatures.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../services/service_auth/auth.service';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { ProjectService } from '../../services/service_projects/projects.service';
import { Candidature } from '../../models/candidature.model';
import { Project } from '../../models/projects.model';

@Component({
  selector: 'app-mes-candidatures',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule
  ],
  templateUrl: './mes-candidatures.component.html',
  styleUrls: ['./mes-candidatures.component.css']
})
export class MesCandidaturesComponent implements OnInit {
  user: any;
  mesCandidatures: Candidature[] = [];
  projets: Project[] = [];
  loading = true;

  // Filtres
  filtreStatut: string = '';
  filtreProjet: string = '';
  searchTerm: string = '';

  // Statistiques
  stats = {
    total: 0,
    en_attente: 0,
    entretien: 0,
    acceptee: 0,
    refusee: 0
  };

  // Gestion de l'expansion des lettres de motivation
  lettresExpanded: { [key: number]: boolean } = {};

  constructor(
    private authService: AuthService,
    private candidatureService: CandidatureService,
    private projectService: ProjectService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (this.user) {
      this.loadMesCandidatures();
      this.loadProjets();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadMesCandidatures(): void {
    this.candidatureService.getAll().subscribe({
      next: (candidatures) => {
        // Filtrer les candidatures de l'utilisateur connecté
        this.mesCandidatures = candidatures
          .filter(c => c.email === this.user.email)
          .sort((a, b) => new Date(b.cree_le || '').getTime() - new Date(a.cree_le || '').getTime());
        
        this.calculerStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement candidatures:', error);
        this.snackBar.open('Erreur lors du chargement de vos candidatures', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  loadProjets(): void {
    this.projectService.getProjects().subscribe({
      next: (projets) => {
        this.projets = projets;
      },
      error: (error) => {
        console.error('Erreur chargement projets:', error);
      }
    });
  }

  calculerStats(): void {
    this.stats = {
      total: this.mesCandidatures.length,
      en_attente: this.mesCandidatures.filter(c => c.statut === 'en_attente').length,
      entretien: this.mesCandidatures.filter(c => c.statut === 'entretien').length,
      acceptee: this.mesCandidatures.filter(c => c.statut === 'acceptee').length,
      refusee: this.mesCandidatures.filter(c => c.statut === 'refusee').length
    };
  }

  getCandidaturesFiltrees(): Candidature[] {
    let filtered = this.mesCandidatures;

    // Filtre par statut
    if (this.filtreStatut) {
      filtered = filtered.filter(c => c.statut === this.filtreStatut);
    }

    // Filtre par projet (gestion sécurisée des IDs)
    if (this.filtreProjet) {
      filtered = filtered.filter(c => {
        const candidatureProjectId = c.projectId?.toString();
        const filterProjectId = this.filtreProjet.toString();
        return candidatureProjectId === filterProjectId;
      });
    }

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.poste_vise.toLowerCase().includes(term) ||
        (c.nom + ' ' + c.prenom).toLowerCase().includes(term) ||
        this.getProjectName(c.projectId).toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  retirerCandidature(candidatureId: number): void {
    if (confirm('Êtes-vous sûr de vouloir retirer cette candidature ? Cette action est irréversible.')) {
      this.candidatureService.delete(candidatureId).subscribe({
        next: () => {
          this.mesCandidatures = this.mesCandidatures.filter(c => c.id !== candidatureId);
          this.calculerStats();
          this.snackBar.open('Candidature retirée avec succès', 'Fermer', { duration: 3000 });
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.snackBar.open('Erreur lors du retrait de la candidature', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  getStatutBadgeClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'en_attente': 'statut-en-attente',
      'entretien': 'statut-entretien',
      'acceptee': 'statut-acceptee',
      'refusee': 'statut-refusee'
    };
    return classes[statut] || '';
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

  getNiveauExperienceText(niveau?: string): string {
    const niveaux: { [key: string]: string } = {
      'debutant': 'Débutant',
      'intermediaire': 'Intermédiaire',
      'expert': 'Expert'
    };
    return niveau ? (niveaux[niveau] || niveau) : 'Non spécifié';
  }

  getProjectName(projectId?: number | string): string {
  if (!projectId) return 'Non spécifié';
  
  const idToFind = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;
  
  const project = this.projets.find(p => {
    const projectId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
    return projectId === idToFind;
  });
  
  return project ? (project.titre || 'Projet inconnu') : 'Projet inconnu'; // Supprimer project.title
}

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    if (Array.isArray(competences)) {
      return competences;
    }
    return String(competences).split(',').map(c => c.trim());
  }

  voirDetailsProjet(projectId?: number): void {
    if (projectId) {
      this.router.navigate(['/features/candidats/details', projectId]);
    }
  }

  reappliquer(candidature: Candidature): void {
    if (candidature.projectId) {
      this.router.navigate(['/features/candidats/postuler', candidature.projectId]);
    }
  }

  clearFilters(): void {
    this.filtreStatut = '';
    this.filtreProjet = '';
    this.searchTerm = '';
  }

  /**
   * Ouvre le CV dans un nouvel onglet si disponible
   */
  ouvrirCV(cvUrl?: string): void {
    if (cvUrl) {
      window.open(cvUrl, '_blank');
    } else {
      this.snackBar.open('Aucun CV disponible pour cette candidature', 'Fermer', { duration: 3000 });
    }
  }

  /**
   * Formate la date d'entretien pour l'affichage
   */
  getDateEntretienFormatee(dateEntretien?: string): string {
    if (!dateEntretien) return '';
    
    try {
      const date = new Date(dateEntretien);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erreur formatage date:', error);
      return 'Date invalide';
    }
  }

  /**
   * Vérifie si une candidature a un entretien programmé
   */
  aEntretienProgramme(candidature: Candidature): boolean {
    return candidature.statut === 'entretien' && !!candidature.date_entretien;
  }

  toggleLettreExpansion(candidature: Candidature): void {
    if (candidature.id) {
      this.lettresExpanded[candidature.id] = !this.lettresExpanded[candidature.id];
    }
  }

  isLettreExpanded(candidature: Candidature): boolean {
    return candidature.id ? !!this.lettresExpanded[candidature.id] : false;
  }
}