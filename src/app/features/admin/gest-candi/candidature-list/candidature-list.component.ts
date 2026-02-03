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
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

import { Candidature } from '../../../models/candidature.model';
import { Project } from '../../../models/projects.model';
import { CandidatureService } from '../../../services/service_candi/candidature.service';
import { ProjectService } from '../../../services/service_projects/projects.service';
import { CandidatureDetailComponent } from '../candidature-detail/candidature-detail.component';
import { CandidatureFormComponent } from '../candidature-form/candidature-form.component';

@Component({
  selector: 'app-candidature-list',
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
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './candidature-list.component.html',
  styleUrls: ['./candidature-list.component.css']
})
export class CandidatureListComponent implements OnInit {
  candidatures: Candidature[] = [];
  projets: Project[] = [];
  loading = true;

  // Filtres
  filtreStatut: string = '';
  filtreProjet: string = '';
  searchTerm: string = '';

  // Colonnes pour le tableau
  displayedColumns: string[] = ['candidat', 'projet', 'competences', 'statut', 'date', 'actions'];

  constructor(
    private candidatureService: CandidatureService,
    private projectService: ProjectService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCandidatures();
    this.loadProjets();
  }

  loadCandidatures(): void {
    this.candidatureService.getAll().subscribe({
      next: (candidatures) => {
        this.candidatures = candidatures.sort((a, b) => 
          new Date(b.cree_le || '').getTime() - new Date(a.cree_le || '').getTime()
        );
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement candidatures:', error);
        this.snackBar.open('Erreur lors du chargement des candidatures', 'Fermer', { duration: 3000 });
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

  getCandidaturesFiltrees(): Candidature[] {
    let filtered = this.candidatures;

    // Filtre par statut
    if (this.filtreStatut) {
      filtered = filtered.filter(c => c.statut === this.filtreStatut);
    }

    // Filtre par projet
    if (this.filtreProjet) {
      filtered = filtered.filter(c => c.projectId?.toString() === this.filtreProjet);
    }

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.poste_vise.toLowerCase().includes(term) ||
        (c.nom + ' ' + c.prenom).toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        this.getProjectName(c.projectId).toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  getProjectName(projectId?: number): string {
    if (!projectId) return 'Non spécifié';
    const project = this.projets.find(p => p.id === projectId);
    return project ? project.titre : 'Projet inconnu';
  }

  getProjectRegion(projectId?: number): string {
    if (!projectId) return '';
    const project = this.projets.find(p => p.id === projectId);
    return project?.regionAffectation || '';
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

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    if (Array.isArray(competences)) return competences;
    return String(competences).split(',').map(c => c.trim());
  }

  voirDetails(candidature: Candidature): void {
    const project = this.projets.find(p => p.id === candidature.projectId);
    
    this.dialog.open(CandidatureDetailComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { candidature, project }
    });
  }

  modifierCandidature(candidature: Candidature): void {
    this.dialog.open(CandidatureFormComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { 
        candidature,
        projects: this.projets
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.loadCandidatures();
      }
    });
  }

  supprimerCandidature(candidatureId: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette candidature ? Cette action est irréversible.')) {
      this.candidatureService.delete(candidatureId).subscribe({
        next: () => {
          this.candidatures = this.candidatures.filter(c => c.id !== candidatureId);
          this.snackBar.open('Candidature supprimée avec succès', 'Fermer', { duration: 3000 });
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.snackBar.open('Erreur lors de la suppression de la candidature', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  nouvelleCandidature(): void {
    this.dialog.open(CandidatureFormComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { projects: this.projets }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.loadCandidatures();
      }
    });
  }

  clearFilters(): void {
    this.filtreStatut = '';
    this.filtreProjet = '';
    this.searchTerm = '';
  }
}