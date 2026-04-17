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
      console.error('❌ Aucun ID de projet dans l\'URL');
      this.error = true;
      this.loading = false;
      return;
    }

    console.log('🔍 Chargement du projet avec ID:', id);
    this.loading = true;
    
    this.projectService.getProject(id).subscribe({
      next: (projet) => {
        console.log('✅ Projet chargé:', projet);
        this.projet = projet;
        this.loadCandidatures();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement projet:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  loadCandidatures(): void {
    if (!this.projet?.id) {
      console.log('⚠️ Impossible de charger les candidatures: pas d\'ID de projet');
      return;
    }

    this.candidatureService.getByProject(this.projet.id).subscribe({
      next: (candidatures) => {
        console.log('✅ Candidatures chargées:', candidatures.length);
        this.candidatures = candidatures;
        this.findUserCandidature();
      },
      error: (error) => {
        console.error('❌ Erreur chargement candidatures:', error);
      }
    });
  }

  findUserCandidature(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.email || !this.candidatures.length) {
      console.log('ℹ️ Pas de candidature utilisateur trouvée');
      return;
    }

    this.userCandidature = this.candidatures.find(c => 
      c.email?.toLowerCase() === currentUser.email.toLowerCase()
    );

    if (this.userCandidature) {
      console.log('✅ Candidature utilisateur trouvée:', this.userCandidature.id);
    }
  }

  // ✅ Utilisation de ProjectWorkflow selon votre modèle
  getStatusLabel(status: string): string {
    return ProjectWorkflow.getStatusLabel(status as any);
  }

  // ✅ Ajout de la méthode pour obtenir la classe CSS du statut
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

  // ✅ Mise à jour selon votre nouveau modèle de statuts
  peutPostuler(): boolean {
    if (!this.projet) {
      console.log('❌ Impossible de postuler: pas de projet chargé');
      return false;
    }
    
    // Vérifier si le projet est actif
    if (this.projet.statutProjet !== 'actif') {
      console.log('❌ Impossible de postuler: projet non actif (statut:', this.projet.statutProjet, ')');
      return false;
    }
    
    // Vérifier si la date limite n'est pas dépassée
    if (this.projet.dateLimiteCandidature) {
      const deadline = new Date(this.projet.dateLimiteCandidature);
      const today = new Date();
      if (deadline < today) {
        console.log('❌ Impossible de postuler: date limite dépassée');
        return false;
      }
    }
    
    // Vérifier si l'utilisateur n'a pas déjà postulé
    if (this.aDejaPostule()) {
      console.log('ℹ️ Impossible de postuler: candidature déjà envoyée');
      return false;
    }
    
    // Vérifier si l'utilisateur est connecté
    const isLoggedIn = this.authService.isLoggedIn();
    if (!isLoggedIn) {
      console.log('❌ Impossible de postuler: utilisateur non connecté');
    }
    
    return isLoggedIn;
  }

  aDejaPostule(): boolean {
    return !!this.userCandidature;
  }

  // ✅ CORRECTION: Route correcte vers le formulaire de candidature
  postuler(): void {
    if (!this.projet || !this.peutPostuler()) {
      console.log('❌ Conditions non remplies pour postuler');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.log('⚠️ Utilisateur non connecté, redirection vers login');
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/features/candidats/details/${this.projet.id}` }
      });
      return;
    }

    // ✅ Route correcte vers le formulaire de candidature
    console.log('📝 Navigation vers le formulaire de candidature pour le projet:', this.projet.id);
    this.router.navigate(['/features/candidats/postuler', this.projet.id]);
  }

  goBack(): void {
    console.log('⬅️ Retour à la page précédente');
    this.location.back();
  }
}