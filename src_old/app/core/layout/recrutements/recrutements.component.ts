// src/app/core/layout/recrutements/recrutements.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject, takeUntil } from 'rxjs';

import { Project, ProjectStatus, ProjectWorkflow } from '../../../features/models/projects.model';
import { ProjectService } from '../../../features/services/service_projects/projects.service';
import { AuthService } from '../../../features/services/service_auth/auth.service';

interface ProjetRecrutement {
  id?: number;
  titre: string;
  descriptionCourte?: string;
  descriptionLongue?: string;
  domaineActivite?: string;
  type_mission?: 'Education' | 'Santé' | 'Environnement' | 'Développement' | 'Urgence' | 'Autre';
  regionAffectation: string;
  ville_commune: string;
  nombreVolontairesRequis: number;
  nombreVolontairesActuels?: number;
  competences_requises?: string;
  avantagesVolontaire?: string;
  dateDebut: string;
  dateFin: string;
  dateLimiteCandidature: string;
  statutProjet: ProjectStatus;
  nombrePostesDisponibles: number;
  tauxRemplissage: number;
  estUrgent: boolean;
  joursRestants: number;
}

@Component({
  selector: 'app-recrutements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  templateUrl: './recrutements.component.html',
  styleUrls: ['./recrutements.component.scss']
})
export class RecrutementsComponent implements OnInit, OnDestroy {
  projetsRecrutement: ProjetRecrutement[] = [];
  projetsFiltres: ProjetRecrutement[] = [];
  
  searchQuery = '';
  selectedRegion = '';
  selectedDomaine = '';
  selectedType = '';
  afficherUrgentsUniquement = false;
  
  regions: string[] = [];
  domaines: string[] = [];
  typesMission: string[] = [];
  
  isLoading = true;
  isAuthenticated = false;
  currentUserId: number | null = null;
  
  stats = {
    totalProjets: 0,
    totalPostes: 0,
    projetsUrgents: 0,
    postesDisponibles: 0
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private projectService: ProjectService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('🎬 Initialisation RecrutementsComponent');
    this.checkAuthentication();
    this.loadProjetsRecrutement();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAuthentication(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: any) => {
          this.isAuthenticated = !!user;
          this.currentUserId = user?.id 
            ? (typeof user.id === 'string' ? parseInt(user.id, 10) : user.id)
            : null;
          
          console.log('✅ Statut authentification:', {
            authentifie: this.isAuthenticated,
            userId: this.currentUserId
          });
        },
        error: (error: any) => {
          console.error('❌ Erreur vérification authentification:', error);
          this.isAuthenticated = false;
        }
      });
  }

  loadProjetsRecrutement(): void {
    this.isLoading = true;
    
    this.projectService.getProjetsPublic()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projets: Project[]) => {
          console.log('📊 Projets publics reçus:', projets.length);
          
          const projetsRecrutant = projets.filter((projet: Project) => 
            this.projetEstEnRecrutement(projet)
          );
          
          console.log('👥 Projets en recrutement:', projetsRecrutant.length);
          
          this.projetsRecrutement = projetsRecrutant.map((projet: Project) => 
            this.enrichirProjetRecrutement(projet)
          );
          
          this.projetsRecrutement.sort((a, b) => {
            if (a.estUrgent !== b.estUrgent) {
              return a.estUrgent ? -1 : 1;
            }
            return a.tauxRemplissage - b.tauxRemplissage;
          });
          
          this.projetsFiltres = [...this.projetsRecrutement];
          this.extracterValeursUniques();
          this.calculerStatistiques();
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement projets recrutement:', error);
          this.snackBar.open(
            'Erreur lors du chargement des opportunités',
            'Fermer',
            { duration: 3000 }
          );
          this.isLoading = false;
        }
      });
  }

  private projetEstEnRecrutement(projet: Project): boolean {
    if (projet.statutProjet !== 'actif') {
      return false;
    }
    
    const volontairesRequis = projet.nombreVolontairesRequis || 0;
    const volontairesActuels = projet.nombreVolontairesActuels || 0;
    
    if (volontairesRequis <= volontairesActuels) {
      return false;
    }
    
    if (projet.dateLimiteCandidature) {
      const dateLimit = new Date(projet.dateLimiteCandidature);
      if (dateLimit < new Date()) {
        return false;
      }
    }
    
    return true;
  }

  private enrichirProjetRecrutement(projet: Project): ProjetRecrutement {
    const volontairesRequis = projet.nombreVolontairesRequis || 0;
    const volontairesActuels = projet.nombreVolontairesActuels || 0;
    const nombrePostesDisponibles = Math.max(0, volontairesRequis - volontairesActuels);
    
    const tauxRemplissage = volontairesRequis > 0 
      ? Math.round((volontairesActuels / volontairesRequis) * 100)
      : 0;
    
    let joursRestants = 0;
    let estUrgent = false;
    
    if (projet.dateLimiteCandidature) {
      const dateLimit = new Date(projet.dateLimiteCandidature);
      const aujourdhui = new Date();
      joursRestants = Math.ceil(
        (dateLimit.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      estUrgent = joursRestants <= 7 || tauxRemplissage < 30;
    }
    
    return {
      id: projet.id,
      titre: projet.titre,
      descriptionCourte: projet.descriptionCourte,
      descriptionLongue: projet.descriptionLongue,
      domaineActivite: projet.domaineActivite,
      type_mission: projet.type_mission,
      regionAffectation: projet.regionAffectation,
      ville_commune: projet.ville_commune,
      nombreVolontairesRequis: projet.nombreVolontairesRequis,
      nombreVolontairesActuels: projet.nombreVolontairesActuels,
      competences_requises: projet.competences_requises,
      avantagesVolontaire: projet.avantagesVolontaire,
      dateDebut: projet.dateDebut,
      dateFin: projet.dateFin,
      dateLimiteCandidature: projet.dateLimiteCandidature,
      statutProjet: projet.statutProjet,
      nombrePostesDisponibles,
      tauxRemplissage,
      estUrgent,
      joursRestants
    };
  }

  private extracterValeursUniques(): void {
    const regionsSet = new Set<string>();
    const domainesSet = new Set<string>();
    const typesSet = new Set<string>();
    
    this.projetsRecrutement.forEach(projet => {
      if (projet.regionAffectation) {
        regionsSet.add(projet.regionAffectation);
      }
      if (projet.domaineActivite) {
        domainesSet.add(projet.domaineActivite);
      }
      if (projet.type_mission) {
        typesSet.add(projet.type_mission);
      }
    });
    
    this.regions = Array.from(regionsSet).sort();
    this.domaines = Array.from(domainesSet).sort();
    this.typesMission = Array.from(typesSet).sort();
    
    console.log('🏷️ Filtres disponibles:', {
      regions: this.regions.length,
      domaines: this.domaines.length,
      types: this.typesMission.length
    });
  }

  private calculerStatistiques(): void {
    this.stats = {
      totalProjets: this.projetsRecrutement.length,
      totalPostes: this.projetsRecrutement.reduce(
        (sum, p) => sum + (p.nombreVolontairesRequis || 0), 
        0
      ),
      projetsUrgents: this.projetsRecrutement.filter(p => p.estUrgent).length,
      postesDisponibles: this.projetsRecrutement.reduce(
        (sum, p) => sum + p.nombrePostesDisponibles, 
        0
      )
    };
    
    console.log('📊 Statistiques:', this.stats);
  }

  appliquerFiltres(): void {
    let filtres = [...this.projetsRecrutement];
    
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtres = filtres.filter(projet =>
        projet.titre.toLowerCase().includes(query) ||
        projet.descriptionCourte?.toLowerCase().includes(query) ||
        projet.domaineActivite?.toLowerCase().includes(query)
      );
    }
    
    if (this.selectedRegion) {
      filtres = filtres.filter(projet => 
        projet.regionAffectation === this.selectedRegion
      );
    }
    
    if (this.selectedDomaine) {
      filtres = filtres.filter(projet => 
        projet.domaineActivite === this.selectedDomaine
      );
    }
    
    if (this.selectedType) {
      filtres = filtres.filter(projet => 
        projet.type_mission === this.selectedType
      );
    }
    
    if (this.afficherUrgentsUniquement) {
      filtres = filtres.filter(projet => projet.estUrgent);
    }
    
    this.projetsFiltres = filtres;
    
    console.log('🔍 Filtres appliqués:', {
      total: this.projetsRecrutement.length,
      filtres: this.projetsFiltres.length
    });
  }

  reinitialiserFiltres(): void {
    this.searchQuery = '';
    this.selectedRegion = '';
    this.selectedDomaine = '';
    this.selectedType = '';
    this.afficherUrgentsUniquement = false;
    this.appliquerFiltres();
  }

  postulerProjet(projet: ProjetRecrutement): void {
    if (!this.isAuthenticated) {
      this.snackBar.open(
        'Vous devez être connecté pour postuler',
        'Se connecter',
        { duration: 5000 }
      ).onAction().subscribe(() => {
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: `/recrutements/${projet.id}` }
        });
      });
      return;
    }
    
    this.router.navigate(['/projets', projet.id]);
  }

  voirDetails(projet: ProjetRecrutement): void {
    this.router.navigate(['/projets', projet.id]);
  }

  getUrgenceClass(projet: ProjetRecrutement): string {
    if (!projet.estUrgent) return '';
    
    if (projet.joursRestants <= 3) {
      return 'urgence-critique';
    } else if (projet.joursRestants <= 7) {
      return 'urgence-haute';
    } else if (projet.tauxRemplissage < 30) {
      return 'urgence-moyenne';
    }
    
    return '';
  }

  getUrgenceTexte(projet: ProjetRecrutement): string {
    if (projet.joursRestants <= 3) {
      return `Urgent - ${projet.joursRestants} jour${projet.joursRestants > 1 ? 's' : ''} restant${projet.joursRestants > 1 ? 's' : ''}`;
    } else if (projet.joursRestants <= 7) {
      return `${projet.joursRestants} jours restants`;
    } else if (projet.tauxRemplissage < 30) {
      return `Besoin urgent de volontaires`;
    }
    
    return '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  getProgressColor(tauxRemplissage: number): string {
    if (tauxRemplissage >= 75) return '#4caf50';
    if (tauxRemplissage >= 50) return '#ff9800';
    return '#f44336';
  }
}