// src/app/features/admin/gest-projets/project-detail-dialog/project-detail-dialog.component.ts
import { Component, Inject, OnInit, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatOptionModule } from '@angular/material/core';

import { Project, ProjectStatus, ProjectWorkflow } from '../../../models/projects.model';
import { ProjectService } from '../../../services/service_projects/projects.service';
import { CandidatureService } from '../../../services/service_candi/candidature.service';
import { PartenaireService } from '../../../services/service_parten/partenaire.service';
import { Partenaire } from '../../../models/partenaire.model';
import { Volontaire } from '../../../models/volontaire.model';

// Interfaces pour typer les données
interface Candidature {
  id?: number | string;
  prenom: string;
  nom: string;
  email: string;
  competences?: string[] | string;
  statut: string;
}

interface Affectation {
  id?: number | string;
  volontaire: Volontaire;
  dateAffectation?: string;
}

@Component({
  selector: 'app-project-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    
    // Angular Material modules
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatTabsModule,
    MatChipsModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSelectModule,
    MatOptionModule,
    MatFormFieldModule,
    MatTooltipModule
  ],
  templateUrl: './project-detail-dialog.component.html',
  styleUrls: ['./project-detail-dialog.component.css']
})
export class ProjectDetailDialogComponent implements OnInit, AfterViewInit {
  candidatures: Candidature[] = [];
  volontairesAffectes: Affectation[] = [];
  volontairesDisponibles: Volontaire[] = [];
  volontaireSelectionne: string | null = null;
  partenaires: Partenaire[] = [];
  
  isLoadingCandidatures = false;
  isLoadingVolontaires = false;
  isLoadingPartenaires = false;

  constructor(
    public dialogRef: MatDialogRef<ProjectDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { project: Project },
    private projectService: ProjectService,
    private candidatureService: CandidatureService,
    private partenaireService: PartenaireService,
    private snackBar: MatSnackBar,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    console.log('ProjectDetailDialogComponent initialisé avec projet:', this.data.project);
    this.loadPartenaires();
    this.loadCandidatures();
    this.loadVolontairesAffectes();
    this.loadVolontairesDisponibles();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const dialogContainer = this.elementRef.nativeElement.querySelector('.mat-mdc-dialog-surface');
      if (dialogContainer) {
        dialogContainer.setAttribute('aria-modal', 'true');
      }
    });
  }

  // ==================== CHARGEMENT DES DONNÉES ====================

  loadPartenaires(): void {
    this.isLoadingPartenaires = true;
    this.partenaireService.getAll().subscribe({
      next: (partenaires: Partenaire[]) => {
        this.partenaires = partenaires || [];
        this.isLoadingPartenaires = false;
        console.log('✅ Partenaires chargés:', this.partenaires.length);
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement partenaires:', err);
        this.partenaires = [];
        this.isLoadingPartenaires = false;
      }
    });
  }

  loadCandidatures(): void {
    this.isLoadingCandidatures = true;
    const projectId = this.data.project.id;
    
    if (!projectId) {
      this.candidatures = [];
      this.isLoadingCandidatures = false;
      return;
    }

    this.projectService.getCandidaturesByProject(projectId).subscribe({
      next: (candidatures: Candidature[]) => {
        this.candidatures = candidatures || [];
        this.isLoadingCandidatures = false;
        console.log('✅ Candidatures chargées:', this.candidatures.length);
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement candidatures:', err);
        this.candidatures = [];
        this.isLoadingCandidatures = false;
      }
    });
  }

  loadVolontairesAffectes(): void {
    this.isLoadingVolontaires = true;
    const projectId = this.data.project.id;
    
    if (!projectId) {
      this.volontairesAffectes = [];
      this.isLoadingVolontaires = false;
      return;
    }

    this.projectService.getVolontairesByProject(projectId).subscribe({
      next: (affectations: Affectation[]) => {
        this.volontairesAffectes = affectations || [];
        this.isLoadingVolontaires = false;
        console.log('✅ Volontaires affectés chargés:', this.volontairesAffectes.length);
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement volontaires affectés:', err);
        this.volontairesAffectes = [];
        this.isLoadingVolontaires = false;
      }
    });
  }

  loadVolontairesDisponibles(): void {
    this.projectService.getVolontairesDisponibles().subscribe({
      next: (volontaires: Volontaire[]) => {
        this.volontairesDisponibles = volontaires || [];
        console.log('✅ Volontaires disponibles chargés:', this.volontairesDisponibles.length);
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement volontaires disponibles:', err);
        this.volontairesDisponibles = [];
      }
    });
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  getPartenaireNom(partenaireId: number | undefined): string {
    if (!partenaireId) return 'Non spécifié';
    
    // Si le partenaire est déjà chargé dans l'objet project
    if (this.data.project.partenaire) {
      if (typeof this.data.project.partenaire === 'string') {
        return this.data.project.partenaire;
      }
      if (typeof this.data.project.partenaire === 'object') {
        return (this.data.project.partenaire as any).nomStructure || `Partenaire #${partenaireId}`;
      }
    }
    
    // Recherche dans la liste des partenaires chargés
    const partenaire = this.partenaires.find(p => p.id === partenaireId);
    
    if (partenaire) {
      return partenaire.nomStructure || `Partenaire #${partenaireId}`;
    }
    
    return `Partenaire #${partenaireId}`;
  }

  // ==================== GESTION DES STATUTS ====================

  // ✅ CORRECTION : Utiliser les 3 statuts simplifiés
  getStatusColor(status?: ProjectStatus): string {
    const statut = status || this.data.project.statutProjet;
    
    switch (statut) {
      case 'en_attente': return 'status-en-attente';
      case 'actif': return 'status-actif';
      case 'cloture': return 'status-cloture';
      default: return 'status-en-attente';
    }
  }

  // ✅ CORRECTION : Utiliser les 3 statuts simplifiés
  getStatusIcon(status?: ProjectStatus): string {
    const statut = status || this.data.project.statutProjet;
    
    switch (statut) {
      case 'en_attente': return 'schedule';
      case 'actif': return 'play_circle';
      case 'cloture': return 'check_circle';
      default: return 'help';
    }
  }

  getStatusLabel(status?: ProjectStatus): string {
    const statut = status || this.data.project.statutProjet;
    return ProjectWorkflow.getStatusLabel(statut);
  }

  // ==================== INFORMATIONS DU PROJET ====================

  getProjectTitle(): string {
    return this.data.project.titre || 'Titre non disponible';
  }

  getProjectDescription(): string {
    return this.data.project.descriptionLongue || 
           this.data.project.descriptionCourte || 
           'Aucune description disponible';
  }

  getProjectRegion(): string {
    return this.data.project.regionAffectation || 'Non spécifiée';
  }

  getNeededVolunteers(): number {
    return this.data.project.nombreVolontairesRequis || 0;
  }

  getCurrentVolunteers(): number {
    return this.data.project.nombreVolontairesActuels || 0;
  }

  getFormattedDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Non définie';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Date invalide';
    }
  }

  getStartDate(): string {
    return this.getFormattedDate(this.data.project.dateDebut);
  }

  getEndDate(): string {
    return this.getFormattedDate(this.data.project.dateFin);
  }

  // ==================== GESTION DES COMPÉTENCES ====================

  getCompetencesText(competences: string[] | string | undefined): string {
    if (!competences) return 'Aucune compétence spécifiée';
    
    if (Array.isArray(competences)) {
      return competences.length > 0 ? competences.join(', ') : 'Aucune compétence';
    }
    
    return competences || 'Aucune compétence spécifiée';
  }

  getProjectCompetences(): string[] {
    const competences = this.data.project.competences_requises;
    
    if (!competences) return [];
    
    if (Array.isArray(competences)) {
      return competences;
    }
    
    // Si c'est une string, la convertir en tableau
    if (typeof competences === 'string') {
      return competences.split(',').map(c => c.trim()).filter(c => c.length > 0);
    }
    
    return [];
  }

  hasProjectCompetences(): boolean {
    return this.getProjectCompetences().length > 0;
  }

  // ==================== GESTION DES VOLONTAIRES ====================

  affecterVolontaire(): void {
    if (!this.volontaireSelectionne || !this.data.project.id) {
      this.snackBar.open('Sélection invalide', 'Fermer', { duration: 3000 });
      return;
    }

    const projectId = this.data.project.id;
    const volontaireId = this.volontaireSelectionne;

    console.log('🚀 Affectation volontaire:', { projectId, volontaireId });

    this.projectService.affecterVolontaire(projectId, volontaireId).subscribe({
      next: () => {
        this.snackBar.open('Volontaire affecté avec succès', 'Fermer', { duration: 2000 });
        this.volontaireSelectionne = null;
        this.loadVolontairesAffectes();
        this.loadVolontairesDisponibles();
      },
      error: (err: any) => {
        console.error('❌ Erreur affectation volontaire:', err);
        this.snackBar.open('Erreur lors de l\'affectation du volontaire', 'Fermer', { duration: 3000 });
      }
    });
  }

  retirerVolontaire(affectationId: string | number): void {
    if (confirm('Êtes-vous sûr de vouloir retirer ce volontaire du projet ?')) {
      const id = typeof affectationId === 'string' ? parseInt(affectationId, 10) : affectationId;
      
      this.projectService.retirerVolontaire(this.data.project.id!, id).subscribe({
        next: () => {
          this.snackBar.open('Volontaire retiré du projet', 'Fermer', { duration: 2000 });
          this.loadVolontairesAffectes();
          this.loadVolontairesDisponibles();
        },
        error: (err: any) => {
          console.error('❌ Erreur retrait volontaire:', err);
          this.snackBar.open('Erreur lors du retrait du volontaire', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  estDejaAffecte(volontaireId: string | number | undefined): boolean {
    if (!volontaireId) return false;
    
    const idString = volontaireId.toString();
    return this.volontairesAffectes.some(affectation => 
      affectation.volontaire && affectation.volontaire.id?.toString() === idString
    );
  }

  getVolontairesManquants(): number {
    const requis = this.getNeededVolunteers();
    const affectes = this.volontairesAffectes.length;
    return Math.max(0, requis - affectes);
  }

  // ==================== GESTION DES CANDIDATURES ====================

  getCandidatureStatutClass(statut: string): string {
    switch (statut) {
      case 'en_attente': return 'statut-en-attente';
      case 'entretien': return 'statut-entretien';
      case 'acceptee': return 'statut-acceptee';
      case 'refusee': return 'statut-refusee';
      default: return 'statut-en-attente';
    }
  }

  getCandidatureStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'entretien': 'Entretien',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée'
    };
    return labels[statut] || statut;
  }

  // ==================== ACTIONS ====================

  onClose(): void {
    this.dialogRef.close();
  }
}