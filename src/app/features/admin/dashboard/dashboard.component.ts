// src/app/features/admin/admin-dashboard/admin-dashboard.component.ts

import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
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
import { VolontaireService } from '../../services/service_volont/volontaire.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Project, ProjectStatus } from '../../models/projects.model';

Chart.register(...registerables);

// Helper pour convertir id en number
function toNumericId(id: string | number | undefined): number {
  if (id === undefined) return 0;
  const n = Number(id);
  return isNaN(n) ? 0 : n;
}

interface DashboardData {
  totalVolontairesActifs: number;
  totalProjetsOuverts: number;
  projetsEnAttente: number;
  candidaturesEnAttente: number;
  tauxCompletion: number;
  projetsEcheanceImminente: ProjetEcheanceImminente[];
  candidaturesUrgentes: CandidatureUrgente[];
  evolutionCandidatures: EvolutionMensuelle[];
  projetsParStatut: RepartitionStatut[];
  statistiques: Statistiques;
}

interface ProjetEcheanceImminente {
  id: number;
  titre: string;
  dateLimiteCandidature: string;
  joursRestants: number;
  statut: string;
  nombrePostesDisponibles: number;
  estDepassee: boolean;
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

interface Statistiques {
  missionsTerminees: number;
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
    projetsEnAttente: 0,
    candidaturesEnAttente: 0,
    tauxCompletion: 0,
    projetsEcheanceImminente: [],
    candidaturesUrgentes: [],
    evolutionCandidatures: [],
    projetsParStatut: [],
    statistiques: {
      missionsTerminees: 0
    }
  };

  echeanceNotifications: string[] = [];
  isUserAdmin = false;

  @ViewChild('candidaturesChart') candidaturesChart!: ElementRef;
  @ViewChild('projetsChart') projetsChart!: ElementRef;

  private chart1: Chart | undefined;
  private chart2: Chart | undefined;

  constructor(
    private authService: AuthService,
    private router: Router,
    private datePipe: DatePipe,
    private candidatureService: CandidatureService,
    private projectService: ProjectService,
    private volontaireService: VolontaireService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.isUserAdmin = this.authService.isAdmin();
    console.log('👤 Utilisateur admin:', this.isUserAdmin);
    
    this.projectService.updateAdminStatus();
    
    this.loadDashboardData();
    
    if (this.isUserAdmin) {
      this.setupEcheanceNotifications();
    } else {
      this.echeanceNotifications = [];
    }
  }
  
  ngAfterViewInit(): void {
    // Les graphiques seront créés après le chargement des données
  }

  // ==================== NAVIGATION ====================

  voirProjet(projectId: number): void {
    console.log('🔗 Navigation vers projet ID:', projectId);
    this.router.navigate(['/features/admin/projets'], {
      queryParams: { projetId: projectId }
    });
  }

  voirCandidature(candidatureId: number): void {
    console.log('🔗 Navigation vers candidature ID:', candidatureId);
    this.router.navigate(['/features/admin/candidatures'], {
      queryParams: { candidatureId: candidatureId }
    });
  }

  // ==================== NOTIFICATIONS ====================

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

  // ==================== CHARGEMENT DES DONNÉES ====================

  loadDashboardData(): void {
    this.isLoading = true;

    console.log('=== DÉBUT CHARGEMENT TABLEAU DE BORD ===');

    // ✅ Utilisation des services au lieu des appels HTTP directs
    const volontaires$ = this.volontaireService.getVolontaires().pipe(
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
        
        this.isLoading = false;
        
        setTimeout(() => {
          this.createCharts();
        }, 100);
      },
      error: (error) => {
        console.error('❌ Erreur chargement dashboard:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des données', 'Fermer', {
          duration: 5000
        });
      }
    });
  }

  private processDashboardData(data: any): void {
    const { volontaires, projets, candidatures } = data;

    console.log('📊 Traitement des données:', {
      volontaires: volontaires?.length || 0,
      projets: projets?.length || 0,
      candidatures: candidatures?.length || 0
    });

    // Volontaires actifs
    this.dashboardData.totalVolontairesActifs = (volontaires || []).filter((v: any) => 
      this.normaliserStatut(v.statut) === 'actif'
    ).length;

    // Projets actifs (ouverts aux candidatures)
    this.dashboardData.totalProjetsOuverts = (projets || []).filter((p: Project) => 
      p.statutProjet === 'actif'
    ).length;

    // Projets en attente de validation
    this.dashboardData.projetsEnAttente = (projets || []).filter((p: Project) => 
      p.statutProjet === 'en_attente'
    ).length;

    // Candidatures en attente
    this.dashboardData.candidaturesEnAttente = (candidatures || []).filter((c: any) => 
      c.statut === 'en_attente'
    ).length;

    // Taux de complétion (missions terminées)
    const projetsTermines = (projets || []).filter((p: Project) => 
      p.statutProjet === 'cloture'
    ).length;
    
    this.dashboardData.tauxCompletion = (projets && projets.length > 0) ? 
      Math.round((projetsTermines / projets.length) * 100) : 0;

    // Missions à échéance imminente
    this.dashboardData.projetsEcheanceImminente = this.getProjetsEcheanceImminente(projets || []);
    
    // Statistiques
    this.dashboardData.statistiques.missionsTerminees = projetsTermines;
    
    // Candidatures urgentes
    this.dashboardData.candidaturesUrgentes = this.getCandidaturesUrgentes(candidatures || []);

    // Préparer les données pour les graphiques
    this.prepareChartData(candidatures || [], projets || []);

    console.log('📊 Tableau de bord traité:', {
      totalVolontairesActifs: this.dashboardData.totalVolontairesActifs,
      totalProjetsOuverts: this.dashboardData.totalProjetsOuverts,
      projetsEnAttente: this.dashboardData.projetsEnAttente,
      candidaturesEnAttente: this.dashboardData.candidaturesEnAttente,
      missionsTerminees: this.dashboardData.statistiques.missionsTerminees,
      echeancesImminentes: this.dashboardData.projetsEcheanceImminente.length
    });
  }

  private normaliserStatut(statut: any): string {
    if (!statut) return '';
    const s = statut.toString().toLowerCase().trim();
    if (s === 'actif' || s === 'active') return 'actif';
    return s;
  }

  // ==================== MÉTHODES DE FILTRAGE ====================

  private getProjetsEcheanceImminente(projets: Project[]): ProjetEcheanceImminente[] {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const dans2Jours = new Date(aujourdhui);
    dans2Jours.setDate(aujourdhui.getDate() + 2);
    
    return (projets || [])
      .filter((p: Project) => {
        if (p.statutProjet !== 'actif') return false;
        if (!p.dateLimiteCandidature) return false;
        
        try {
          const dateLimite = new Date(p.dateLimiteCandidature);
          dateLimite.setHours(0, 0, 0, 0);
          
          const estDepassee = dateLimite < aujourdhui;
          const estDans2Jours = dateLimite >= aujourdhui && dateLimite <= dans2Jours;
          
          return estDepassee || estDans2Jours;
        } catch {
          return false;
        }
      })
      .map((p: Project) => {
        const dateLimite = new Date(p.dateLimiteCandidature);
        dateLimite.setHours(0, 0, 0, 0);
        const aujourdhuiDate = new Date();
        aujourdhuiDate.setHours(0, 0, 0, 0);
        
        const estDepassee = dateLimite < aujourdhuiDate;
        let joursRestants = 0;
        
        if (!estDepassee) {
          joursRestants = this.calculerJoursRestants(p.dateLimiteCandidature);
        }
        
        const postesDisponibles = (p.nombreVolontairesRequis || 0) - (p.nombreVolontairesActuels || 0);
        
        return {
          id: toNumericId(p.id),
          titre: p.titre,
          dateLimiteCandidature: p.dateLimiteCandidature,
          joursRestants: joursRestants,
          statut: p.statutProjet,
          nombrePostesDisponibles: postesDisponibles > 0 ? postesDisponibles : 0,
          estDepassee: estDepassee
        };
      })
      .sort((a, b) => {
        if (a.estDepassee && !b.estDepassee) return -1;
        if (!a.estDepassee && b.estDepassee) return 1;
        return a.joursRestants - b.joursRestants;
      });
  }

  private getCandidaturesUrgentes(candidatures: any[]): CandidatureUrgente[] {
    const aujourdhui = new Date();
    const ilYa7Jours = new Date();
    ilYa7Jours.setDate(aujourdhui.getDate() - 7);
    
    return (candidatures || [])
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
        mission: c.poste_vise || c.projetTitre || 'Mission non spécifiée',
        dateReception: c.cree_le
      }))
      .sort((a, b) => {
        const dateA = new Date(a.dateReception).getTime();
        const dateB = new Date(b.dateReception).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  calculerJoursRestants(dateString: string): number {
    if (!dateString) return 0;
    try {
      const date = new Date(dateString);
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      const diffTime = date.getTime() - aujourdhui.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  }

  getJoursRestantsClasse(jours: number, estDepassee: boolean): string {
    if (estDepassee) return 'urgence-rouge';
    if (jours === 0) return 'urgence-rouge';
    if (jours <= 1) return 'urgence-rouge';
    if (jours <= 3) return 'urgence-orange';
    return '';
  }

  // ==================== PRÉPARATION DES GRAPHIQUES ====================

  private prepareChartData(candidatures: any[], projets: Project[]): void {
    this.dashboardData.evolutionCandidatures = this.calculerEvolutionMensuelle(candidatures || []);
    this.dashboardData.projetsParStatut = this.calculerRepartitionProjets(projets || []);
    
    console.log('📊 Données graphiques préparées:', {
      evolutionCandidatures: this.dashboardData.evolutionCandidatures,
      projetsParStatut: this.dashboardData.projetsParStatut
    });
  }

  private calculerEvolutionMensuelle(candidatures: any[]): EvolutionMensuelle[] {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const aujourdhui = new Date();
    const result: EvolutionMensuelle[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - i, 1);
      const moisKey = mois[date.getMonth()];
      const annee = date.getFullYear();

      const count = (candidatures || []).filter((c: any) => {
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

  private calculerRepartitionProjets(projets: Project[]): RepartitionStatut[] {
    const statuts: { [key: string]: number } = {};
    
    const statusLabels: { [key in ProjectStatus]: string } = {
      'en_attente': 'En Attente',
      'actif': 'Actif',
      'cloture': 'Clôturé'
    };

    (projets || []).forEach((p: Project) => {
      const statutLabel = statusLabels[p.statutProjet] || 'Non spécifié';
      statuts[statutLabel] = (statuts[statutLabel] || 0) + 1;
    });

    return Object.entries(statuts)
      .map(([statut, count]) => ({ statut, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ==================== CRÉATION DES GRAPHIQUES ====================

  private createCharts(): void {
    console.log('🎨 Création des graphiques...');
    this.createCandidaturesChart();
    this.createProjetsChart();
  }

  private createCandidaturesChart(): void {
    if (!this.candidaturesChart?.nativeElement) {
      console.warn('⚠️ Canvas candidaturesChart introuvable');
      return;
    }

    const ctx = this.candidaturesChart.nativeElement.getContext('2d');
    
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
              font: { size: 12, weight: 'bold' }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            callbacks: {
              label: (context) => `Candidatures: ${context.parsed.y}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });

    console.log('✅ Graphique candidatures créé avec succès');
  }

  private createProjetsChart(): void {
    if (!this.projetsChart?.nativeElement) {
      console.error('❌ Canvas projetsChart introuvable');
      return;
    }
    
    if (!this.dashboardData.projetsParStatut.length) {
      console.warn('⚠️ Aucune donnée pour le graphique projets');
      return;
    }

    const ctx = this.projetsChart.nativeElement.getContext('2d');
    
    if (this.chart2) {
      this.chart2.destroy();
    }
    
    const colorMap: { [key: string]: string } = {
      'En Attente': '#FF9800',
      'Actif': '#4CAF50',
      'Clôturé': '#9E9E9E',
      'Non spécifié': '#757575'
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
              font: { size: 12, weight: 'bold' },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
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

  // ==================== ACTIONS ====================

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
      this.loadDashboardData();
    }).catch(() => {
      this.snackBar.open('Erreur lors de la vérification', 'Fermer', {
        duration: 3000
      });
    });
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    if (this.chart1) {
      this.chart1.destroy();
    }
    if (this.chart2) {
      this.chart2.destroy();
    }
  }
}