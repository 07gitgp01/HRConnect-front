// src/app/features/candidat/mes-candidatures/mes-candidatures.component.ts

import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

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
    MatInputModule,
    MatTooltipModule,
    MatPaginatorModule,  // ✅ AJOUTÉ
    MatTableModule        // ✅ AJOUTÉ
  ],
  templateUrl: './mes-candidatures.component.html',
  styleUrls: ['./mes-candidatures.component.css']
})
export class MesCandidaturesComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  user: any;
  mesCandidatures: Candidature[] = [];
  candidaturesFiltrees: Candidature[] = [];
  projets: Project[] = [];
  loading = true;

  filtreStatut: string = '';
  filtreProjet: string = '';
  searchTerm: string = '';

  // ✅ Pagination
  pageSize = 5;
  pageSizeOptions = [5, 10, 25, 50];
  currentPage = 0;

  stats = {
    total: 0,
    en_attente: 0,
    entretien: 0,
    acceptee: 0,
    refusee: 0
  };

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
        const userEmail = this.user?.email?.toLowerCase().trim();

        this.mesCandidatures = candidatures
          .filter(c => c.email?.toLowerCase().trim() === userEmail)
          .sort((a, b) => new Date(b.cree_le || '').getTime() - new Date(a.cree_le || '').getTime());

        this.calculerStats();
        this.appliquerFiltres();
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
      next: (projets) => { this.projets = projets; },
      error: (error)  => { console.error('Erreur chargement projets:', error); }
    });
  }

  calculerStats(): void {
    this.stats = {
      total:      this.mesCandidatures.length,
      en_attente: this.mesCandidatures.filter(c => c.statut === 'en_attente').length,
      entretien:  this.mesCandidatures.filter(c => c.statut === 'entretien').length,
      acceptee:   this.mesCandidatures.filter(c => c.statut === 'acceptee').length,
      refusee:    this.mesCandidatures.filter(c => c.statut === 'refusee').length
    };
  }

  appliquerFiltres(): void {
    let filtered = this.mesCandidatures;

    if (this.filtreStatut) {
      filtered = filtered.filter(c => c.statut === this.filtreStatut);
    }

    if (this.filtreProjet) {
      filtered = filtered.filter(c => String(c.projectId) === String(this.filtreProjet));
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c => {
        const projectName = this.getProjectName(c.projectId);
        const isValidProjectName = projectName !== 'Projet inconnu' && projectName !== 'Non spécifié';
        return (
          c.poste_vise.toLowerCase().includes(term) ||
          (c.nom + ' ' + c.prenom).toLowerCase().includes(term) ||
          (isValidProjectName && projectName.toLowerCase().includes(term))
        );
      });
    }

    this.candidaturesFiltrees = filtered;
    
    // Reset à la première page quand les filtres changent
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  // ✅ Getter pour les candidatures paginées
  get candidaturesPaginees(): Candidature[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.candidaturesFiltrees.slice(startIndex, startIndex + this.pageSize);
  }

  // ✅ Méthode appelée lors du changement de page
  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  // ✅ Méthode pour formater le nom du projet dans le filtre
  getProjetDisplayName(projet: Project): string {
    if (!projet) return 'Mission inconnue';
    const titre = projet.titre || 'Mission sans titre';
    if (titre.length > 40) {
      return titre.substring(0, 40) + '...';
    }
    return titre;
  }

  retirerCandidature(candidatureId: number | string): void {
    if (confirm('Êtes-vous sûr de vouloir retirer cette candidature ? Cette action est irréversible.')) {
      this.candidatureService.delete(candidatureId).subscribe({
        next: () => {
          this.mesCandidatures = this.mesCandidatures.filter(c => String(c.id) !== String(candidatureId));
          this.calculerStats();
          this.appliquerFiltres();
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
      'entretien':  'statut-entretien',
      'acceptee':   'statut-acceptee',
      'refusee':    'statut-refusee'
    };
    return classes[statut] || '';
  }

  getStatutText(statut: string): string {
    const textes: { [key: string]: string } = {
      'en_attente': 'En attente',
      'entretien':  'En entretien',
      'acceptee':   'Acceptée',
      'refusee':    'Refusée'
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
      'debutant':      'Débutant',
      'intermediaire': 'Intermédiaire',
      'expert':        'Expert'
    };
    return niveau ? (niveaux[niveau] || niveau) : 'Non spécifié';
  }

  getProjectName(projectId?: number | string): string {
    if (projectId == null) return 'Non spécifié';
    const project = this.projets.find(p => String(p.id) === String(projectId));
    return project?.titre || 'Projet inconnu';
  }

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    if (Array.isArray(competences)) return competences;
    return String(competences).split(',').map(c => c.trim());
  }

  voirDetailsCandidature(candidatureId?: number | string): void {
    if (candidatureId != null) {
      this.router.navigate(['/features/candidats/candidature', candidatureId]);
    } else {
      this.snackBar.open('Impossible d\'afficher les détails', 'Fermer', { duration: 3000 });
    }
  }

  reappliquer(candidature: Candidature): void {
    if (candidature.projectId != null) {
      this.router.navigate(['/features/candidats/postuler', candidature.projectId]);
    }
  }

  clearFilters(): void {
    this.filtreStatut = '';
    this.filtreProjet = '';
    this.searchTerm   = '';
    this.appliquerFiltres();
  }

  ouvrirCV(cvUrl?: string): void {
    if (cvUrl) {
      window.open(cvUrl, '_blank');
    } else {
      this.snackBar.open('Aucun CV disponible pour cette candidature', 'Fermer', { duration: 3000 });
    }
  }

  getDateEntretienFormatee(dateEntretien?: string): string {
    if (!dateEntretien) return '';
    try {
      const date = new Date(dateEntretien);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  }

  aEntretienProgramme(candidature: Candidature): boolean {
    return candidature.statut === 'entretien' && !!candidature.date_entretien;
  }
}