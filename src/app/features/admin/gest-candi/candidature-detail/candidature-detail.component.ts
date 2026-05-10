import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Candidature } from '../../../models/candidature.model';
import { Project } from '../../../models/projects.model';
import { environment } from '../../../environment/environment';
import { CandidatureService } from '../../../services/service_candi/candidature.service';

@Component({
  selector: 'app-candidature-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatListModule,
    MatBadgeModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './candidature-detail.component.html',
  styleUrls: ['./candidature-detail.component.css']
})
export class CandidatureDetailComponent implements OnInit {
  project: Project | null = null;
  private backendBaseUrl = environment.apiUrl.replace('/api', '');

  // Contrat
  contratUrl: string | null = null;
  fichierContrat: File | null = null;
  uploadEnCours = false;

  // Évaluation entretien
  tentativeScore = 0;
  tentativeCommentaire = '';

  constructor(
    public dialogRef: MatDialogRef<CandidatureDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { candidature: Candidature, project?: Project },
    private candidatureService: CandidatureService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.project = this.data.project || null;
    this.contratUrl = this.data.candidature.contrat_url || null;
  }

  // ==================== CV ====================
  getCvFullUrl(): string {
    const cvUrl = this.data.candidature.cv_url;
    if (!cvUrl) return '#';
    if (cvUrl.startsWith('http')) return cvUrl;
    let cleanUrl = cvUrl.startsWith('/') ? cvUrl : '/' + cvUrl;
    return this.backendBaseUrl + cleanUrl;
  }

  voirCV(): void {
    const url = this.getCvFullUrl();
    if (url && url !== '#') {
      window.open(url, '_blank');
    }
  }

  telechargerCV(): void {
    const url = this.getCvFullUrl();
    if (url && url !== '#') {
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `CV_${this.data.candidature.nom}_${this.data.candidature.prenom}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        })
        .catch(error => console.error('Erreur téléchargement CV:', error));
    }
  }

  // ==================== CONTRAT ====================
  onFichierContratSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      if (file.type === 'application/pdf') {
        this.fichierContrat = file;
      } else {
        this.fichierContrat = null;
        alert('Seuls les fichiers PDF sont acceptés pour le contrat.');
      }
    }
  }

  uploaderContrat(): void {
    if (!this.fichierContrat) {
      alert('Veuillez sélectionner un fichier PDF.');
      return;
    }
    if (!this.data.candidature.id) {
      alert('Identifiant de candidature manquant.');
      return;
    }
    this.uploadEnCours = true;
    this.candidatureService.uploadContrat(this.data.candidature.id, this.fichierContrat)
      .subscribe({
        next: (result: { contrat_url: string }) => {
          this.contratUrl = result.contrat_url;
          this.data.candidature.contrat_url = result.contrat_url;
          this.fichierContrat = null;
          this.uploadEnCours = false;
          this.snackBar.open('Contrat uploadé avec succès', 'Fermer', { duration: 3000 });
        },
        error: (err: any) => {
          console.error('Erreur upload contrat:', err);
          alert('Erreur lors de l’upload du contrat. Veuillez réessayer.');
          this.uploadEnCours = false;
        }
      });
  }

  ouvrirContrat(): void {
    if (this.contratUrl) {
      const fullUrl = this.contratUrl.startsWith('http') ? this.contratUrl : this.backendBaseUrl + this.contratUrl;
      window.open(fullUrl, '_blank');
    }
  }

  telechargerContrat(): void {
    if (!this.contratUrl) return;
    const fullUrl = this.contratUrl.startsWith('http') ? this.contratUrl : this.backendBaseUrl + this.contratUrl;
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = `Contrat_${this.data.candidature.nom}_${this.data.candidature.prenom}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==================== ÉVALUATION ENTRETIEN ====================
  setScore(score: number): void {
    this.tentativeScore = score;
  }

  sauvegarderEvaluation(): void {
    if (this.tentativeScore < 1 || this.tentativeScore > 5) {
      this.snackBar.open('Veuillez sélectionner une note entre 1 et 5', 'Fermer', { duration: 3000 });
      return;
    }

    // Envoi de l'objet complet mis à jour
    const updatedCandidature = {
      ...this.data.candidature,
      scoreEntretien: this.tentativeScore,
      commentaireEntretien: this.tentativeCommentaire || ''
    };

    console.log('Envoi de l\'évaluation:', updatedCandidature);

    this.candidatureService.update(this.data.candidature.id!, updatedCandidature).subscribe({
      next: (c) => {
        this.data.candidature = c;
        this.contratUrl = c.contrat_url || null;
        this.tentativeScore = 0;
        this.tentativeCommentaire = '';
        this.snackBar.open('Évaluation enregistrée', 'Fermer', { duration: 3000 });
      },
      error: (err) => {
        console.error('Erreur mise à jour:', err);
        this.snackBar.open('Erreur lors de l’enregistrement', 'Fermer', { duration: 3000 });
      }
    });
  }

  // ==================== PROJET ====================
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

  // ==================== UTILITAIRES ====================
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