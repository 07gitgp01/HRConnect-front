// src/app/features/partenaires/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PartenaireService } from '../../services/service_parten/partenaire.service';
import { ProjectService } from '../../services/service_projects/projects.service';
import { RapportsPtfConsultationService } from '../../services/rap_ptf_consul/rapports-ptf-consultation.service';
import { RapportService } from '../../services/rap-eval/rapport.service';
import { PartenaireDashboardStats, Alerte, Partenaire } from '../../models/partenaire.model';
import { StatsConsultation } from '../../models/rapport-ptf.model';
import { AuthService } from '../../services/service_auth/auth.service';
import { PermissionService } from '../../services/permission.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-partenaire-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class PartenaireDashboardComponent implements OnInit, OnDestroy {

  stats: PartenaireDashboardStats = this.getStatsParDefaut();
  isLoading = true;
  currentUser: any = null;
  partenaireData: Partenaire | null = null;
  erreurChargement = '';
  isPTF = false;

  // Stats rapports PTF
  statsRapports: StatsConsultation | null = null;
  totalRapportsPTF = 0;

  // Stats projets (pour structure d'accueil)
  projetsStats: any = {
    en_attente: 0,
    actifs: 0,
    clotures: 0,
    total: 0,
    volontairesAffectes: 0,
    limiteProjets: 10
  };

  // Stats rapports d'évaluation (pour structure d'accueil)
  rapportsEvalStats = {
    totalSoumis: 0,
    valides: 0,
    enAttente: 0,  // Soumis + Lu par PNVB
    rejetes: 0,
    evolution: [] as { date: string; count: number }[]
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private partenaireService: PartenaireService,
    private projectService: ProjectService,
    private rapportPtfService: RapportsPtfConsultationService,
    private rapportEvalService: RapportService,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    const userSub = this.authService.currentUser$.pipe(
      filter(user => user !== null && user !== undefined),
      take(1)
    ).subscribe({
      next: (user: any) => {
        if (!user?.id) {
          this.isLoading = false;
          this.erreurChargement = 'ID utilisateur manquant';
          return;
        }
        this.currentUser = user;
        this.chargerToutesLesDonnees(user.id);
      },
      error: () => {
        this.isLoading = false;
        this.erreurChargement = 'Erreur de chargement des données utilisateur';
      }
    });
    this.subscriptions.push(userSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private chargerToutesLesDonnees(partenaireId: string | number): void {
    this.isLoading = true;
    this.erreurChargement = '';

    const chargementSub = forkJoin({
      partenaire: this.partenaireService.getById(partenaireId).pipe(catchError(() => of(null))),
      statsGenerales: this.partenaireService.getDashboardStats(partenaireId).pipe(catchError(() => of(null))),
      statsProjets: this.projectService.getStatsByPartenaire(partenaireId).pipe(
        catchError(() => of({ total: 0, en_attente: 0, actifs: 0, clotures: 0, volontairesAffectes: 0 }))
      ),
      dashboardAdapte: this.partenaireService.getDashboardAdapte(partenaireId).pipe(catchError(() => of(null))),
      statsRapports: this.rapportPtfService.getStatsConsultation(String(partenaireId)).pipe(catchError(() => of(null))),
      totalRapports: this.rapportPtfService.getRapportsForPTF(String(partenaireId), { page: 1, limit: 1 }).pipe(
        catchError(() => of({ rapports: [], total: 0 }))
      ),
      // ✅ Utilisation du RapportService pour les rapports d'évaluation
      rapportsEval: this.rapportEvalService.getRapportsByPartenaire(partenaireId).pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: (resultat) => {
        // Partenaire
        if (resultat.partenaire) {
          this.partenaireData = resultat.partenaire;
          this.isPTF = this.permissionService.estPTF(resultat.partenaire);
        }

        // Stats rapports PTF
        if (resultat.statsRapports) {
          this.statsRapports = resultat.statsRapports;
        }
        this.totalRapportsPTF = (resultat.totalRapports as any)?.total ?? 0;

        // Stats projets
        this.projetsStats = {
          en_attente:          resultat.statsProjets?.en_attente          ?? 0,
          actifs:              resultat.statsProjets?.actifs              ?? 0,
          clotures:            resultat.statsProjets?.clotures            ?? 0,
          total:               resultat.statsProjets?.total               ?? 0,
          volontairesAffectes: resultat.statsProjets?.volontairesAffectes ?? 0,
          limiteProjets:       10
        };

        // ✅ Traitement des rapports d'évaluation
        const rapports = resultat.rapportsEval || [];
        this.rapportsEvalStats.totalSoumis = rapports.length;
        
        // ✅ Correction des catégories :
        // - Validés = statut 'Validé'
        // - En attente = statut 'Soumis' ou 'Lu par PNVB'
        // - Rejetés = statut 'Rejeté'
        this.rapportsEvalStats.valides = rapports.filter(r => r.statut === 'Validé').length;
        this.rapportsEvalStats.enAttente = rapports.filter(r => 
          r.statut === 'Soumis' || r.statut === 'Lu par PNVB'
        ).length;
        this.rapportsEvalStats.rejetes = rapports.filter(r => r.statut === 'Rejeté').length;
        this.rapportsEvalStats.evolution = this.calculerEvolutionRapports(rapports);

        // Stats générales
        if (resultat.dashboardAdapte?.dashboardStructure) {
          this.stats = { ...resultat.dashboardAdapte.dashboardStructure };
        } else if (resultat.dashboardAdapte?.dashboardPTF) {
          this.stats = this.adapterStatsPTF(resultat.dashboardAdapte.dashboardPTF);
        } else if (resultat.statsGenerales) {
          this.stats = { ...resultat.statsGenerales };
        } else {
          this.stats = this.getStatsParDefaut();
        }

        if (!this.isPTF) {
          this.fusionnerStatsAvecProjets();
          this.ajouterAlertesProjets();
          this.verifierLimiteProjetsPartenaire();
          
          // ✅ Alerte pour rapports en attente (Soumis ou Lu par PNVB)
          if (this.rapportsEvalStats.enAttente > 0) {
            const alerteExistante = this.stats.alertes?.some(a => a.type === 'rapport_a_soumettre');
            if (!alerteExistante) {
              const alerte: Alerte = {
                id: Date.now(),
                type: 'rapport_a_soumettre',
                titre: 'Rapports en attente de validation',
                message: `Vous avez ${this.rapportsEvalStats.enAttente} rapport(s) en attente de validation.`,
                date: new Date().toISOString(),
                lu: false,
                lien: '/features/partenaires/rapports'
              };
              this.stats.alertes = [alerte, ...(this.stats.alertes || [])].slice(0, 10);
            }
          }
        }

        this.genererEvolutionSiNecessaire();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement dashboard:', err);
        this.erreurChargement = 'Erreur lors du chargement des données';
        this.isLoading = false;
      }
    });

    this.subscriptions.push(chargementSub);
  }

  // Calcul de l'évolution des rapports sur 7 jours
  private calculerEvolutionRapports(rapports: any[]): { date: string; count: number }[] {
    const result: { date: string; count: number }[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = rapports.filter(r => {
        if (!r.dateSoumission) return false;
        const rDate = new Date(r.dateSoumission).toISOString().split('T')[0];
        return rDate === dateStr;
      }).length;
      
      result.push({ date: dateStr, count });
    }
    return result;
  }

  // ==================== GETTERS RAPPORTS D'ÉVALUATION ====================
  
  getTotalRapportsSoumis(): number {
    return this.rapportsEvalStats.totalSoumis;
  }
  
  getRapportsValides(): number {
    return this.rapportsEvalStats.valides;
  }
  
  getRapportsEnAttente(): number {
    return this.rapportsEvalStats.enAttente;
  }
  
  getRapportsRejetes(): number {
    return this.rapportsEvalStats.rejetes;
  }
  
  getEvolutionRapports(): { date: string; count: number }[] {
    return this.rapportsEvalStats.evolution;
  }
  
  getMaxRapports(): number {
    const evo = this.getEvolutionRapports();
    if (!evo.length) return 5;
    const max = Math.max(...evo.map(d => d.count));
    return max > 0 ? max : 5;
  }

  // ==================== STATS PTF ====================

  getTotalRapportsPTF():    number { return this.totalRapportsPTF ?? 0; }
  getRapportsConsultes():   number { return this.statsRapports?.rapportsConsultes   ?? 0; }
  getRapportsNonConsultes():number { return Math.max(0, this.getTotalRapportsPTF() - this.getRapportsConsultes()); }

  getDerniereConsultation(): string {
    const d = this.statsRapports?.derniereConsultation;
    if (!d) return 'Jamais';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getPourcentageConsultation(): number {
    const total = this.getTotalRapportsPTF();
    if (total === 0) return 0;
    return Math.min(100, Math.round((this.getRapportsConsultes() / total) * 100));
  }

  // ==================== MÉTHODES STATS PROJETS ====================

  private fusionnerStatsAvecProjets(): void {
    this.stats = {
      ...this.stats,
      totalProjets:       this.projetsStats.total               ?? this.stats.totalProjets      ?? 0,
      projetsActifs:      this.projetsStats.actifs              ?? this.stats.projetsActifs      ?? 0,
      projetsEnAttente:   this.projetsStats.en_attente          ?? this.stats.projetsEnAttente   ?? 0,
      projetsTermines:    this.projetsStats.clotures            ?? this.stats.projetsTermines    ?? 0,
      volontairesActuels: this.projetsStats.volontairesAffectes ?? this.stats.volontairesActuels ?? 0
    };
  }

  private genererEvolutionSiNecessaire(): void {
    if (!this.stats.evolutionCandidatures?.length) {
      this.stats.evolutionCandidatures = this.genererEvolutionFromProjets();
    }
  }

  private ajouterAlertesProjets(): void {
    if (this.projetsStats.en_attente > 0) {
      const alerteExistante = this.stats.alertes?.some(a => a.type === 'action_requise');
      if (!alerteExistante) {
        const alerte: Alerte = {
          id: Date.now(),
          titre: 'Projets en attente de validation',
          message: `Vous avez ${this.projetsStats.en_attente} projet(s) en attente.`,
          type: 'action_requise',
          date: new Date().toISOString(),
          lu: false
        };
        this.stats.alertes = [alerte, ...(this.stats.alertes || [])].slice(0, 10);
      }
    }
  }

  private verifierLimiteProjetsPartenaire(): void {
    const projetsActuels = this.getProjetsActuelsCount();
    const limite         = this.projetsStats.limiteProjets;
    if (projetsActuels >= limite) {
      const alerte: Alerte = {
        id: Date.now(),
        titre: 'Limite de projets atteinte',
        message: `Limite de ${limite} projets actifs/en attente atteinte.`,
        type: 'action_requise',
        date: new Date().toISOString(),
        lu: false
      };
      this.stats.alertes = [alerte, ...(this.stats.alertes || [])].slice(0, 10);
    }
  }

  private adapterStatsPTF(dataPTF: any): PartenaireDashboardStats {
    return {
      totalProjets:          0,
      projetsActifs:         0,
      projetsEnAttente:      0,
      projetsTermines:       0,
      totalCandidatures:     0,
      nouvellesCandidatures: 0,
      volontairesActuels:    0,
      evolutionCandidatures: this.genererEvolutionRapports(),
      alertes:               dataPTF?.alertes || []
    };
  }

  private genererEvolutionRapports(): { date: string; count: number }[] {
    const today    = new Date();
    const consultes = this.getRapportsConsultes();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date:  date.toISOString().split('T')[0],
        count: Math.floor((consultes / 7) * (i + 1))
      };
    });
  }

  private genererEvolutionFromProjets(): { date: string; count: number }[] {
    const today     = new Date();
    const baseCount = this.projetsStats.volontairesAffectes || 0;
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date:  date.toISOString().split('T')[0],
        count: Math.floor((baseCount / 7) * (i + 1))
      };
    });
  }

  private getStatsParDefaut(): PartenaireDashboardStats {
    return {
      totalProjets: 0, projetsActifs: 0, projetsEnAttente: 0,
      projetsTermines: 0, totalCandidatures: 0, nouvellesCandidatures: 0,
      volontairesActuels: 0, evolutionCandidatures: [], alertes: []
    };
  }

  // ==================== GETTERS PROJETS ====================

  getTotalProjets():          number { return this.stats.totalProjets          ?? 0; }
  getProjetsActifs():         number { return this.stats.projetsActifs          ?? 0; }
  getProjetsEnAttente():      number { return this.stats.projetsEnAttente       ?? 0; }
  getProjetsTermines():       number { return this.stats.projetsTermines        ?? 0; }
  getTotalCandidatures():     number { return this.stats.totalCandidatures      ?? 0; }
  getNouvellesCandidatures(): number { return this.stats.nouvellesCandidatures  ?? 0; }
  getVolontairesActuels():    number { return this.stats.volontairesActuels     ?? 0; }

  getProjetsActuelsCount(): number {
    return (this.projetsStats.actifs ?? 0) + (this.projetsStats.en_attente ?? 0);
  }
  getLimiteProjets():    number  { return this.projetsStats.limiteProjets ?? 10; }
  getPourcentageLimite(): number {
    const total = this.getProjetsActuelsCount();
    const limite = this.getLimiteProjets();
    return limite > 0 ? Math.min(100, (total / limite) * 100) : 0;
  }
  estProcheLimite(): boolean {
    return this.getProjetsActuelsCount() >= this.getLimiteProjets() * 0.8 && !this.aAtteintLimite();
  }
  aAtteintLimite(): boolean {
    return this.getProjetsActuelsCount() >= this.getLimiteProjets();
  }

  // ==================== GRAPHIQUE ====================

  hasEvolutionData(): boolean {
    if (!this.isPTF) {
      return (this.getEvolutionRapports().length ?? 0) > 0;
    }
    return (this.stats.evolutionCandidatures?.length ?? 0) > 0;
  }

  getLast7Days(): { date: string; count: number }[] {
    if (!this.isPTF) {
      return this.getEvolutionRapports().slice(-7);
    }
    return this.stats.evolutionCandidatures?.slice(-7) ?? [];
  }

  getMaxCandidatures(): number {
    if (!this.isPTF) {
      const evo = this.getEvolutionRapports();
      if (!evo.length) return 5;
      const max = Math.max(...evo.map(d => d.count));
      return max > 0 ? max : 5;
    }
    if (!this.stats.evolutionCandidatures?.length) return 10;
    const max = Math.max(...this.stats.evolutionCandidatures.map(d => d.count));
    return max > 0 ? max : 10;
  }

  // ==================== ALERTES ====================

  hasAlerts(): boolean { return (this.stats.alertes?.length ?? 0) > 0; }
  getRecentAlerts(): Alerte[] { return this.stats.alertes?.slice(0, 5) ?? []; }
  getUnreadAlertsCount(): number { return this.stats.alertes?.filter(a => !a.lu).length ?? 0; }

  marquerCommeLue(alerte: Alerte): void {
    alerte.lu = true;
    if (this.partenaireService.marquerAlerteCommeLue) {
      const sub = this.partenaireService.marquerAlerteCommeLue(alerte.id).subscribe({
        error: (e: any) => console.warn('⚠️ Erreur marquage:', e)
      });
      this.subscriptions.push(sub);
    }
  }

  getIconAlerte(type: string): string {
    const icons: { [k: string]: string } = {
      nouvelle_candidature: 'person_add', projet_echeance: 'event',
      action_requise: 'warning', rapport_a_soumettre: 'description', validation_requise: 'check_circle'
    };
    return icons[type] || 'notifications';
  }

  getColorAlerte(type: string): string {
    const colors: { [k: string]: string } = {
      nouvelle_candidature: 'text-success', projet_echeance: 'text-warning',
      action_requise: 'text-danger', rapport_a_soumettre: 'text-info', validation_requise: 'text-primary'
    };
    return colors[type] || 'text-primary';
  }

  onAlerteAction(alerte: Alerte): void {
    const routes: { [k: string]: string } = {
      nouvelle_candidature: '/features/partenaires/candidatures',
      projet_echeance:      '/features/partenaires/projets',
      action_requise:       '/features/partenaires/actions',
      rapport_a_soumettre:  '/features/partenaires/rapports'
    };
    window.location.href = routes[alerte.type] || '/features/partenaires/dashboard';
  }

  // ==================== PERMISSIONS ====================

  peutCreerProjets(): boolean {
    return (this.partenaireData?.permissions?.peutCreerProjets ?? false) && !this.aAtteintLimite();
  }
  estPTF(): boolean { return this.isPTF; }

  getTypeStructure(): string {
    const types: { [k: string]: string } = {
      'Public-Administration': 'Administration Publique', 'Public-Collectivite': 'Collectivité Territoriale',
      'SocieteCivile': 'Société Civile', 'SecteurPrive': 'Secteur Privé',
      'PTF': 'Partenaire Technique et Financier', 'InstitutionAcademique': 'Institution Académique'
    };
    const premier = this.partenaireData?.typeStructures?.[0];
    return premier ? (types[premier] || premier) : 'Partenaire';
  }

  getTypeStructures(): string[] {
    const types: { [k: string]: string } = {
      'Public-Administration': 'Administration Publique', 'Public-Collectivite': 'Collectivité Territoriale',
      'SocieteCivile': 'Société Civile', 'SecteurPrive': 'Secteur Privé',
      'PTF': 'Partenaire Technique et Financier', 'InstitutionAcademique': 'Institution Académique'
    };
    return this.partenaireData?.typeStructures?.map(t => types[t] || t) ?? ['Partenaire'];
  }

  aRolesMultiples():        boolean { return (this.partenaireData?.typeStructures?.length ?? 0) > 1; }
  isPartenaireDataLoaded(): boolean { return this.partenaireData !== null; }
  peutGererVolontaires():   boolean { return this.partenaireData?.permissions?.peutGererVolontaires ?? true; }
  aAccesZonePTF():          boolean { return this.partenaireData?.typeStructures?.includes('PTF') ?? false; }
}