import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';

import { Project, ProjectWorkflow } from '../../models/projects.model';
import { ProjectService } from '../../services/service_projects/projects.service';
import { AuthService } from '../../services/service_auth/auth.service';
import { CandidatureService } from '../../services/service_candi/candidature.service';

@Component({
  selector: 'app-detail-projet-candidat',
  templateUrl: './detail-projet-candidat.component.html',
  styleUrls: ['./detail-projet-candidat.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class DetailProjetCandidatComponent implements OnInit {
  projet: Project | null = null;
  loading = true;
  error = false;
  candidatures: any[] = [];
  userCandidature: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private projectService: ProjectService,
    private candidatureService: CandidatureService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProjet();
  }

  loadProjet(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = true;
      this.loading = false;
      return;
    }

    this.loading = true;
    this.projectService.getProject(id).subscribe({
      next: (projet) => {
        this.projet = projet;
        this.loadCandidatures();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement projet:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  loadCandidatures(): void {
    if (!this.projet?.id) return;

    this.candidatureService.getByProject(this.projet.id).subscribe({
      next: (candidatures) => {
        this.candidatures = candidatures;
        this.findUserCandidature();
      },
      error: (error) => {
        console.error('Erreur chargement candidatures:', error);
      }
    });
  }

  findUserCandidature(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.email || !this.candidatures.length) return;

    this.userCandidature = this.candidatures.find(c => 
      c.email?.toLowerCase() === currentUser.email.toLowerCase()
    );
  }

  // ✅ CORRECTION : Utilisation de ProjectWorkflow selon votre modèle
  getStatusLabel(status: string): string {
    return ProjectWorkflow.getStatusLabel(status as any);
  }

  // ✅ CORRECTION : Ajout de la méthode pour obtenir la classe CSS du statut
  getStatusClass(status: string): string {
    return ProjectWorkflow.getStatusClass(status as any);
  }

  getCompetencesList(): string[] {
    if (!this.projet?.competences_requises) return [];
    
    if (Array.isArray(this.projet.competences_requises)) {
      return this.projet.competences_requises;
    }
    
    if (typeof this.projet.competences_requises === 'string') {
      return this.projet.competences_requises.split(',').map(c => c.trim()).filter(c => c.length > 0);
    }
    
    return [];
  }

  getDaysUntilDeadline(): number {
    if (!this.projet?.dateLimiteCandidature) return 0;
    
    const deadline = new Date(this.projet.dateLimiteCandidature);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  // ✅ CORRECTION : Mise à jour selon votre nouveau modèle de statuts
  peutPostuler(): boolean {
    if (!this.projet) return false;
    
    // Vérifier si le projet est actif (anciennement 'ouvert_aux_candidatures')
    if (this.projet.statutProjet !== 'actif') return false;
    
    // Vérifier si la date limite n'est pas dépassée
    if (this.projet.dateLimiteCandidature) {
      const deadline = new Date(this.projet.dateLimiteCandidature);
      const today = new Date();
      if (deadline < today) return false;
    }
    
    // Vérifier si l'utilisateur n'a pas déjà postulé
    if (this.aDejaPostule()) return false;
    
    // Vérifier si l'utilisateur est connecté
    return this.authService.isLoggedIn();
  }

  aDejaPostule(): boolean {
    return !!this.userCandidature;
  }

  postuler(): void {
    if (!this.projet || !this.peutPostuler()) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Rediriger vers le formulaire de candidature
    this.router.navigate(['/candidat/candidature', this.projet.id]);
  }

  goBack(): void {
    this.location.back();
  }
}