// src/app/features/admin/gest-projets/projets-list/projets-list.component.ts
import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

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
export class ProjetsListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<Project>([]);
  displayedColumns = ['titre', 'partenaire', 'regionAffectation', 'dateDebut', 'statutProjet', 'actions'];

  searchTerm = '';
  statusFilter = 'Tous';
  partenaires: Partenaire[] = [];
  isLoading = true;
  
  // Ajout d'une propriété pour suivre les données originales
  private originalProjects: Project[] = [];

  statusOptions = [
    { value: 'Tous', label: 'Tous les statuts' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'actif', label: 'Actif' },
    { value: 'cloture', label: 'Clôturé' }
  ];

  private projectService = inject(ProjectService);
  private partenaireService = inject(PartenaireService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private datePipe = inject(DatePipe);

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData(): void {
    this.isLoading = true;

    this.projectService.getProjects().subscribe({
      next: (projects: Project[]) => {
        this.originalProjects = projects || [];
        this.dataSource.data = [...this.originalProjects];
        
        this.partenaireService.getAll().subscribe({
          next: (partners: Partenaire[]) => {
            this.partenaires = partners || [];
            this.configureFilterPredicate();
            
            setTimeout(() => {
              this.dataSource.paginator = this.paginator;
              this.dataSource.sort = this.sort;
            });
            
            this.applyFilters();
            this.isLoading = false;
          },
          error: (error: any) => {
            console.error('Erreur chargement partenaires:', error);
            this.snackBar.open('Erreur chargement partenaires', 'Fermer', { duration: 3000 });
            this.isLoading = false;
          }
        });
      },
      error: (error: any) => {
        console.error('Erreur chargement projets:', error);
        this.snackBar.open('Erreur chargement projets', 'Fermer', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  private configureFilterPredicate(): void {
    this.dataSource.filterPredicate = (data: Project, filter: string) => {
      const searchTerms = filter.split('|');
      const search = searchTerms[0]?.toLowerCase() || '';
      const statusFilter = searchTerms[1] || 'Tous';

      const matchText = 
        (data.titre || '').toLowerCase().includes(search) ||
        (data.descriptionCourte || '').toLowerCase().includes(search) ||
        this.getPartenaireNom(data.partenaireId).toLowerCase().includes(search) ||
        (data.regionAffectation || '').toLowerCase().includes(search) ||
        false;

      const matchStatus = 
        statusFilter === 'Tous' || 
        data.statutProjet === statusFilter;

      return matchText && matchStatus;
    };
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  applyFilters(): void {
    const combinedFilter = `${this.searchTerm}|${this.statusFilter}`;
    this.dataSource.filter = combinedFilter;
  }

  filterStatus(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  getPartenaireNom(id: number | undefined): string {
    if (!id) return '—';
    return this.partenaires.find(p => p.id === id)?.nomStructure || '—';
  }

  getStatusColor(status: ProjectStatus | undefined): string {
    if (!status) return '';
    
    const statusColors: { [key: string]: string } = {
      'en_attente': 'warn',
      'actif': 'primary',
      'cloture': 'accent'
    };
    return statusColors[status] || '';
  }

  getStatusDisplay(status: ProjectStatus | undefined): string {
    return ProjectWorkflow.getStatusLabel(status || 'en_attente');
  }

  canValidate(project: Project): boolean {
    return project.statutProjet === 'en_attente';
  }

  canClose(project: Project): boolean {
    return project.statutProjet === 'actif' || project.statutProjet === 'en_attente';
  }

  viewProjectDetails(project: Project): void {
    const dialogRef = this.dialog.open(ProjectDetailDialogComponent, {
      width: '1000px',
      maxHeight: '90vh',
      data: { project, partenaires: this.partenaires }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh') {
        this.loadData();
      }
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

    if (confirm("Voulez-vous supprimer ce projet ?")) {
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
    if (!project.id) {
      this.snackBar.open('Projet non valide', 'Fermer', { duration: 3000 });
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir clôturer le projet "${project.titre}" ?`)) {
      this.changerStatut(project, 'cloture');
    }
  }

  // ✅ MÉTHODE CORRIGÉE : changerStatut
  changerStatut(project: Project, nouveauStatut: ProjectStatus): void {
    if (!project.id) {
      this.snackBar.open('Projet non valide', 'Fermer', { duration: 3000 });
      return;
    }

    if (!ProjectWorkflow.canChangeStatus(project.statutProjet, nouveauStatut)) {
      this.snackBar.open('Transition de statut non autorisée', 'Fermer', { duration: 3000 });
      return;
    }

    console.log(`🔄 Changement statut UI - Projet "${project.titre}":`, {
      de: project.statutProjet,
      vers: nouveauStatut
    });

    // Afficher un indicateur de chargement
    const originalTitle = project.titre;
    
    this.projectService.changerStatutProjet(project.id, nouveauStatut).subscribe({
      next: (updatedProject: Project) => {
        console.log(`✅ Projet mis à jour reçu:`, {
          id: updatedProject.id,
          titre: updatedProject.titre,
          statut: updatedProject.statutProjet,
          volontaires: `${updatedProject.nombreVolontairesActuels}/${updatedProject.nombreVolontairesRequis}`
        });

        // ✅ CORRECTION AMÉLIORÉE : Mettre à jour les données de manière robuste
        this.updateProjectInDataSource(updatedProject);
        
        this.snackBar.open('Statut mis à jour avec succès', 'Fermer', { duration: 2000 });
        
        // Recharger les filtres pour s'assurer que le projet est bien affiché dans la bonne catégorie
        setTimeout(() => {
          this.applyFilters();
        }, 100);
      },
      error: (err: any) => {
        console.error('❌ Erreur changement statut', err);
        
        let errorMessage = 'Erreur lors du changement de statut';
        if (err.message) {
          errorMessage = err.message;
        }
        
        this.snackBar.open(errorMessage, 'Fermer', { duration: 3000 });
        
        // Rafraîchir les données pour éviter un état incohérent
        this.loadData();
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE : Mettre à jour le projet dans le DataSource
  private updateProjectInDataSource(updatedProject: Project): void {
    // Créer une copie profonde des données actuelles
    const currentData = [...this.dataSource.data];
    const originalData = [...this.originalProjects];
    
    // Trouver l'index dans les deux tableaux
    const dataIndex = currentData.findIndex(p => p.id === updatedProject.id);
    const originalIndex = originalData.findIndex(p => p.id === updatedProject.id);
    
    if (dataIndex !== -1) {
      // Fusionner les propriétés pour conserver les références
      const mergedProject = { 
        ...currentData[dataIndex], 
        ...updatedProject,
        // S'assurer que les propriétés critiques sont mises à jour
        titre: updatedProject.titre || currentData[dataIndex].titre,
        statutProjet: updatedProject.statutProjet,
        dateDebut: updatedProject.dateDebut,
        dateFin: updatedProject.dateFin,
        dateCloture: updatedProject.dateCloture,
        nombreVolontairesActuels: updatedProject.nombreVolontairesActuels,
        nombreVolontairesRequis: updatedProject.nombreVolontairesRequis,
        partenaireId: updatedProject.partenaireId,
        regionAffectation: updatedProject.regionAffectation,
        updated_at: updatedProject.updated_at
      };
      
      // Mettre à jour les tableaux
      currentData[dataIndex] = mergedProject;
      if (originalIndex !== -1) {
        originalData[originalIndex] = mergedProject;
      }
      
      // Appliquer les nouvelles données
      this.originalProjects = originalData;
      this.dataSource.data = currentData;
      
      console.log(`🔄 Projet mis à jour dans le DataSource:`, mergedProject.titre);
    } else {
      // Si le projet n'est pas trouvé, recharger complètement
      console.warn('Projet non trouvé dans le DataSource, rechargement complet');
      this.loadData();
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '—';
    return this.datePipe.transform(dateString, 'dd/MM/yyyy') || '—';
  }

  getAvailableStatuses(currentStatus: ProjectStatus): ProjectStatus[] {
    return ProjectWorkflow.getPossibleTransitions(currentStatus);
  }

  isOverdue(project: Project): boolean {
    if (!project.dateFin || project.statutProjet === 'cloture') {
      return false;
    }
    
    const today = new Date();
    const endDate = new Date(project.dateFin);
    endDate.setHours(0, 0, 0, 0);
    
    return endDate < today;
  }

  getDaysRemaining(project: Project): number | null {
    if (!project.dateFin || project.statutProjet === 'cloture') {
      return null;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(project.dateFin);
    endDate.setHours(0, 0, 0, 0);
    
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  canChangeToStatus(project: Project, targetStatus: ProjectStatus): boolean {
    return ProjectWorkflow.canChangeStatus(project.statutProjet, targetStatus);
  }
}