import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ProjectService } from '../../../features/services/service_projects/projects.service';
import { AuthService } from '../../../features/services/service_auth/auth.service';
import { Project } from '../../../features/models/projects.model';

@Component({
  selector: 'app-detail-projet',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTabsModule
  ],
  templateUrl: './detail-projet.component.html',
  styleUrls: ['./detail-projet.component.scss']
})
export class DetailProjetComponent implements OnInit {
  project: Project | null = null;
  isLoading = true;
  errorMessage = '';
  isLoggedIn = false;
  userRole: string | null = null;
  canApply = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadProjectDetails();
  }

  private checkAuthStatus(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.userRole = this.authService.getUserRole();
  }

  private loadProjectDetails(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    
    if (!projectId) {
      this.errorMessage = 'ID du projet manquant';
      this.isLoading = false;
      return;
    }

    this.projectService.getProject(projectId).subscribe({
      next: (project) => {
        this.project = project;
        this.canApply = this.projectService.canApplyToProject(project);
        this.isLoading = false;
        console.log('✅ Projet chargé:', project);
      },
      error: (error) => {
        console.error('❌ Erreur chargement projet:', error);
        this.errorMessage = 'Impossible de charger les détails du projet';
        this.isLoading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'actif': 'status-active',
      'en_attente': 'status-pending',
      'cloture': 'status-closed'
    };
    return classes[status] || 'status-default';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'actif': 'check_circle',
      'en_attente': 'schedule',
      'cloture': 'cancel'
    };
    return icons[status] || 'help';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'actif': 'Actif - Recrutement en cours',
      'en_attente': 'En attente de validation',
      'cloture': 'Clôturé'
    };
    return labels[status] || status;
  }

  getDomainIcon(domain: string): string {
    const icons: { [key: string]: string } = {
      'Education': 'school',
      'Santé': 'local_hospital',
      'Environnement': 'nature',
      'Développement': 'trending_up',
      'Urgence': 'emergency',
      'Autre': 'work'
    };
    return icons[domain] || 'work';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Non définie';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  }

  getDaysRemaining(dateString: string | undefined): number | null {
    if (!dateString) return null;
    try {
      const deadline = new Date(dateString);
      const today = new Date();
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return null;
    }
  }

  getUrgencyClass(days: number | null): string {
    if (days === null) return '';
    if (days <= 7) return 'urgent';
    if (days <= 14) return 'moderate';
    return 'normal';
  }

  getCompetences(): string[] {
    if (!this.project?.competences_requises) return [];
    return this.project.competences_requises
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
  }

  getAvantages(): string[] {
    if (!this.project?.avantagesVolontaire) return [];
    return this.project.avantagesVolontaire
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0);
  }

  applyToProject(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    if (!this.project?.id) return;

    // Rediriger vers la page de candidature
    this.router.navigate(['/features/candidatures/postuler', this.project.id]);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  shareProject(): void {
    if (navigator.share) {
      navigator.share({
        title: this.project?.titre,
        text: this.project?.descriptionCourte,
        url: window.location.href
      }).catch(err => console.log('Erreur partage:', err));
    } else {
      // Copier le lien dans le presse-papier
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papier !');
    }
  }

  getProjectDuration(): string {
    if (!this.project?.dateDebut || !this.project?.dateFin) {
      return 'Durée non spécifiée';
    }

    try {
      const start = new Date(this.project.dateDebut);
      const end = new Date(this.project.dateFin);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 30) {
        return `${diffDays} jours`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} mois`;
      } else {
        const years = Math.floor(diffDays / 365);
        const remainingMonths = Math.floor((diffDays % 365) / 30);
        return remainingMonths > 0 
          ? `${years} an${years > 1 ? 's' : ''} et ${remainingMonths} mois`
          : `${years} an${years > 1 ? 's' : ''}`;
      }
    } catch {
      return 'Durée non calculable';
    }
  }
}