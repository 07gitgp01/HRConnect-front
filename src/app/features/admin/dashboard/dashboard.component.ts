// src/app/features/admin/admin-dashboard/admin-dashboard.component.ts
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, catchError, of } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common'; 
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/service_auth/auth.service';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { ProjectService } from '../../services/service_projects/projects.service';
import { MatSnackBar } from '@angular/material/snack-bar';

Chart.register(...registerables);

interface DashboardData {
  totalVolontairesActifs: number;
  totalProjetsOuverts: number;
  candidaturesEnAttente: number;
  tauxCompletion: number;
  projetsEcheance: any[];
  candidaturesUrgentes: any[];
  evolutionCandidatures: any[];
  candidaturesParRegion: any[];
  projetsParStatut: any[];
  statistiquesEcheances: any;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    RouterModule,
    MatProgressSpinnerModule
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
    candidaturesParRegion: [],
    projetsParStatut: [],
    statistiquesEcheances: {}
  };

  echeanceNotifications: string[] = [];
  isUserAdmin = false;

  @ViewChild('candidaturesChart') candidaturesChart!: ElementRef;
  @ViewChild('regionsChart') regionsChart!: ElementRef;
  @ViewChild('projetsChart') projetsChart!: ElementRef;

  private chart1: Chart | undefined;
  private chart2: Chart | undefined;
  private chart3: Chart | undefined;

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
      // S'assurer que les notifications sont vidées si non-admin
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
      this.echeanceNotifications = []; // Vider les notifications
      return;
    }

    this.projectService.getEcheanceNotifications().subscribe(notifications => {
      // Vérifier à nouveau qu'on est toujours admin
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

    const candidatures$ = this.candidatureService.getCandidaturesAvecProjets();
    
    const affectations$ = this.http.get<any[]>('http://localhost:3000/affectations').pipe(
      catchError(error => {
        console.error('Erreur chargement affectations:', error);
        return of([]);
      })
    );

    forkJoin({
      volontaires: volontaires$,
      projets: projets$,
      candidatures: candidatures$,
      affectations: affectations$
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
        });
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
  private async loadStatistiquesEcheances(): Promise<void> {
    if (!this.isUserAdmin) {
      this.dashboardData.statistiquesEcheances = { enRetard: 0, cetteSemaine: 0, ceMois: 0 };
      return;
    }

    try {
      const stats = await this.projectService.getStatistiquesEcheances();
      this.dashboardData.statistiquesEcheances = stats;
    } catch (error) {
      console.error('Erreur chargement statistiques échéances:', error);
      this.dashboardData.statistiquesEcheances = { enRetard: 0, cetteSemaine: 0, ceMois: 0 };
    }
  }

  /**
   * 📈 Traitement des données pour le tableau de bord
   */
  private processDashboardData(data: any): void {
    const { volontaires, projets, candidatures, affectations } = data;

    console.log('📊 Traitement des données:', {
      volontaires: volontaires.length,
      projets: projets.length,
      candidatures: candidatures.length,
      affectations: affectations.length
    });

    // KPIs principaux
    this.dashboardData.totalVolontairesActifs = volontaires.filter((v: any) => 
      this.normaliserStatut(v.statut).includes('actif')
    ).length;

    this.dashboardData.totalProjetsOuverts = projets.filter((p: any) => 
      this.estProjetOuvert(p)
    ).length;

    this.dashboardData.candidaturesEnAttente = candidatures.filter((c: any) => 
      c.statut === 'en_attente'
    ).length;

    // Taux de complétion basé sur les projets
    const projetsTermines = projets.filter((p: any) => 
      this.normaliserStatut(p.status).includes('clôturé') || 
      this.normaliserStatut(p.status).includes('termine')
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
   * 🔧 Vérifier si un projet est ouvert
   */
  private estProjetOuvert(projet: any): boolean {
    const statut = this.normaliserStatut(projet.status);
    return statut.includes('en cours') || 
           statut.includes('planifié') || 
           statut.includes('soumis') ||
           statut.includes('ouvert');
  }

  /**
   * 🔧 Normalisation des statuts
   */
  private normaliserStatut(statut: any): string {
    if (!statut) return '';
    return statut.toString().toLowerCase().trim();
  }

  /**
   * ⏰ Projets arrivant à échéance
   */
  private getProjetsEcheance(projets: any[]): any[] {
    const aujourdhui = new Date();
    const dans15Jours = new Date();
    dans15Jours.setDate(aujourdhui.getDate() + 15);
    
    return projets
      .filter((p: any) => {
        if (!p.endDate) return false;
        try {
          const dateEcheance = new Date(p.endDate);
          return dateEcheance > aujourdhui && dateEcheance <= dans15Jours;
        } catch {
          return false;
        }
      })
      .map((p: any) => ({
        id: p.id,
        titre: p.title || p.nom || 'Projet sans titre',
        dateEcheance: p.endDate
      }))
      .slice(0, 5);
  }

  /**
   * 🚨 Candidatures urgentes
   */
  private getCandidaturesUrgentes(candidatures: any[]): any[] {
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
        mission: c.poste_vise,
        dateReception: c.cree_le
      }))
      .slice(0, 5);
  }

  /**
   * 📊 Préparation des données pour les graphiques
   */
  private prepareChartData(candidatures: any[], projets: any[]): void {
    this.dashboardData.evolutionCandidatures = this.calculerEvolutionMensuelle(candidatures);
    this.dashboardData.candidaturesParRegion = this.calculerRepartitionRegion(candidatures);
    this.dashboardData.projetsParStatut = this.calculerRepartitionProjets(projets);
  }

  /**
   * 📈 Évolution mensuelle des candidatures
   */
  private calculerEvolutionMensuelle(candidatures: any[]): any[] {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const aujourdhui = new Date();
    const result = [];

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
   * 🗺️ Répartition des candidatures par région
   */
  private calculerRepartitionRegion(candidatures: any[]): any[] {
    const regions: { [key: string]: number } = {};

    candidatures.forEach((c: any) => {
      const region = c.region || 'Non assignée';
      regions[region] = (regions[region] || 0) + 1;
    });

    return Object.entries(regions)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Limiter à 8 régions maximum
  }

  /**
   * 📊 Répartition des projets par statut
   */
  private calculerRepartitionProjets(projets: any[]): any[] {
    const statuts: { [key: string]: number } = {};

    projets.forEach((p: any) => {
      const statut = p.status || 'Non spécifié';
      statuts[statut] = (statuts[statut] || 0) + 1;
    });

    return Object.entries(statuts)
      .map(([statut, count]) => ({ statut, count }));
  }

  /**
   * 📊 Création des graphiques
   */
  private createCharts(): void {
    this.createCandidaturesChart();
    this.createRegionsChart();
    this.createProjetsChart();
  }

  private createCandidaturesChart(): void {
    if (!this.candidaturesChart?.nativeElement) return;

    const ctx = this.candidaturesChart.nativeElement.getContext('2d');
    
    this.chart1 = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.dashboardData.evolutionCandidatures.map(item => item.mois),
        datasets: [{
          label: 'Candidatures reçues',
          data: this.dashboardData.evolutionCandidatures.map(item => item.count),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Évolution mensuelle des candidatures'
          }
        }
      }
    });
  }

  private createRegionsChart(): void {
    if (!this.regionsChart?.nativeElement) return;

    const ctx = this.regionsChart.nativeElement.getContext('2d');
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#607D8B', '#795548', '#E91E63'];
    
    this.chart2 = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.dashboardData.candidaturesParRegion.map(item => item.region),
        datasets: [{
          label: 'Candidatures par région',
          data: this.dashboardData.candidaturesParRegion.map(item => item.count),
          backgroundColor: colors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Répartition des candidatures par région'
          }
        }
      }
    });
  }

  private createProjetsChart(): void {
    if (!this.projetsChart?.nativeElement) return;

    const ctx = this.projetsChart.nativeElement.getContext('2d');
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0'];
    
    this.chart3 = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.dashboardData.projetsParStatut.map(item => item.statut),
        datasets: [{
          label: 'Projets par statut',
          data: this.dashboardData.projetsParStatut.map(item => item.count),
          backgroundColor: colors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Répartition des projets par statut'
          }
        }
      }
    });
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
    if (this.chart1) this.chart1.destroy();
    if (this.chart2) this.chart2.destroy();
    if (this.chart3) this.chart3.destroy();
  }
}