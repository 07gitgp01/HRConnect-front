import { Component, OnInit, OnDestroy, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Project, ProjectStatus, ProjectWorkflow } from '../../../models/projects.model';
import { Partenaire } from '../../../models/partenaire.model';
import { ProjectService } from '../../../services/service_projects/projects.service';
import { PartenaireService } from '../../../services/service_parten/partenaire.service';
import { ProjetsFormComponent } from '../projets-form/projets-form.component';
import { ProjectDetailDialogComponent } from '../project-detail-dialog/project-detail-dialog.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-projets-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatSelectModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  providers: [DatePipe],
  templateUrl: './projets-list.component.html',
  styleUrls: ['./projets-list.component.css']
})
export class ProjetsListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<Project>([]);
  displayedColumns = ['titre', 'partenaire', 'regionAffectation', 'dateDebut', 'statutProjet', 'actions'];

  searchTerm   = '';
  statusFilter = 'Tous';
  partenaires: Partenaire[] = [];
  isLoading = true;

  private originalProjects: Project[] = [];

  // ✅ Stocker l'ID à ouvrir après chargement — même pattern que candidatures
  private pendingProjetId: string | number | null = null;
  private destroy$ = new Subject<void>();

  statusOptions = [
    { value: 'Tous',       label: 'Tous les statuts' },
    { value: 'en_attente', label: 'En attente'        },
    { value: 'actif',      label: 'Actif'             },
    { value: 'cloture',    label: 'Clôturé'           }
  ];

  private projectService    = inject(ProjectService);
  private partenaireService = inject(PartenaireService);
  private dialog            = inject(MatDialog);
  private snackBar          = inject(MatSnackBar);
  private datePipe          = inject(DatePipe);
  private route             = inject(ActivatedRoute); // ✅ ajout
  private router            = inject(Router);         // ✅ ajout

  ngOnInit(): void {
    // ✅ Lire le query param AVANT de charger — même pattern que candidatures
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['projetId']) {
          this.pendingProjetId = params['projetId'];
        }
      });

    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort      = this.sort;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== CHARGEMENT ====================

  loadData(): void {
    this.isLoading = true;

    this.projectService.getProjects().subscribe({
      next: (projects: Project[]) => {
        this.originalProjects = projects || [];
        this.dataSource.data  = [...this.originalProjects];

        this.partenaireService.getAll().subscribe({
          next: (partners: Partenaire[]) => {
            this.partenaires = partners || [];
            this.configureFilterPredicate();
            setTimeout(() => {
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort      = this.sort;
            });
            this.applyFilters();
            this.isLoading = false;

            // ✅ Ouvrir le projet en attente après chargement complet
            if (this.pendingProjetId !== null) {
              this.ouvrirProjetParId(this.pendingProjetId);
              this.pendingProjetId = null;
            }
          },
          error: (err: any) => {
            console.error('Erreur chargement partenaires:', err);
            this.snackBar.open('Erreur chargement partenaires', 'Fermer', { duration: 3000 });
            this.isLoading = false;
          }
        });
      },
      error: (err: any) => {
        console.error('Erreur chargement projets:', err);
        this.snackBar.open('Erreur chargement projets', 'Fermer', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  // ==================== OUVERTURE AUTOMATIQUE DEPUIS QUERY PARAM ====================

  // ✅ Même logique que ouvrirCandidatureParId() dans candidature-list
  private ouvrirProjetParId(id: string | number): void {
    const projet = this.originalProjects.find(p => this.idsEqual(p.id, id));

    if (projet) {
      // ✅ Ajuster la page du paginator Material pour afficher le projet
      const filtres   = this.dataSource.filteredData;
      const index     = filtres.findIndex(p => this.idsEqual(p.id, id));
      if (index >= 0 && this.paginator) {
        const pageSize  = this.paginator.pageSize || 10;
        const pageCible = Math.floor(index / pageSize);
        this.paginator.pageIndex = pageCible;
        this.dataSource.paginator = this.paginator;
      }

      // ✅ Ouvrir le dialog après un court délai (rendu)
      setTimeout(() => {
        this.viewProjectDetails(projet);
      }, 150);
    } else {
      this.snackBar.open('Mission introuvable', 'Fermer', { duration: 3000 });
    }

    // ✅ Nettoyer le query param
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { projetId: null },
      queryParamsHandling: 'merge'
    });
  }

  // ==================== FILTRES ====================

  private configureFilterPredicate(): void {
    this.dataSource.filterPredicate = (data: Project, filter: string) => {
      const [search, statusFilter] = filter.split('|');
      const term = (search || '').toLowerCase();

      const matchText =
        (data.titre || '').toLowerCase().includes(term) ||
        (data.descriptionCourte || '').toLowerCase().includes(term) ||
        this.getPartenaireNom(data.partenaireId).toLowerCase().includes(term) ||
        (data.regionAffectation || '').toLowerCase().includes(term);

      const matchStatus = !statusFilter || statusFilter === 'Tous' || data.statutProjet === statusFilter;

      return matchText && matchStatus;
    };
  }

  clearSearch(): void { this.searchTerm = ''; this.applyFilters(); }

  applyFilters(): void {
    this.dataSource.filter = `${this.searchTerm}|${this.statusFilter}`;
  }

  filterStatus(status: string): void { this.statusFilter = status; this.applyFilters(); }

  // ==================== HELPERS ====================

  private idsEqual(a: any, b: any): boolean {
    if (a == null || b == null) return false;
    return String(a) === String(b);
  }

  getPartenaireNom(id: number | string | undefined): string {
    if (id == null) return '—';
    return this.partenaires.find(p => this.idsEqual(p.id, id))?.nomStructure || '—';
  }

  getStatusColor(status: ProjectStatus | undefined): string {
    const colors: Record<string, string> = {
      'en_attente': 'warn', 'actif': 'primary', 'cloture': 'accent'
    };
    return status ? (colors[status] || '') : '';
  }

  getStatusDisplay(status: ProjectStatus | undefined): string {
    return ProjectWorkflow.getStatusLabel(status || 'en_attente');
  }

  canValidate(project: Project): boolean { return project.statutProjet === 'en_attente'; }
  canClose(project: Project): boolean    { return project.statutProjet === 'actif' || project.statutProjet === 'en_attente'; }

  getAvailableStatuses(currentStatus: ProjectStatus): ProjectStatus[] {
    return ProjectWorkflow.getPossibleTransitions(currentStatus);
  }

  canChangeToStatus(project: Project, targetStatus: ProjectStatus): boolean {
    return ProjectWorkflow.canChangeStatus(project.statutProjet, targetStatus);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '—';
    return this.datePipe.transform(dateString, 'dd/MM/yyyy') || '—';
  }

  isOverdue(project: Project): boolean {
    if (!project.dateFin || project.statutProjet === 'cloture') return false;
    return new Date(project.dateFin) < new Date();
  }

  getDaysRemaining(project: Project): number | null {
    if (!project.dateFin || project.statutProjet === 'cloture') return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end   = new Date(project.dateFin); end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // ==================== ACTIONS ====================

  viewProjectDetails(project: Project): void {
    this.dialog.open(ProjectDetailDialogComponent, {
      width: '1000px',
      maxHeight: '90vh',
      data: { project, partenaires: this.partenaires }
    }).afterClosed().subscribe(result => {
      if (result === 'refresh') this.loadData();
    });
  }

  openProjetDialog(projet?: Project): void {
    this.dialog.open(ProjetsFormComponent, {
      width: '750px',
      data: { id: projet?.id ?? null }
    }).afterClosed().subscribe(refresh => {
      if (refresh) this.loadData();
    });
  }

  supprimer(p: Project): void {
    if (!p.id) return;
    if (confirm('Voulez-vous supprimer ce projet ?')) {
      this.projectService.deleteProject(p.id).subscribe({
        next: () => {
          this.snackBar.open('Projet supprimé avec succès', 'Fermer', { duration: 2000 });
          this.loadData();
        },
        error: (err: any) => {
          console.error('Erreur suppression projet:', err);
          this.snackBar.open('Erreur lors de la suppression du projet', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  validerProjet(project: Project): void {
    if (!project.id) return;
    if (confirm(`Valider le projet "${project.titre}" ?`)) {
      this.changerStatut(project, 'actif');
    }
  }

  cloturerProjet(project: Project): void {
    if (!project.id) { this.snackBar.open('Projet non valide', 'Fermer', { duration: 3000 }); return; }
    if (confirm(`Clôturer le projet "${project.titre}" ?`)) {
      this.changerStatut(project, 'cloture');
    }
  }

  changerStatut(project: Project, nouveauStatut: ProjectStatus): void {
    if (!project.id) { this.snackBar.open('Projet non valide', 'Fermer', { duration: 3000 }); return; }

    if (!ProjectWorkflow.canChangeStatus(project.statutProjet, nouveauStatut)) {
      this.snackBar.open('Transition de statut non autorisée', 'Fermer', { duration: 3000 });
      return;
    }

    this.projectService.changerStatutProjet(project.id, nouveauStatut).subscribe({
      next: (updatedProject: Project) => {
        this.updateProjectInDataSource(updatedProject);
        this.snackBar.open('Statut mis à jour avec succès', 'Fermer', { duration: 2000 });
        setTimeout(() => this.applyFilters(), 100);
      },
      error: (err: any) => {
        console.error('❌ Erreur changement statut', err);
        this.snackBar.open(err.message || 'Erreur lors du changement de statut', 'Fermer', { duration: 3000 });
        this.loadData();
      }
    });
  }

  private updateProjectInDataSource(updatedProject: Project): void {
    const currentData  = [...this.dataSource.data];
    const originalData = [...this.originalProjects];

    const dataIndex     = currentData.findIndex(p  => this.idsEqual(p.id, updatedProject.id));
    const originalIndex = originalData.findIndex(p => this.idsEqual(p.id, updatedProject.id));

    if (dataIndex !== -1) {
      const merged = { ...currentData[dataIndex], ...updatedProject };
      currentData[dataIndex] = merged;
      if (originalIndex !== -1) originalData[originalIndex] = merged;
      this.originalProjects = originalData;
      this.dataSource.data  = currentData;
    } else {
      this.loadData();
    }
  }
}