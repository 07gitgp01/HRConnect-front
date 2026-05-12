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
import { StripHtmlPipe } from '../../../shared/pipes/strip-html.pipe';
import { PostService, Post } from '../../../features/services/service_posts/post.service.ts.service';
import { environment } from '../../../features/environment/environment';

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
    MatChipsModule,
    StripHtmlPipe
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  // Signaux projets
  featuredProjects = signal<any[]>([]);
  isLoadingProjects = signal<boolean>(true);
  loadError = signal<boolean>(false);
  stats = signal<any>({});

  // Compteurs
  activeProjectsCount = signal<number>(0);
  totalProjectsCount = signal<number>(0);

  // Domaines
  domains: Domain[] = [];

  // Carrousel
  currentHeroSlide = 0;
  carouselSlides: CarouselSlide[] = [];
  private heroSlideInterval: any;
  private loadTimeout: any;

  // Actualités
  posts = signal<Post[]>([]);
  isLoadingPosts = signal<boolean>(true);
  postsError = signal<boolean>(false);

  // Authentification
  isLoggedIn = computed(() => this.authService.isLoggedIn());
  userRole = computed(() => this.authService.getUserRole() || 'visiteur');

  // URL backend (sans /api)
  private backendBaseUrl = environment.apiUrl.replace('/api', '');

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private postService: PostService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🏠 HomeComponent initialisé');
    this.featuredProjects.set([]);
    setTimeout(() => this.loadFeaturedProjects(), 100);
    this.loadDomainsData();
    this.loadStats();
    this.initializeHeroCarousel();
    this.startHeroAutoSlide();
    this.loadPosts();
  }

  ngOnDestroy(): void {
    if (this.heroSlideInterval) clearInterval(this.heroSlideInterval);
    if (this.loadTimeout) clearTimeout(this.loadTimeout);
  }

  // === HERO CAROUSEL ===
  private initializeHeroCarousel(): void {
    this.carouselSlides = [
      {
        image: 'assets/1.webp',
        title: 'Programme National de Volontariat',
        description: 'Rejoignez le mouvement citoyen pour le développement du Burkina Faso',
        primaryButton: { text: 'Devenir Volontaire', link: '/signup' },
        secondaryButton: { text: 'Découvrir les Missions', link: '/recrutements' }
      },
      {
        image: 'assets/2.jpg',
        title: 'Engagez-vous pour Votre Nation',
        description: 'Participez à des projets qui transforment les communautés',
        primaryButton: { text: 'Commencer l\'Aventure', link: '/signup' },
        secondaryButton: { text: 'En Savoir Plus', link: '/a-propos' }
      },
      {
        image: 'assets/3.png',
        title: 'Faites la Différence',
        description: 'Des milliers de volontaires nous font déjà confiance',
        primaryButton: { text: 'FAQ', link: '/faq' },
        secondaryButton: { text: 'Nous Contacter', link: '/contact' }
      }
    ];
  }

  private startHeroAutoSlide(): void {
    this.heroSlideInterval = setInterval(() => this.nextHeroSlide(), 4000);
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
    if (this.heroSlideInterval) clearInterval(this.heroSlideInterval);
    this.startHeroAutoSlide();
  }

  // === DOMAINES ===
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

  // === ACTUALITÉS (avec conversion des URLs) ===
  private getFullUrl(relativePath: string | undefined): string | undefined {
    if (!relativePath) return undefined;
    if (relativePath.startsWith('http')) return relativePath;
    const cleanPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
    return this.backendBaseUrl + cleanPath;
  }

  loadPosts(): void {
  this.isLoadingPosts.set(true);
  this.postsError.set(false);
  this.postService.getAll().subscribe({
    next: (posts: Post[]) => {
      const sorted = posts.sort((a, b) =>
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      );
      this.posts.set(sorted.slice(0, 3));
      this.isLoadingPosts.set(false);
    },
    error: (err: any) => {
      console.error('Erreur chargement actualités', err);
      this.postsError.set(true);
      this.isLoadingPosts.set(false);
    }
  });
}

  // === PROJETS ===
  loadFeaturedProjects(): void {
    console.log('🔄 Début chargement des projets...');
    this.isLoadingProjects.set(true);
    this.loadError.set(false);

    this.loadTimeout = setTimeout(() => {
      console.log('⏱️ Timeout chargement projets');
      this.featuredProjects.set([]);
      this.isLoadingProjects.set(false);
      this.loadError.set(false);
    }, 8000);

    this.projectService.getAllProjectsWithStats().subscribe({
      next: (projectsWithStats: any[]) => {
        if (this.loadTimeout) clearTimeout(this.loadTimeout);
        let openProjects: any[] = [];
        if (projectsWithStats && projectsWithStats.length > 0) {
          const aujourdhui = new Date();
          aujourdhui.setHours(0, 0, 0, 0);
          openProjects = projectsWithStats.filter(project => {
            const status = (project.status || project.statutProjet || '').toString().toLowerCase().trim();
            if (status !== 'actif') return false;
            const dateLimite = project.dateLimiteCandidature || project.applicationDeadline;
            if (!dateLimite) return true;
            try {
              const dateLimiteObj = new Date(dateLimite);
              dateLimiteObj.setHours(0, 0, 0, 0);
              return dateLimiteObj >= aujourdhui;
            } catch {
              return true;
            }
          });
          this.activeProjectsCount.set(openProjects.length);
          this.totalProjectsCount.set(projectsWithStats.length);
          this.featuredProjects.set(openProjects.slice(0, 6));
        }
        this.isLoadingProjects.set(false);
      },
      error: (error: any) => {
        if (this.loadTimeout) clearTimeout(this.loadTimeout);
        console.error('Erreur chargement projets:', error);
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

  // === UTILITAIRES ===
  getDefaultImage(): string {
    return 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=600&h=400&fit=crop';
  }

  handleImageError(event: any): void {
    event.target.src = this.getDefaultImage();
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'en_attente': 'schedule',
      'actif': 'check_circle',
      'cloture': 'cancel'
    };
    return icons[status] || 'help';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'en_attente': 'En attente',
      'actif': 'Actif',
      'cloture': 'Clôturé'
    };
    return labels[status] || status;
  }

  getRequiredVolunteersDisplay(project: any): number {
    return project.nombreVolontairesRequis || project.neededVolunteers || 0;
  }

  canApplyToProject(project: any): boolean {
    const status = (project.status || project.statutProjet || '').toString().toLowerCase().trim();
    if (status !== 'actif') return false;
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
    const icons: Record<string, string> = {
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
      const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

  // === NAVIGATION ===
  viewProjectDetails(projectId: number): void {
    if (!projectId) return;
    this.router.navigate(['/detail', projectId]);
  }

  applyToProject(project: any): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/detail/${project.id}` } });
      return;
    }
    this.viewProjectDetails(project.id);
  }

  exploreDomain(domain: Domain): void {
    this.router.navigate(['/features/admin/projets'], { queryParams: { category: domain.category } });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  voirToutesLesMissions(): void {
    this.router.navigate(['/recrutements']);
  }
}