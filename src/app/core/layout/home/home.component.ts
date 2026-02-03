// src/app/core/layout/home/home.component.ts
import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    MatProgressSpinnerModule
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
  totalProjectsCount = signal<number>(0);

  // Domaines d'intervention
  domains: Domain[] = [];
  
  // Carousel properties
  currentSlide = 0;
  carouselSlides: CarouselSlide[] = [];
  private autoSlideInterval: any;
  private loadTimeout: any; // Timeout pour éviter le blocage

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
    
    // Initialiser avec un tableau vide
    this.featuredProjects.set([]);
    
    // Charger les projets avec un délai pour éviter les conflits
    setTimeout(() => {
      this.loadFeaturedProjects();
    }, 100);
    
    this.loadDomainsData();
    this.loadStats();
    this.initializeCarousel();
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
  }

  // ==================== CAROUSEL METHODS ====================
  private initializeCarousel(): void {
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

  private startAutoSlide(): void {
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, 4000);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.carouselSlides.length;
    this.restartAutoSlide();
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.carouselSlides.length) % this.carouselSlides.length;
    this.restartAutoSlide();
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.restartAutoSlide();
  }

  private restartAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
    this.startAutoSlide();
  }

  // ==================== DOMAINES D'INTERVENTION ====================
  private loadDomainsData(): void {
    this.domains = [
      {
        id: 1,
        name: 'Éducation & Formation',
        description: 'Programmes éducatifs et formations professionnelles pour la jeunesse burkinabè',
        icon: '🎓',
        color: '#4CAF50',
        projectsCount: 15,
        volunteers: 120,
        category: 'education',
        imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop&crop=center'
      },
      {
        id: 2,
        name: 'Environnement & Développement Durable',
        description: 'Protection de l\'environnement et projets de développement durable',
        icon: '🌱',
        color: '#2196F3',
        projectsCount: 12,
        volunteers: 85,
        category: 'environment',
        imageUrl: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&h=400&fit=crop&crop=center'
      },
      {
        id: 3,
        name: 'Santé & Bien-être',
        description: 'Campagnes de santé publique et accès aux soins médicaux',
        icon: '⚕️',
        color: '#F44336',
        projectsCount: 8,
        volunteers: 65,
        category: 'health',
        imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=400&fit=crop&crop=center'
      },
      {
        id: 4,
        name: 'Agriculture & Sécurité Alimentaire',
        description: 'Soutien aux agriculteurs et programmes de sécurité alimentaire',
        icon: '🌾',
        color: '#FF9800',
        projectsCount: 10,
        volunteers: 95,
        category: 'agriculture',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop'
      },
      {
        id: 5,
        name: 'Technologie & Innovation',
        description: 'Formation numérique et projets innovants pour le développement',
        icon: '💻',
        color: '#9C27B0',
        projectsCount: 7,
        volunteers: 45,
        category: 'technology',
        imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop&crop=center'
      },
      {
        id: 6,
        name: 'Développement Communautaire',
        description: 'Projets de développement local et renforcement des communautés',
        icon: '🏘️',
        color: '#795548',
        projectsCount: 18,
        volunteers: 150,
        category: 'community',
        imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=600&h=400&fit=crop&crop=center'
      }
    ];
  }

  // ==================== GESTION DES PROJETS - SIMPLIFIÉE ====================
  loadFeaturedProjects(): void {
    this.isLoadingProjects.set(true);
    this.loadError.set(false);

    // Timeout de sécurité pour éviter le blocage infini
    this.loadTimeout = setTimeout(() => {
      console.log('⏱️ Timeout: Arrêt forcé du chargement');
      this.featuredProjects.set([]);
      this.isLoadingProjects.set(false);
      this.loadError.set(false);
    }, 8000); // 8 secondes max

    this.projectService.getAllProjectsWithStats().subscribe({
      next: (projectsWithStats: any[]) => {
        // Clear le timeout
        if (this.loadTimeout) {
          clearTimeout(this.loadTimeout);
        }

        console.log('📊 PROJETS REÇUS:', projectsWithStats?.length || 0);
        
        let filteredProjects: any[] = [];
        
        if (projectsWithStats && projectsWithStats.length > 0) {
          // Logique simplifiée de filtrage
          filteredProjects = projectsWithStats
            .filter(project => {
              // Vérifier si le projet est actif
              const isActive = this.estProjetEnCours(project.status);
              if (!isActive) return false;
              
              // Vérifier les volontaires
              const needed = project.neededVolunteers || 0;
              const current = this.getCurrentVolunteersCount(project);
              const hasMissingVolunteers = needed > current;
              
              return hasMissingVolunteers && needed > 0;
            })
            .slice(0, 6); // Limiter à 6 projets max
        }
        
        console.log('🎯 PROJETS URGENTS TROUVÉS:', filteredProjects.length);
        this.featuredProjects.set(filteredProjects);
        this.totalProjectsCount.set(projectsWithStats?.length || 0);
        this.isLoadingProjects.set(false);
      },
      error: (error: any) => {
        // Clear le timeout
        if (this.loadTimeout) {
          clearTimeout(this.loadTimeout);
        }
        
        console.error('❌ ERREUR chargement projets:', error);
        this.featuredProjects.set([]); // Assure que c'est vide
        this.loadError.set(true);
        this.isLoadingProjects.set(false);
      },
      complete: () => {
        // S'assurer que le chargement est arrêté
        this.isLoadingProjects.set(false);
      }
    });
  }

  private estProjetEligible(project: any): boolean {
    const statutValide = this.estProjetEnCours(project.status);
    const neededVolunteers = project.neededVolunteers || 0;
    const currentVolunteers = this.getCurrentVolunteersCount(project);
    const missingVolunteers = neededVolunteers - currentVolunteers;
    
    return statutValide && missingVolunteers > 0 && neededVolunteers > 0;
  }

  private estProjetEnCours(statut: string): boolean {
    if (!statut) return false;
    
    const statutsEnCours = [
      'en cours', 'active', 'planifié', 'soumis', 'pending', 
      'en_cours', 'actif', 'ouvert', 'open', 'progress', 'in_progress',
      'en cours de recrutement', 'recrutement'
    ];
    
    const statutNormalise = statut.toString().toLowerCase().trim();
    return statutsEnCours.includes(statutNormalise);
  }

  private getCurrentVolunteersCount(project: any): number {
    if (project.volunteersStats) {
      return project.volunteersStats.accepted || 0;
    }
    
    if (Array.isArray(project.volunteers)) {
      return project.volunteers.length;
    }
    if (Array.isArray(project.volontaires)) {
      return project.volontaires.length;
    }
    if (typeof project.currentVolunteers === 'number') {
      return project.currentVolunteers;
    }
    if (typeof project.volontairesAffectes === 'number') {
      return project.volontairesAffectes;
    }
    if (typeof project.assignedVolunteers === 'number') {
      return project.assignedVolunteers;
    }
    
    return 0;
  }

  private calculerVolontairesManquants(project: any): number {
    const volontairesAffectes = this.getCurrentVolunteersCount(project);
    const volontairesNecessaires = project.neededVolunteers || 0;
    return Math.max(0, volontairesNecessaires - volontairesAffectes);
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
  getMissionImage(project: any, index: number): string {
    const missionImages = [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1584467735871-8db9ac8e5e3a?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1559027615-cfa46a63d32f?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=400&h=250&fit=crop'
    ];
    return missionImages[index % missionImages.length];
  }

  getDefaultImage(): string {
    return 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=600&h=400&fit=crop';
  }

  handleImageError(event: any): void {
    event.target.src = this.getDefaultImage();
  }

  getStatusIcon(status: string): string {
    const statusIcons: { [key: string]: string } = {
      'active': 'play_circle',
      'completed': 'check_circle',
      'pending': 'schedule',
      'soumis': 'pending_actions',
      'planifié': 'event',
      'en cours': 'play_circle',
      'clôturé': 'check_circle',
      'en retard': 'warning',
      'en_cours': 'play_circle',
      'actif': 'play_circle',
      'ouvert': 'play_circle',
      'open': 'play_circle'
    };
    return statusIcons[status] || 'help';
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'active': 'En cours',
      'completed': 'Terminé',
      'pending': 'En attente',
      'soumis': 'Soumis',
      'planifié': 'Planifié',
      'en cours': 'En cours',
      'clôturé': 'Clôturé',
      'en retard': 'En retard',
      'en_cours': 'En cours',
      'actif': 'Actif',
      'ouvert': 'Ouvert',
      'open': 'Ouvert'
    };
    return statusLabels[status] || status;
  }

  getVolontairesManquants(project: any): number {
    return this.calculerVolontairesManquants(project);
  }

  getPourcentageCompletion(project: any): number {
    if (project.volunteersStats) {
      return project.volunteersStats.completionRate || 0;
    }
    
    const volontairesAffectes = this.getCurrentVolunteersCount(project);
    const volontairesNecessaires = project.neededVolunteers || 1;
    return Math.min(100, Math.round((volontairesAffectes / volontairesNecessaires) * 100));
  }

  getCurrentVolunteersDisplay(project: any): number {
    return this.getCurrentVolunteersCount(project);
  }

  getRequiredVolunteersDisplay(project: any): number {
    return project.neededVolunteers || 0;
  }

  canApplyToProject(project: any): boolean {
    const allowedStatuses = [
      'active', 'soumis', 'planifié', 'pending', 
      'en cours', 'en_cours', 'actif', 'ouvert', 'open'
    ];
    return allowedStatuses.includes(project.status);
  }

  // ==================== MÉTHODES POUR LA BARRE DE PROGRESSION ====================
  getProgressBarClass(project: any): string {
    const percentage = this.getPourcentageCompletion(project);
    
    if (percentage === 0) return 'progress-bar';
    if (percentage < 25) return 'progress-bar low';
    if (percentage < 50) return 'progress-bar medium';
    if (percentage < 75) return 'progress-bar high';
    if (percentage < 100) return 'progress-bar high';
    return 'progress-bar complete';
  }

  getTransitionDuration(project: any): string {
    const percentage = this.getPourcentageCompletion(project);
    
    if (percentage > 50) return '1.5s';
    if (percentage > 25) return '1.2s';
    return '0.8s';
  }

  getProgressStatusText(project: any): string {
    const percentage = this.getPourcentageCompletion(project);
    const missing = this.getVolontairesManquants(project);
    
    if (percentage === 0) return 'Aucun volontaire engagé';
    if (percentage < 25) return 'Début de recrutement';
    if (percentage < 50) return 'Recrutement en cours';
    if (percentage < 75) return 'Recrutement avancé';
    if (percentage < 100) return 'Presque complet';
    return 'Mission complète !';
  }

  getProgressColor(project: any): string {
    const percentage = this.getPourcentageCompletion(project);
    
    if (percentage === 0) return '#9e9e9e';
    if (percentage < 25) return '#ff9800';
    if (percentage < 50) return '#ffc107';
    if (percentage < 75) return '#4CAF50';
    if (percentage < 100) return '#2196F3';
    return '#673ab7';
  }

  getProgressGradient(project: any): string {
    const percentage = this.getPourcentageCompletion(project);
    const color = this.getProgressColor(project);
    
    if (percentage < 25) {
      return `linear-gradient(90deg, ${color}, ${this.lightenColor(color, 20)})`;
    }
    if (percentage < 75) {
      return `linear-gradient(90deg, ${this.lightenColor(color, 10)}, ${color})`;
    }
    return `linear-gradient(90deg, ${color}, ${this.darkenColor(color, 10)})`;
  }

  getProgressTextColor(project: any): string {
    const percentage = this.getPourcentageCompletion(project);
    return percentage > 50 ? 'white' : 'black';
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return "#" + (
      0x1000000 +
      (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    
    return "#" + (
      0x1000000 +
      (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
  }

  // ==================== NAVIGATION ====================
  viewProjectDetails(projectId: number): void {
    this.router.navigate(['/features/admin/projets/detail', projectId]);
  }

  applyToProject(project: any): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/features/admin/projets/${project.id}` }
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
}