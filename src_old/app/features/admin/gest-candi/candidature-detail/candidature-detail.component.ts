import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';

import { Candidature } from '../../../models/candidature.model';
import { Project } from '../../../models/projects.model';

@Component({
  selector: 'app-candidature-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatListModule,
    MatBadgeModule
  ],
  templateUrl: './candidature-detail.component.html',
  styleUrls: ['./candidature-detail.component.css']
})
export class CandidatureDetailComponent implements OnInit {
  project: Project | null = null;

  constructor(
    public dialogRef: MatDialogRef<CandidatureDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { candidature: Candidature, project?: Project }
  ) {}

  ngOnInit(): void {
    this.project = this.data.project || null;
  }

  getProjectTitle(): string {
    return this.project?.titre || 'Projet inconnu';
  }

  getProjectRegion(): string {
    return this.project?.regionAffectation || 'Non spécifiée';
  }

  getProjectStatus(): string {
    if (!this.project?.statutProjet) return 'Non spécifié';
    
    const statusMap: { [key: string]: string } = {
      'soumis': 'Soumis',
      'en_attente_validation': 'En attente de validation',
      'ouvert_aux_candidatures': 'Ouvert aux candidatures',
      'en_cours': 'En cours',
      'a_cloturer': 'À clôturer',
      'cloture': 'Clôturé'
    };
    
    return statusMap[this.project.statutProjet] || this.project.statutProjet;
  }

  getProjectDescription(): string {
    return this.project?.descriptionCourte || this.project?.descriptionLongue || 'Aucune description disponible';
  }

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    if (Array.isArray(competences)) return competences;
    if (typeof competences === 'string') return competences.split(',').map(c => c.trim());
    return [];
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'entretien': 'En entretien',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée'
    };
    return labels[statut] || statut;
  }

  getStatutClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'en_attente': 'statut-en-attente',
      'entretien': 'statut-entretien',
      'acceptee': 'statut-acceptee',
      'refusee': 'statut-refusee'
    };
    return classes[statut] || 'statut-default';
  }

  getNiveauExperienceLabel(niveau: string): string {
    const labels: { [key: string]: string } = {
      'debutant': 'Débutant',
      'intermediaire': 'Intermédiaire',
      'expert': 'Expert'
    };
    return labels[niveau] || niveau;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Non spécifiée';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}