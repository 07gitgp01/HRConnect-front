// src/app/features/admin/admin-dashboard/admin-dashboard.component.ts
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, catchError, of } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common'; 
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/service_auth/auth.service';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { ProjectService } from '../../services/service_projects/projects.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Project, ProjectStatus } from '../../models/projects.model';

Chart.register(...registerables);

interface DashboardData {
  totalVolontairesActifs: number;
  totalProjetsOuverts: number;
  candidaturesEnAttente: number;
  tauxCompletion: number;
  projetsEcheance: ProjetEcheance[];
  candidaturesUrgentes: CandidatureUrgente[];
  evolutionCandidatures: EvolutionMensuelle[];
  projetsParStatut: RepartitionStatut[];
  statistiquesEcheances: StatistiquesEcheances;
}

interface ProjetEcheance {
  id: number;
  titre: string;
  dateEcheance: string;
}

interface CandidatureUrgente {
  id: number;
  nom: string;
  prenom: string;
  mission: string;
  dateReception: string;
}

interface EvolutionMensuelle {
  mois: string;
  count: number;
}

interface RepartitionStatut {
  statut: string;
  count: number;
}

interface StatistiquesEcheances {
  enRetard: number;
  cetteSemaine: number;
  ceMois: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatTooltipModule,
    RouterModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  providers: [DatePipe]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  dashboardData: DashboardData = {
    totalVolontairesActifs: 0,
    totalProjetsOuverts: 0,
    candidaturesEnAttente: 0,
    tauxCompletion: 0,
    projetsEcheance: [],
    candidaturesUrgentes: [],
    evolutionCandidatures: [],
    projetsParStatut: [],
    statistiquesEcheances: {
      enRetard: 0,
      cetteSemaine: 0,
      ceMois: 0
    }
  };

  echeanceNotifications: string[] = [];
  isUserAdmin = false;

  @ViewChild('candidaturesChart') candidaturesChart!: ElementRef;
  @ViewChild('projetsChart') projetsChart!: ElementRef;

  private chart1: Chart | undefined;
  private chart2: Chart | undefined;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private datePipe: DatePipe,
    private candidatureService: CandidatureService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Vérifier si l'utilisateur est admin
    this.isUserAdmin = this.authService.isAdmin();
    console.log('👤 Utilisateur admin:', this.isUserAdmin);
    
    // Mettre à jour le statut admin dans le service
    this.projectService.updateAdminStatus();
    
    this.loadDashboardData();
    
    // Configurer les notifications SEULEMENT si admin
    if (this.isUserAdmin) {
      this.setupEcheanceNotifications();
    } else {
      this.echeanceNotifications = [];
    }
  }
  
  ngAfterViewInit(): void {
    // Les graphiques seront créés après le chargement des données
  }

  /**
   * 👁️ Voir les détails d'un projet
   */
  voirProjet(projectId: number): void {
    console.log('🔗 Navigation vers projet ID:', projectId);
    this.router.navigate(['/features/admin/projets', projectId]);
  }

  /**
   * 📋 Voir les détails d'une candidature
   */
  voirCandidature(candidatureId: number): void {
    console.log('🔗 Navigation vers candidature ID:', candidatureId);
    this.router.navigate(['/features/admin/candidatures', candidatureId]);
  }

  /**
   * 🔔 Configurer les notifications d'échéance (UNIQUEMENT POUR ADMIN)
   */
  private setupEcheanceNotifications(): void {
    if (!this.isUserAdmin) {
      console.log('🔕 Notifications désactivées - Utilisateur non admin');
      this.echeanceNotifications = [];
      return;
    }

    this.projectService.getEcheanceNotifications().subscribe(notifications => {
      if (!this.authService.isAdmin()) {
        this.echeanceNotifications = [];
        return;
      }
      
      this.echeanceNotifications = notifications;
      
      if (notifications.length > 0) {
        console.log('🔔 Notifications d\'échéance (Admin):', notifications);
      }
    });
  }

  /**
   * 📊 Chargement des données du tableau de bord
   */
  loadDashboardData(): void {
    this.isLoading = true;

    console.log('=== DÉBUT CHARGEMENT TABLEAU DE BORD ===');

    const volontaires$ = this.http.get<any[]>('http://localhost:3000/volontaires').pipe(
      catchError(error => {
        console.error('Erreur chargement volontaires:', error);
        return of([]);
      })
    );

    const projets$ = this.projectService.getProjects().pipe(
      catchError(error => {
        console.error('Erreur chargement projets:', error);
        return of([]);
      })
    );

    const candidatures$ = this.candidatureService.getCandidaturesAvecProjets().pipe(
      catchError(error => {
        console.error('Erreur chargement candidatures:', error);
        return of([]);
      })
    );

    forkJoin({
      volontaires: volontaires$,
      projets: projets$,
      candidatures: candidatures$
    }).subscribe({
      next: (results) => {
        console.log('✅ DONNÉES CHARGÉES AVEC SUCCÈS');
        this.processDashboardData(results);
        
        // Charger les statistiques d'échéance SEULEMENT si admin
        if (this.isUserAdmin) {
          this.loadStatistiquesEcheances();
        }
        
        this.isLoading = false;
        
        setTimeout(() => {
          this.createCharts();
        }, 100);
      },
      error: (error) => {
        console.error('❌ Erreur chargement dashboard:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * 📊 Charger les statistiques d'échéance (UNIQUEMENT POUR ADMIN)
   */
  private loadStatistiquesEcheances(): void {
    if (!this.isUserAdmin) {
      this.dashboardData.statistiquesEcheances = { 
        enRetard: 0, 
        cetteSemaine: 0, 
        ceMois: 0 
      };
      return;
    }

    this.projectService.getStatistiquesEcheances().subscribe({
      next: (stats) => {
        this.dashboardData.statistiquesEcheances = {
          enRetard: stats.projetsEnRetard || 0,
          cetteSemaine: stats.projetsAEcheance || 0,
          ceMois: 0 // À implémenter si nécessaire
        };
        console.log('📊 Statistiques échéances chargées:', this.dashboardData.statistiquesEcheances);
      },
      error: (error) => {
        console.error('Erreur chargement statistiques échéances:', error);
        this.dashboardData.statistiquesEcheances = { 
          enRetard: 0, 
          cetteSemaine: 0, 
          ceMois: 0 
        };
      }
    });
  }

  /**
   * 📈 Traitement des données pour le tableau de bord
   */
  private processDashboardData(data: any): void {
    const { volontaires, projets, candidatures } = data;

    console.log('📊 Traitement des données:', {
      volontaires: volontaires.length,
      projets: projets.length,
      candidatures: candidatures.length
    });

    // KPIs principaux
    this.dashboardData.totalVolontairesActifs = volontaires.filter((v: any) => 
      this.normaliserStatut(v.statut).includes('actif')
    ).length;

    // ✅ CORRECTION : Utiliser statutProjet au lieu de status
    this.dashboardData.totalProjetsOuverts = projets.filter((p: Project) => 
      p.statutProjet === 'actif'
    ).length;

    this.dashboardData.candidaturesEnAttente = candidatures.filter((c: any) => 
      c.statut === 'en_attente'
    ).length;

    // Taux de complétion basé sur les projets
    const projetsTermines = projets.filter((p: Project) => 
      p.statutProjet === 'cloture'
    ).length;
    
    this.dashboardData.tauxCompletion = projets.length > 0 ? 
      Math.round((projetsTermines / projets.length) * 100) : 0;

    // Projets arrivant à échéance
    this.dashboardData.projetsEcheance = this.getProjetsEcheance(projets);

    // Candidatures urgentes
    this.dashboardData.candidaturesUrgentes = this.getCandidaturesUrgentes(candidatures);

    // Données pour les graphiques
    this.prepareChartData(candidatures, projets);

    console.log('📊 Tableau de bord traité:', this.dashboardData);
  }

  /**
   * 🔧 Normalisation des statuts (pour volontaires uniquement)
   */
  private normaliserStatut(statut: any): string {
    if (!statut) return '';
    return statut.toString().toLowerCase().trim();
  }

  /**
   * ⏰ Projets arrivant à échéance (15 prochains jours)
   */
  private getProjetsEcheance(projets: Project[]): ProjetEcheance[] {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const dans15Jours = new Date(aujourdhui);
    dans15Jours.setDate(aujourdhui.getDate() + 15);
    
    return projets
      .filter((p: Project) => {
        // Exclure les projets clôturés
        if (p.statutProjet === 'cloture') return false;
        
        if (!p.dateFin) return false;
        
        try {
          const dateEcheance = new Date(p.dateFin);
          dateEcheance.setHours(0, 0, 0, 0);
          return dateEcheance > aujourdhui && dateEcheance <= dans15Jours;
        } catch {
          return false;
        }
      })
      .map((p: Project) => ({
        id: p.id!,
        titre: p.titre,
        dateEcheance: p.dateFin
      }))
      .sort((a, b) => {
        const dateA = new Date(a.dateEcheance).getTime();
        const dateB = new Date(b.dateEcheance).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }

  /**
   * 🚨 Candidatures urgentes (plus de 7 jours en attente)
   */
  private getCandidaturesUrgentes(candidatures: any[]): CandidatureUrgente[] {
    const aujourdhui = new Date();
    const ilYa7Jours = new Date();
    ilYa7Jours.setDate(aujourdhui.getDate() - 7);
    
    return candidatures
      .filter((c: any) => {
        if (c.statut !== 'en_attente' || !c.cree_le) return false;
        try {
          const dateCandidature = new Date(c.cree_le);
          return dateCandidature <= ilYa7Jours;
        } catch {
          return false;
        }
      })
      .map((c: any) => ({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        mission: c.poste_vise || 'Mission non spécifiée',
        dateReception: c.cree_le
      }))
      .sort((a, b) => {
        const dateA = new Date(a.dateReception).getTime();
        const dateB = new Date(b.dateReception).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }

  /**
   * 📊 Préparation des données pour les graphiques
   */
  private prepareChartData(candidatures: any[], projets: Project[]): void {
    this.dashboardData.evolutionCandidatures = this.calculerEvolutionMensuelle(candidatures);
    this.dashboardData.projetsParStatut = this.calculerRepartitionProjets(projets);
    
    console.log('📊 Données graphiques préparées:', {
      evolutionCandidatures: this.dashboardData.evolutionCandidatures,
      projetsParStatut: this.dashboardData.projetsParStatut
    });
  }

  /**
   * 📈 Évolution mensuelle des candidatures (6 derniers mois)
   */
  private calculerEvolutionMensuelle(candidatures: any[]): EvolutionMensuelle[] {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const aujourdhui = new Date();
    const result: EvolutionMensuelle[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - i, 1);
      const moisKey = mois[date.getMonth()];
      const annee = date.getFullYear();

      const count = candidatures.filter((c: any) => {
        if (!c.cree_le) return false;
        try {
          const dateCandidature = new Date(c.cree_le);
          return dateCandidature.getMonth() === date.getMonth() && 
                 dateCandidature.getFullYear() === annee;
        } catch {
          return false;
        }
      }).length;

      result.push({ mois: `${moisKey} ${annee}`, count });
    }

    return result;
  }

  /**
   * 📊 Répartition des projets par statut (CORRIGÉ ✅)
   */
  private calculerRepartitionProjets(projets: Project[]): RepartitionStatut[] {
    const statuts: { [key: string]: number } = {};
    
    // Mapping des statuts vers des labels lisibles
    const statusLabels: { [key in ProjectStatus]: string } = {
      'en_attente': 'En Attente',
      'actif': 'Actif',
      'cloture': 'Clôturé'
    };

    projets.forEach((p: Project) => {
      const statutLabel = statusLabels[p.statutProjet] || 'Non spécifié';
      statuts[statutLabel] = (statuts[statutLabel] || 0) + 1;
      
      console.log(`📌 Projet "${p.titre}": statutProjet="${p.statutProjet}" -> label="${statutLabel}"`);
    });

    const result = Object.entries(statuts)
      .map(([statut, count]) => ({ statut, count }))
      .sort((a, b) => b.count - a.count);
    
    console.log('📊 Répartition projets par statut:', result);
    return result;
  }

  /**
   * 📊 Création des graphiques (CORRIGÉ ✅)
   */
  private createCharts(): void {
    console.log('🎨 Création des graphiques...');
    this.createCandidaturesChart();
    this.createProjetsChart();
  }

  /**
   * 📈 Graphique d'évolution des candidatures
   */
  private createCandidaturesChart(): void {
    if (!this.candidaturesChart?.nativeElement) {
      console.warn('⚠️ Canvas candidaturesChart introuvable');
      return;
    }

    const ctx = this.candidaturesChart.nativeElement.getContext('2d');
    
    // Détruire le graphique existant s'il existe
    if (this.chart1) {
      this.chart1.destroy();
    }
    
    this.chart1 = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.dashboardData.evolutionCandidatures.map(item => item.mois),
        datasets: [{
          label: 'Candidatures reçues',
          data: this.dashboardData.evolutionCandidatures.map(item => item.count),
          borderColor: '#2e7d32',
          backgroundColor: 'rgba(46, 125, 50, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#2e7d32',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 12,
                weight: 'bold'
              }
            }
          },
          title: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `Candidatures: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });

    console.log('✅ Graphique candidatures créé avec succès');
  }

  /**
   * 📊 Graphique de répartition des projets par statut
   */
  private createProjetsChart(): void {
    console.log('🎨 Création graphique projets...');
    console.log('Canvas element:', this.projetsChart?.nativeElement);
    console.log('Données projets:', this.dashboardData.projetsParStatut);
    
    if (!this.projetsChart?.nativeElement) {
      console.error('❌ Canvas projetsChart introuvable');
      return;
    }
    
    if (!this.dashboardData.projetsParStatut.length) {
      console.warn('⚠️ Aucune donnée pour le graphique projets');
      return;
    }

    const ctx = this.projetsChart.nativeElement.getContext('2d');
    
    // Détruire le graphique existant s'il existe
    if (this.chart2) {
      this.chart2.destroy();
    }
    
    // Couleurs adaptées aux statuts
    const colorMap: { [key: string]: string } = {
      'En Attente': '#FF9800',       // Orange
      'Actif': '#4CAF50',            // Vert
      'Clôturé': '#9E9E9E',          // Gris
      'Non spécifié': '#757575'      // Gris foncé
    };
    
    const colors = this.dashboardData.projetsParStatut.map(item => 
      colorMap[item.statut] || '#9C27B0'
    );
    
    this.chart2 = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.dashboardData.projetsParStatut.map(item => item.statut),
        datasets: [{
          label: 'Missions',
          data: this.dashboardData.projetsParStatut.map(item => item.count),
          backgroundColor: colors,
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverBorderWidth: 4,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12,
                weight: 'bold'
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          title: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: ${value} mission${value > 1 ? 's' : ''} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    
    console.log('✅ Graphique projets créé avec succès');
  }

  /**
   * 🔄 Vérifier manuellement les échéances (UNIQUEMENT POUR ADMIN)
   */
  verifierEcheances(): void {
    if (!this.isUserAdmin) {
      this.snackBar.open('Action réservée aux administrateurs', 'Fermer', {
        duration: 3000
      });
      return;
    }

    this.projectService.verifierEcheancesManuellement().then(() => {
      this.snackBar.open('Vérification des échéances terminée', 'Fermer', {
        duration: 3000
      });
      // Recharger les données pour mettre à jour les statistiques
      this.loadStatistiquesEcheances();
      this.loadDashboardData();
    });
  }

  /**
   * 🔒 Déconnexion
   */
  logout(): void {
    this.authService.logout();
  }

  /**
   * 🗑️ Nettoyage
   */
  ngOnDestroy(): void {
    if (this.chart1) {
      this.chart1.destroy();
    }
    if (this.chart2) {
      this.chart2.destroy();
    }
  }
}