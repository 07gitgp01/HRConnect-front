// src/app/features/partenaires/candidatures-recues/detail-candidature-modal/detail-candidature-modal.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-detail-candidature-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule
  ],
  template: `
    <div class="modal-header">
      <h2 mat-dialog-title>Détails de la Candidature</h2>
      <button mat-icon-button (click)="onClose()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="mat-typography">
      <div class="row">
        <!-- Informations du candidat -->
        <div class="col-md-6">
          <mat-card class="mb-3">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="me-2">person</mat-icon>
                Informations du Candidat
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-item">
                <strong>Nom complet:</strong>
                <span>{{ data.candidature.prenom }} {{ data.candidature.nom }}</span>
              </div>
              <div class="info-item">
                <strong>Email:</strong>
                <span>{{ data.candidature.email }}</span>
              </div>
              <div *ngIf="data.candidature.telephone" class="info-item">
                <strong>Téléphone:</strong>
                <span>{{ data.candidature.telephone }}</span>
              </div>
              <div *ngIf="data.candidature.niveau_experience" class="info-item">
                <strong>Niveau d'expérience:</strong>
                <span>{{ getExperienceLabel(data.candidature.niveau_experience) }}</span>
              </div>
              <div *ngIf="data.candidature.disponibilite" class="info-item">
                <strong>Disponibilité:</strong>
                <span>{{ data.candidature.disponibilite }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Informations du projet -->
        <div class="col-md-6">
          <mat-card class="mb-3">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="me-2">work</mat-icon>
                Informations du Projet
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-item">
                <strong>Projet:</strong>
                <span>{{ data.candidature.projetTitre }}</span>
              </div>
              <div class="info-item">
                <strong>Région:</strong>
                <span>{{ data.candidature.projetRegion }}</span>
              </div>
              <div class="info-item">
                <strong>Poste visé:</strong>
                <span>{{ data.candidature.poste_vise }}</span>
              </div>
              <div class="info-item">
                <strong>Statut du projet:</strong>
                <span>{{ data.candidature.projetStatut }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Compétences -->
      <div *ngIf="data.candidature.competences" class="row">
        <div class="col-12">
          <mat-card class="mb-3">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="me-2">build</mat-icon>
                Compétences
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="competences-list">
                <mat-chip *ngFor="let competence of getCompetencesArray()" 
                         color="primary" selected>
                  {{ competence }}
                </mat-chip>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Lettre de motivation -->
      <div *ngIf="data.candidature.lettre_motivation" class="row">
        <div class="col-12">
          <mat-card class="mb-3">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="me-2">description</mat-icon>
                Lettre de Motivation
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="lettre-motivation">
                {{ data.candidature.lettre_motivation }}
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Notes internes -->
      <div *ngIf="data.candidature.notes_interne" class="row">
        <div class="col-12">
          <mat-card class="mb-3">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="me-2">note</mat-icon>
                Notes Internes
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="notes-internes">
                {{ data.candidature.notes_interne }}
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Informations de suivi -->
      <div class="row">
        <div class="col-12">
          <mat-card>
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="me-2">history</mat-icon>
                Suivi de la Candidature
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="row">
                <div class="col-md-6">
                  <div class="info-item">
                    <strong>Statut:</strong>
                    <span [class]="'status-badge ' + getStatutBadgeClass(data.candidature.statut)">
                      {{ getStatutLabel(data.candidature.statut) }}
                    </span>
                  </div>
                  <div class="info-item">
                    <strong>Date de réception:</strong>
                    <span>{{ data.candidature.cree_le | date:'dd/MM/yyyy à HH:mm' }}</span>
                  </div>
                </div>
                <div class="col-md-6">
                  <div *ngIf="data.candidature.date_entretien" class="info-item">
                    <strong>Date d'entretien:</strong>
                    <span class="text-primary">{{ data.candidature.date_entretien | date:'dd/MM/yyyy à HH:mm' }}</span>
                  </div>
                  <div *ngIf="data.candidature.mis_a_jour_le" class="info-item">
                    <strong>Dernière mise à jour:</strong>
                    <span>{{ data.candidature.mis_a_jour_le | date:'dd/MM/yyyy à HH:mm' }}</span>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">Fermer</button>
      <button *ngIf="data.candidature.cv_url" 
              mat-raised-button 
              color="primary"
              (click)="telechargerCV()">
        <mat-icon>description</mat-icon>
        Télécharger le CV
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px 0;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .info-item:last-child {
      border-bottom: none;
    }

    .info-item strong {
      color: #666;
      min-width: 150px;
    }

    .competences-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .lettre-motivation, .notes-internes {
      white-space: pre-wrap;
      line-height: 1.6;
      padding: 8px;
      background-color: #f8f9fa;
      border-radius: 4px;
      border-left: 4px solid #007bff;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .badge-en-attente {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .badge-entretien {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .badge-acceptee {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .badge-refusee {
      background-color: #ffebee;
      color: #c62828;
    }

    mat-card {
      margin-bottom: 16px;
    }

    mat-card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      font-size: 1.1rem;
      margin: 0;
    }
  `]
})
export class DetailCandidatureModalComponent {
  constructor(
    public dialogRef: MatDialogRef<DetailCandidatureModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { candidature: any }
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  telechargerCV(): void {
    if (this.data.candidature.cv_url) {
      window.open(this.data.candidature.cv_url, '_blank');
    }
  }

  getStatutBadgeClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'en_attente': 'badge-en-attente',
      'entretien': 'badge-entretien',
      'acceptee': 'badge-acceptee',
      'refusee': 'badge-refusee'
    };
    return classes[statut] || 'badge-en-attente';
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'entretien': 'Entretien',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée'
    };
    return labels[statut] || statut;
  }

  getExperienceLabel(niveau: string): string {
    const labels: { [key: string]: string } = {
      'debutant': 'Débutant',
      'intermediaire': 'Intermédiaire',
      'expert': 'Expert'
    };
    return labels[niveau] || niveau;
  }

  getCompetencesArray(): string[] {
    if (!this.data.candidature.competences) return [];
    
    if (Array.isArray(this.data.candidature.competences)) {
      return this.data.candidature.competences;
    }
    
    if (typeof this.data.candidature.competences === 'string') {
      return this.data.candidature.competences.split(',').map((c: string) => c.trim());
    }
    
    return [];
  }
}