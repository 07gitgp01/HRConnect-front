// src/app/features/admin/components/gestion-candidats/gestion-candidats.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AdminCandidatService } from '../../../services/service_candidats/admin-candidat.service';
import { User } from '../../../models/user.model';
import { Volontaire } from '../../../models/volontaire.model';
import { AuthService } from '../../../services/service_auth/auth.service';
import { Subscription } from 'rxjs';

interface CandidatComplet {
  user: User;
  volontaire: Volontaire;
}

@Component({
  selector: 'app-gestion-candidats',
  templateUrl: './gestion-candidats.component.html',
  styleUrls: ['./gestion-candidats.component.scss']
})
export class GestionCandidatsComponent implements OnInit, OnDestroy {
  candidats: CandidatComplet[] = [];
  isLoading = false;
  private routeSubscription?: Subscription;
  
  filtres = {
    statut: '',
    recherche: ''
  };

  constructor(
    private adminCandidatService: AdminCandidatService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('=== 🏠 GESTION CANDIDATS COMPOSANT INITIALISÉ ===');
    
    // 🔥 S'abonner aux changements de route pour détecter les retours
    this.routeSubscription = this.route.url.subscribe(url => {
      console.log('🔄 Changement de route détecté:', url);
      this.chargerCandidats();
    });

    this.chargerCandidats();
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  chargerCandidats(): void {
    this.isLoading = true;
    this.adminCandidatService.getCandidatsAvecProfils().subscribe({
      next: (candidats) => {
        this.candidats = candidats;
        this.isLoading = false;
        console.log(`✅ ${candidats.length} candidats chargés`);
        
        // 🔥 Forcer la détection de changement si nécessaire
        setTimeout(() => {
          this.detecterProblemesNavigation();
        }, 100);
      },
      error: (error) => {
        console.error('Erreur chargement candidats:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * 🔥 Détecter les problèmes de navigation
   */
  private detecterProblemesNavigation(): void {
    const currentUrl = this.router.url;
    console.log('🔍 URL actuelle:', currentUrl);
    
    // Vérifier si nous sommes bien sur la bonne route
    if (!currentUrl.includes('gestion-candidats')) {
      console.warn('⚠️  Mauvais chemin détecté, correction...');
      this.corrigerNavigation();
    }
  }

  /**
   * 🔥 Corriger la navigation si nécessaire
   */
  private corrigerNavigation(): void {
    const targetUrl = '/features/admin/comptes/gestion-candidats';
    if (this.router.url !== targetUrl) {
      console.log('🔄 Correction navigation vers:', targetUrl);
      this.router.navigate([targetUrl], { 
        replaceUrl: true 
      }).catch(err => {
        console.error('❌ Échec correction navigation:', err);
      });
    }
  }

  /**
   * 🔥 Navigation robuste vers création candidat
   */
  naviguerCreation(): void {
    console.log('🔄 Navigation vers création candidat...');
    
    // Vérifier l'état d'authentification d'abord
    if (!this.authService.isLoggedIn() || !this.authService.isAdmin()) {
      console.error('❌ Accès non autorisé pour création candidat');
      this.router.navigate(['/login']);
      return;
    }

    // 🔥 Utiliser navigation absolue avec gestion d'erreur
    const targetUrl = '/features/admin/comptes/creer-candidat';
    
    this.router.navigate([targetUrl], {
      skipLocationChange: false
    }).then(success => {
      if (success) {
        console.log('✅ Navigation création réussie');
      } else {
        console.error('❌ Échec navigation création, tentative rechargement...');
        this.fallbackNavigation(targetUrl);
      }
    }).catch(error => {
      console.error('💥 Erreur navigation création:', error);
      this.fallbackNavigation(targetUrl);
    });
  }

  /**
   * 🔥 Fallback en cas d'échec de navigation
   */
  private fallbackNavigation(url: string): void {
    console.log('🔄 Fallback navigation vers:', url);
    
    // Méthode 1: Navigation avec timeout
    setTimeout(() => {
      window.location.href = url;
    }, 100);
    
    // Méthode 2: Forcer le rechargement
    setTimeout(() => {
      if (this.router.url !== url) {
        window.location.reload();
      }
    }, 500);
  }

  // ... reste des méthodes existantes (desactiverCandidat, reactiverCandidat, etc.)

  desactiverCandidat(candidat: CandidatComplet): void {
    if (confirm(`Êtes-vous sûr de vouloir désactiver le compte de ${candidat.user.prenom} ${candidat.user.nom} ?`)) {
      this.adminCandidatService.desactiverCandidat(
        candidat.user.id!,
        candidat.volontaire.id!
      ).subscribe({
        next: () => {
          console.log(`✅ Candidat ${candidat.user.prenom} ${candidat.user.nom} désactivé`);
          this.chargerCandidats();
        },
        error: (error) => {
          console.error('Erreur désactivation:', error);
          alert('Erreur lors de la désactivation du candidat');
        }
      });
    }
  }

  reactiverCandidat(candidat: CandidatComplet): void {
    if (confirm(`Êtes-vous sûr de vouloir réactiver le compte de ${candidat.user.prenom} ${candidat.user.nom} ?`)) {
      this.adminCandidatService.reactiverCandidat(candidat.volontaire.id!).subscribe({
        next: () => {
          console.log(`✅ Candidat ${candidat.user.prenom} ${candidat.user.nom} réactivé`);
          this.chargerCandidats();
        },
        error: (error) => {
          console.error('Erreur réactivation:', error);
          alert('Erreur lors de la réactivation du candidat');
        }
      });
    }
  }

  supprimerCandidat(candidat: CandidatComplet): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${candidat.user.prenom} ${candidat.user.nom} ? Cette action est irréversible.`)) {
      this.adminCandidatService.supprimerCandidat(
        candidat.user.id!,
        candidat.volontaire.id!
      ).subscribe({
        next: () => {
          console.log(`✅ Candidat ${candidat.user.prenom} ${candidat.user.nom} supprimé`);
          this.chargerCandidats();
        },
        error: (error) => {
          console.error('Erreur suppression:', error);
          alert('Erreur lors de la suppression du candidat');
        }
      });
    }
  }

  get candidatsFiltres(): CandidatComplet[] {
    return this.candidats.filter(candidat => {
      const nom = candidat.user.nom || '';
      const prenom = candidat.user.prenom || '';
      
      const correspondRecherche = !this.filtres.recherche || 
        nom.toLowerCase().includes(this.filtres.recherche.toLowerCase()) ||
        prenom.toLowerCase().includes(this.filtres.recherche.toLowerCase()) ||
        candidat.user.email.toLowerCase().includes(this.filtres.recherche.toLowerCase());

      const correspondStatut = !this.filtres.statut || 
        candidat.volontaire.statut === this.filtres.statut;

      return correspondRecherche && correspondStatut;
    });
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'Actif': return 'badge bg-success';
      case 'Inactif': return 'badge bg-secondary';
      case 'En attente': return 'badge bg-warning';
      case 'Candidat': return 'badge bg-info';
      case 'Refusé': return 'badge bg-danger';
      default: return 'badge bg-light text-dark';
    }
  }

  /**
   * 🔥 Méthode de debug pour tester la navigation
   */
  debugNavigation(): void {
    console.log('=== 🐛 DEBUG NAVIGATION ===');
    console.log('📍 URL actuelle:', this.router.url);
    console.log('🛡️ Auth state:', {
      isLoggedIn: this.authService.isLoggedIn(),
      isAdmin: this.authService.isAdmin(),
      userRole: this.authService.getUserRole()
    });
    console.log('📋 Candidats chargés:', this.candidats.length);
    
    // Tester la navigation
    this.testNavigation();
  }

  private testNavigation(): void {
    const testUrl = '/features/admin/comptes/creer-candidat';
    console.log('🧪 Test navigation vers:', testUrl);
    
    this.router.navigate([testUrl]).then(success => {
      console.log('🧪 Résultat test:', success);
    });
  }
}