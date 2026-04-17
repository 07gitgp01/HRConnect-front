// src/app/core/layout/home/home.component.ts

import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../../features/services/service_auth/auth.service';
import { ProjectService } from '../../../features/services/service_projects/projects.service';

interface Domain {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  projectsCount: number;
  volunteers: number;
  category: string;
  imageUrl: string;
}

interface CarouselSlide {
  image: string;
  title: string;
  description: string;
  primaryButton: { text: string; link: string };
  secondaryButton: { text: string; link: string };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  // Signaux pour la gestion d'état
  featuredProjects = signal<any[]>([]);
  isLoadingProjects = signal<boolean>(true);
  loadError = signal<boolean>(false);
  stats = signal<any>({});
  
  // COMPTEUR DES MISSIONS ACTIVES ET OUVERTES
  activeProjectsCount = signal<number>(0);
  totalProjectsCount = signal<number>(0);

  // Domaines d'intervention
  domains: Domain[] = [];
  
  // Hero Carousel properties
  currentHeroSlide = 0;
  carouselSlides: CarouselSlide[] = [];
  private heroSlideInterval: any;
  private loadTimeout: any;

  // Computed signals pour l'authentification
  isLoggedIn = computed(() => this.authService.isLoggedIn());
  userRole = computed(() => this.authService.getUserRole() || 'visiteur');

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🏠 HomeComponent initialisé');
    
    this.featuredProjects.set([]);
    
    setTimeout(() => {
      this.loadFeaturedProjects();
    }, 100);
    
    this.loadDomainsData();
    this.loadStats();
    this.initializeHeroCarousel();
    this.startHeroAutoSlide();
  }

  ngOnDestroy(): void {
    if (this.heroSlideInterval) {
      clearInterval(this.heroSlideInterval);
    }
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
  }

  // ==================== HERO CAROUSEL METHODS ====================
  private initializeHeroCarousel(): void {
    this.carouselSlides = [
      {
        image: 'assets/1.webp',
        title: 'Programme National de Volontariat',
        description: 'Rejoignez le mouvement citoyen pour le développement du Burkina Faso',
        primaryButton: { text: 'Devenir Volontaire', link: '/signup' },
        secondaryButton: { text: 'Découvrir les Missions', link: '/features/admin/projets' }
      },
      {
        image: 'assets/2.jpg',
        title: 'Engagez-vous pour Votre Nation',
        description: 'Participez à des projets qui transforment les communautés',
        primaryButton: { text: 'Commencer l\'Aventure', link: '/signup' },
        secondaryButton: { text: 'En Savoir Plus', link: '/login' }
      },
      {
        image: 'assets/3.png',
        title: 'Faites la Différence',
        description: 'Des milliers de volontaires nous font déjà confiance',
        primaryButton: { text: 'Postuler Maintenant', link: '/signup' },
        secondaryButton: { text: 'Nous Contacter', link: '/contact' }
      }
    ];
  }

  private startHeroAutoSlide(): void {
    this.heroSlideInterval = setInterval(() => {
      this.nextHeroSlide();
    }, 4000);
  }

  nextHeroSlide(): void {
    this.currentHeroSlide = (this.currentHeroSlide + 1) % this.carouselSlides.length;
    this.restartHeroAutoSlide();
  }

  prevHeroSlide(): void {
    this.currentHeroSlide = (this.currentHeroSlide - 1 + this.carouselSlides.length) % this.carouselSlides.length;
    this.restartHeroAutoSlide();
  }

  goToHeroSlide(index: number): void {
    this.currentHeroSlide = index;
    this.restartHeroAutoSlide();
  }

  private restartHeroAutoSlide(): void {
    if (this.heroSlideInterval) {
      clearInterval(this.heroSlideInterval);
    }
    this.startHeroAutoSlide();
  }

  // ==================== DOMAINES D'INTERVENTION ====================
  private loadDomainsData(): void {
    this.domains = [
      {
        id: 1,
        name: 'Éducation & Formation',
        description: 'Programmes éducatifs et formations professionnelles',
        icon: '🎓',
        color: '#008124',
        projectsCount: 15,
        volunteers: 120,
        category: 'education',
        imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop&crop=center'
      },
      {
        id: 2,
        name: 'Environnement & Développement Durable',
        description: 'Protection de l\'environnement et développement durable',
        icon: '🌱',
        color: '#2E7D32',
        projectsCount: 12,
        volunteers: 85,
        category: 'environment',
        imageUrl: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&h=400&fit=crop&crop=center'
      },
      {
        id: 3,
        name: 'Santé & Bien-être',
        description: 'Campagnes de santé publique et accès aux soins',
        icon: '⚕️',
        color: '#1976D2',
        projectsCount: 8,
        volunteers: 65,
        category: 'health',
        imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=400&fit=crop&crop=center'
      },
      {
        id: 4,
        name: 'Agriculture & Sécurité Alimentaire',
        description: 'Soutien aux agriculteurs et sécurité alimentaire',
        icon: '🌾',
        color: '#F57C00',
        projectsCount: 10,
        volunteers: 95,
        category: 'agriculture',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop'
      },
      {
        id: 5,
        name: 'Technologie & Innovation',
        description: 'Formation numérique et projets innovants',
        icon: '💻',
        color: '#7B1FA2',
        projectsCount: 7,
        volunteers: 45,
        category: 'technology',
        imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop&crop=center'
      },
      {
        id: 6,
        name: 'Développement Communautaire',
        description: 'Projets de développement local',
        icon: '🏘️',
        color: '#5D4037',
        projectsCount: 18,
        volunteers: 150,
        category: 'community',
        imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=600&h=400&fit=crop&crop=center'
      }
    ];
  }

  // ==================== CHARGEMENT DES PROJETS ====================
  loadFeaturedProjects(): void {
    console.log('🔄 Début chargement des projets en recrutement...');
    this.isLoadingProjects.set(true);
    this.loadError.set(false);

    this.loadTimeout = setTimeout(() => {
      console.log('⏱️ Timeout: Arrêt forcé du chargement après 8 secondes');
      this.featuredProjects.set([]);
      this.isLoadingProjects.set(false);
      this.loadError.set(false);
    }, 8000);

    this.projectService.getAllProjectsWithStats().subscribe({
      next: (projectsWithStats: any[]) => {
        if (this.loadTimeout) {
          clearTimeout(this.loadTimeout);
        }

        console.log('📊 PROJETS REÇUS:', projectsWithStats?.length || 0);
        
        let openProjects: any[] = [];
        
        if (projectsWithStats && projectsWithStats.length > 0) {
          const aujourdhui = new Date();
          aujourdhui.setHours(0, 0, 0, 0);
          
          // ✅ Filtrer les projets actifs ET avec date limite de candidature non dépassée
          openProjects = projectsWithStats.filter(project => {
            const status = project.status || project.statutProjet || '';
            const statusNormalized = status.toString().toLowerCase().trim();
            
            // Vérifier que le projet est actif
            if (statusNormalized !== 'actif') return false;
            
            // Vérifier la date limite de candidature
            const dateLimite = project.dateLimiteCandidature || project.applicationDeadline;
            if (!dateLimite) return true; // Si pas de date limite, on considère comme ouvert
            
            try {
              const dateLimiteObj = new Date(dateLimite);
              dateLimiteObj.setHours(0, 0, 0, 0);
              // ✅ La date limite doit être aujourd'hui ou dans le futur
              return dateLimiteObj >= aujourdhui;
            } catch {
              return true;
            }
          });
          
          this.activeProjectsCount.set(openProjects.length);
          this.totalProjectsCount.set(projectsWithStats.length);
          
          console.log(`✅ ${openProjects.length} projets actifs et ouverts aux candidatures trouvés`);
          console.log(`❌ ${projectsWithStats.filter((p: any) => {
            const status = p.status || p.statutProjet || '';
            return status.toString().toLowerCase().trim() === 'actif';
          }).length - openProjects.length} projets actifs mais avec date limite dépassée`);
          
          // ✅ Filtrer pour la grille : max 6 missions
          this.featuredProjects.set(openProjects.slice(0, 6));
        }
        
        console.log('🎯 PROJETS AFFICHÉS DANS LA GRILLE:', this.featuredProjects().length);
        
        this.isLoadingProjects.set(false);
      },
      error: (error: any) => {
        if (this.loadTimeout) {
          clearTimeout(this.loadTimeout);
        }
        
        console.error('❌ ERREUR chargement projets:', error);
        this.featuredProjects.set([]);
        this.loadError.set(true);
        this.isLoadingProjects.set(false);
      }
    });
  }

  loadStats(): void {
    this.stats.set({
      projectsCompleted: 245,
      regionsCovered: 11,
      totalVolunteers: 12500,
      activeProjects: 89
    });
  }

  // ==================== MÉTHODES UTILITAIRES ====================
  getDefaultImage(): string {
    return 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=600&h=400&fit=crop';
  }

  handleImageError(event: any): void {
    event.target.src = this.getDefaultImage();
  }

  getStatusIcon(status: string): string {
    const statusIcons: { [key: string]: string } = {
      'en_attente': 'schedule',
      'actif': 'check_circle',
      'cloture': 'cancel'
    };
    return statusIcons[status] || 'help';
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'actif': 'Actif',
      'cloture': 'Clôturé'
    };
    return statusLabels[status] || status;
  }

  getRequiredVolunteersDisplay(project: any): number {
    return project.nombreVolontairesRequis || project.neededVolunteers || 0;
  }

  canApplyToProject(project: any): boolean {
    const status = (project.status || project.statutProjet || '').toString().toLowerCase().trim();
    if (status !== 'actif') return false;
    
    // ✅ Vérifier aussi que la date limite n'est pas dépassée
    const dateLimite = project.dateLimiteCandidature || project.applicationDeadline;
    if (!dateLimite) return true;
    
    try {
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      const dateLimiteObj = new Date(dateLimite);
      dateLimiteObj.setHours(0, 0, 0, 0);
      return dateLimiteObj >= aujourdhui;
    } catch {
      return true;
    }
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
      today.setHours(0, 0, 0, 0);
      deadline.setHours(0, 0, 0, 0);
      
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // ✅ Ne retourner que les jours restants positifs
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return null;
    }
  }

  getUrgencyClass(days: number | null): string {
    if (days === null) return '';
    if (days <= 3) return 'mission-urgent';
    if (days <= 7) return 'mission-moderate';
    return '';
  }

  // ==================== NAVIGATION ====================
  viewProjectDetails(projectId: number): void {
    if (!projectId) {
      console.error('❌ ID du projet manquant');
      return;
    }
    this.router.navigate(['/detail', projectId]);
  }

  applyToProject(project: any): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/detail/${project.id}` }
      });
      return;
    }
    this.viewProjectDetails(project.id);
  }

  exploreDomain(domain: Domain): void {
    this.router.navigate(['/features/admin/projets'], { 
      queryParams: { category: domain.category }
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  voirToutesLesMissions(): void {
    this.router.navigate(['/recrutements']);
  }
}