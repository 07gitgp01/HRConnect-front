// src/app/features/partenaires/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PartenaireService } from '../../services/service_parten/partenaire.service';
import { ProjectService } from '../../services/service_projects/projects.service';
import { PartenaireDashboardStats, Alerte, Partenaire } from '../../models/partenaire.model';
import { AuthService } from '../../services/service_auth/auth.service';
import { PermissionService } from '../../services/permission.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  // ===== DONNÉES PRINCIPALES =====
  stats: PartenaireDashboardStats = this.getStatsParDefaut();
  isLoading = true;
  currentUser: any;
  partenaireData: Partenaire | null = null;
  erreurChargement = '';
  isPTF = false;
  
  // ===== STATS PROJET SPÉCIFIQUES =====
  projetsStats: any = {
    en_attente: 0,
    actifs: 0,
    clotures: 0,
    total: 0,
    volontairesAffectes: 0,
    limiteProjets: 10
  };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private partenaireService: PartenaireService,
    private projectService: ProjectService,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Dashboard partenaire initialisation');
    
    const userSub = this.authService.currentUser$.subscribe({
      next: (user) => {
        console.log('👤 User reçu dans dashboard partenaire:', user);
        
        if (!user) {
          console.error('❌ User est null/undefined');
          this.isLoading = false;
          this.erreurChargement = 'Utilisateur non connecté';
          return;
        }
        
        if (!user.id) {
          console.error('❌ User ID manquant:', user);
          this.isLoading = false;
          this.erreurChargement = 'ID utilisateur manquant';
          return;
        }
        
        const partenaireId = user.id;
        console.log('🔢 ID partenaire:', partenaireId, 'Type:', typeof partenaireId);
        
        this.currentUser = user;
        this.chargerToutesLesDonnees(partenaireId);
      },
      error: (error: any) => {
        console.error('❌ Erreur observable user:', error);
        this.isLoading = false;
        this.erreurChargement = 'Erreur de chargement des données utilisateur';
      }
    });
    
    this.subscriptions.push(userSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * ✅ MÉTHODE UNIFIÉE: Charge toutes les données en parallèle
   */
  private chargerToutesLesDonnees(partenaireId: string | number): void {
    console.log('📥 Chargement données partenaire:', {
      partenaireId,
      type: typeof partenaireId
    });
    
    this.isLoading = true;
    this.erreurChargement = '';

    const chargementSub = forkJoin({
      // 1. Données du partenaire
      partenaire: this.partenaireService.getById(partenaireId).pipe(
        catchError(error => {
          console.error('❌ Erreur chargement partenaire:', error);
          return of(null);
        })
      ),
      
      // 2. Stats générales du partenaire (depuis PartenaireService)
      statsGenerales: this.partenaireService.getDashboardStats(partenaireId).pipe(
        catchError(error => {
          console.error('❌ Erreur stats générales:', error);
          return of(null);
        })
      ),
      
      // 3. Stats des projets (depuis ProjectService)
      statsProjets: this.projectService.getStatsByPartenaire(partenaireId).pipe(
        catchError(error => {
          console.error('❌ Erreur stats projets:', error);
          return of({
            total: 0,
            en_attente: 0,
            actifs: 0,
            clotures: 0,
            volontairesAffectes: 0
          });
        })
      ),
      
      // 4. Dashboard adapté (si disponible)
      dashboardAdapte: this.partenaireService.getDashboardAdapte(partenaireId).pipe(
        catchError(error => {
          console.error('❌ Erreur dashboard adapté:', error);
          return of(null);
        })
      )
    }).subscribe({
      next: (resultat) => {
        console.log('✅ Toutes les données chargées:', {
          partenaire: resultat.partenaire ? '✅ OK' : '❌ NULL',
          statsGenerales: resultat.statsGenerales ? '✅ OK' : '⚠️ NULL',
          statsProjets: '✅ OK',
          dashboardAdapte: resultat.dashboardAdapte ? '✅ OK' : '⚠️ NULL'
        });
        
        console.log('📊 Données brutes:', {
          statsProjets: resultat.statsProjets,
          statsGenerales: resultat.statsGenerales
        });
        
        // 1. Appliquer les données du partenaire
        if (resultat.partenaire) {
          this.partenaireData = resultat.partenaire;
          this.isPTF = this.permissionService.estPTF(resultat.partenaire);
          // CORRIGER LA LIGNE 168 (et les autres lignes similaires)
console.log('✅ Partenaire data appliquée:', {
  nom: this.partenaireData.nomStructure,  // ❌ nom → ✅ nomStructure
  typeStructures: this.partenaireData.typeStructures,
  isPTF: this.isPTF
});
        }
        
        // 2. Mettre à jour projetsStats avec les données du ProjectService
        this.projetsStats = {
          en_attente: resultat.statsProjets.en_attente ?? 0,
          actifs: resultat.statsProjets.actifs ?? 0,
          clotures: resultat.statsProjets.clotures ?? 0,
          total: resultat.statsProjets.total ?? 0,
          volontairesAffectes: resultat.statsProjets.volontairesAffectes ?? 0,
          limiteProjets: 10
        };
        
        console.log('📊 projetsStats mis à jour:', this.projetsStats);
        
        // 3. Construire les stats finales
        if (resultat.dashboardAdapte) {
          // Si on a un dashboard adapté, l'utiliser comme base
          if (resultat.dashboardAdapte.dashboardStructure) {
            this.stats = { ...resultat.dashboardAdapte.dashboardStructure };
          } else if (resultat.dashboardAdapte.dashboardPTF) {
            this.stats = this.adapterStatsPTF(resultat.dashboardAdapte.dashboardPTF);
          }
        } else if (resultat.statsGenerales) {
          // Sinon utiliser les stats générales
          this.stats = { ...resultat.statsGenerales };
        }
        
        // 4. Fusionner avec les stats projets (priorité aux stats projets)
        this.fusionnerStatsAvecProjets();
        
        // 5. Générer alertes et évolution
        this.ajouterAlertesProjets();
        this.verifierLimiteProjetsPartenaire();
        this.genererEvolutionSiNecessaire();
        
        console.log('📊 Stats finales:', this.stats);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur critique chargement données:', error);
        this.erreurChargement = 'Erreur lors du chargement des données';
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(chargementSub);
  }

  /**
   * Fusionne les stats avec les données des projets
   */
  private fusionnerStatsAvecProjets(): void {
    // Utiliser ?? pour préserver les valeurs 0
    this.stats = {
      ...this.stats,
      totalProjets: this.projetsStats.total ?? this.stats.totalProjets ?? 0,
      projetsActifs: this.projetsStats.actifs ?? this.stats.projetsActifs ?? 0,
      projetsEnAttente: this.projetsStats.en_attente ?? this.stats.projetsEnAttente ?? 0,
      projetsTermines: this.projetsStats.clotures ?? this.stats.projetsTermines ?? 0,
      volontairesActuels: this.projetsStats.volontairesAffectes ?? this.stats.volontairesActuels ?? 0
    };
    
    console.log('🔄 Stats après fusion:', this.stats);
  }

  /**
   * Génère l'évolution si elle n'existe pas déjà
   */
  private genererEvolutionSiNecessaire(): void {
    if (!this.stats.evolutionCandidatures || this.stats.evolutionCandidatures.length === 0) {
      this.stats.evolutionCandidatures = this.genererEvolutionFromProjets();
      console.log('📈 Évolution générée:', this.stats.evolutionCandidatures);
    }
  }

  /**
   * Ajoute les alertes basées sur les stats des projets
   */
  private ajouterAlertesProjets(): void {
    const nouvellesAlertes: Alerte[] = [];
    
    // Alerte: Projets en attente
    if (this.projetsStats.en_attente > 0) {
      nouvellesAlertes.push({
        id: Date.now() + 1,
        titre: 'Projets en attente de validation',
        message: `Vous avez ${this.projetsStats.en_attente} projet(s) en attente de validation par l'administration.`,
        type: 'action_requise',
        date: new Date().toISOString(),
        lu: false
      });
    }
    
    // Alerte: Volontaires actifs
    if (this.projetsStats.volontairesAffectes > 0) {
      nouvellesAlertes.push({
        id: Date.now() + 2,
        titre: 'Volontaires actifs',
        message: `${this.projetsStats.volontairesAffectes} volontaire(s) sont actuellement affectés à vos projets.`,
        type: 'nouvelle_candidature',
        date: new Date().toISOString(),
        lu: false
      });
    }
    
    // Fusionner avec les alertes existantes
    if (nouvellesAlertes.length > 0) {
      const alertesExistantes = this.stats.alertes || [];
      this.stats.alertes = [...nouvellesAlertes, ...alertesExistantes].slice(0, 10);
      console.log('🔔 Alertes générées:', this.stats.alertes.length);
    }
  }

  /**
   * Vérifie la limite de projets et ajoute une alerte si nécessaire
   */
  private verifierLimiteProjetsPartenaire(): void {
    const projetsActuels = this.getProjetsActuelsCount();
    const limite = this.projetsStats.limiteProjets;
    const peutCreer = projetsActuels < limite;
    
    console.log('🔍 Limite projets partenaire:', { 
      peutCreer, 
      projetsActuels,
      limite
    });
    
    if (!peutCreer) {
      const alerte: Alerte = {
        id: Date.now(),
        titre: 'Limite de projets atteinte',
        message: `Vous avez atteint la limite de ${limite} projets actifs/en attente. Vous ne pouvez pas créer de nouveaux projets pour le moment.`,
        type: 'action_requise',
        date: new Date().toISOString(),
        lu: false
      };
      
      const alertesExistantes = this.stats.alertes || [];
      this.stats.alertes = [alerte, ...alertesExistantes].slice(0, 10);
    }
  }

  /**
   * Adapte les stats PTF si nécessaire
   */
  private adapterStatsPTF(dataPTF: any): PartenaireDashboardStats {
    return {
      totalProjets: this.projetsStats.total ?? 0,
      projetsActifs: this.projetsStats.actifs ?? 0,
      projetsEnAttente: 0,
      projetsTermines: this.projetsStats.clotures ?? 0,
      totalCandidatures: this.projetsStats.volontairesAffectes ?? 0,
      nouvellesCandidatures: 0,
      volontairesActuels: this.projetsStats.volontairesAffectes ?? 0,
      evolutionCandidatures: this.genererEvolutionPTF(dataPTF),
      alertes: dataPTF.alertes || []
    };
  }

  /**
   * Génère l'évolution pour PTF
   */
  private genererEvolutionPTF(dataPTF: any): { date: string; count: number }[] {
    const today = new Date();
    const baseCount = this.projetsStats.volontairesAffectes || 0;
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor((baseCount / 7) * (i + 1) * 0.7 + Math.random() * (baseCount / 7) * 0.3)
      };
    });
  }

  /**
   * Génère l'évolution basée sur les projets
   */
  private genererEvolutionFromProjets(): { date: string; count: number }[] {
    const today = new Date();
    const baseCount = this.projetsStats.volontairesAffectes || 0;
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor((baseCount / 7) * (i + 1))
      };
    });
  }

  /**
   * Retourne les stats par défaut
   */
  private getStatsParDefaut(): PartenaireDashboardStats {
    return {
      totalProjets: 0,
      projetsActifs: 0,
      projetsEnAttente: 0,
      projetsTermines: 0,
      totalCandidatures: 0,
      nouvellesCandidatures: 0,
      volontairesActuels: 0,
      evolutionCandidatures: [],
      alertes: []
    };
  }

  // ===== MÉTHODES D'ACCÈS AUX STATS =====
  
  getTotalProjets(): number { 
    return this.stats.totalProjets; 
  }
  
  getProjetsActifs(): number { 
    return this.stats.projetsActifs; 
  }
  
  getProjetsEnAttente(): number { 
    return this.stats.projetsEnAttente; 
  }
  
  getProjetsTermines(): number { 
    return this.stats.projetsTermines; 
  }
  
  getTotalCandidatures(): number { 
    return this.stats.totalCandidatures; 
  }
  
  getNouvellesCandidatures(): number { 
    return this.stats.nouvellesCandidatures; 
  }
  
  getVolontairesActuels(): number { 
    return this.stats.volontairesActuels; 
  }

  // ===== MÉTHODES POUR LA LIMITE DE PROJETS =====
  
  getProjetsActuelsCount(): number {
    return this.projetsStats.actifs + this.projetsStats.en_attente;
  }
  
  getLimiteProjets(): number {
    return this.projetsStats.limiteProjets;
  }
  
  getPourcentageLimite(): number {
    const total = this.getProjetsActuelsCount();
    const limite = this.getLimiteProjets();
    return limite > 0 ? Math.min(100, (total / limite) * 100) : 0;
  }
  
  estProcheLimite(): boolean {
    const total = this.getProjetsActuelsCount();
    const limite = this.getLimiteProjets();
    return total >= limite * 0.8;
  }
  
  aAtteintLimite(): boolean {
    const total = this.getProjetsActuelsCount();
    const limite = this.getLimiteProjets();
    return total >= limite;
  }

  // ===== MÉTHODES POUR LE GRAPHIQUE =====
  
  hasEvolutionData(): boolean { 
    return this.stats.evolutionCandidatures && this.stats.evolutionCandidatures.length > 0; 
  }

  getLast7Days(): { date: string; count: number }[] { 
    return this.stats.evolutionCandidatures.slice(-7); 
  }

  getMaxCandidatures(): number { 
    if (!this.stats.evolutionCandidatures || !this.stats.evolutionCandidatures.length) return 10;
    const max = Math.max(...this.stats.evolutionCandidatures.map(d => d.count));
    return max > 0 ? max : 10;
  }

  // ===== MÉTHODES POUR LES ALERTES =====
  
  hasAlerts(): boolean { 
    return this.stats.alertes && this.stats.alertes.length > 0; 
  }

  getRecentAlerts(): Alerte[] { 
    return this.stats.alertes.slice(0, 5); 
  }

  getUnreadAlertsCount(): number { 
    return this.stats.alertes.filter(a => !a.lu).length; 
  }

  marquerCommeLue(alerte: Alerte): void {
    alerte.lu = true;
    
    // Optionnel: persister sur le serveur
    if (this.partenaireService.marquerAlerteCommeLue) {
      const marquerSub = this.partenaireService.marquerAlerteCommeLue(alerte.id).subscribe({
        next: () => {
          console.log('✅ Alerte marquée comme lue');
        },
        error: (error: any) => {
          console.warn('⚠️ Erreur marquage alerte:', error);
        }
      });
      
      this.subscriptions.push(marquerSub);
    }
  }

  getIconAlerte(type: string): string {
    const icons: { [key: string]: string } = {
      'nouvelle_candidature': 'person_add',
      'projet_echeance': 'event',
      'action_requise': 'warning',
      'rapport_a_soumettre': 'description',
      'validation_requise': 'check_circle'
    };
    return icons[type] || 'notifications';
  }

  getColorAlerte(type: string): string {
    const colors: { [key: string]: string } = {
      'nouvelle_candidature': 'text-success',
      'projet_echeance': 'text-warning',
      'action_requise': 'text-danger',
      'rapport_a_soumettre': 'text-info',
      'validation_requise': 'text-primary'
    };
    return colors[type] || 'text-primary';
  }

  // ===== MÉTHODES DE PERMISSIONS =====
  
  peutCreerProjets(): boolean {
    if (!this.partenaireData) {
      return false;
    }
    
    const peutCreerParDefaut = this.partenaireData.permissions?.peutCreerProjets ?? false;
    const aAtteintLimite = this.aAtteintLimite();
    
    return peutCreerParDefaut && !aAtteintLimite;
  }

  estPTF(): boolean {
    return this.isPTF;
  }

  getTypeStructure(): string {
    if (!this.partenaireData || !this.partenaireData.typeStructures || this.partenaireData.typeStructures.length === 0) {
      return 'Partenaire';
    }
    
    const premierType = this.partenaireData.typeStructures[0];
    const types: { [key: string]: string } = {
      'Public-Administration': 'Administration Publique',
      'Public-Collectivite': 'Collectivité Territoriale',
      'SocieteCivile': 'Société Civile',
      'SecteurPrive': 'Secteur Privé',
      'PTF': 'Partenaire Technique et Financier',
      'InstitutionAcademique': 'Institution Académique'
    };
    
    return types[premierType] || premierType;
  }

  getTypeStructures(): string[] {
    if (!this.partenaireData || !this.partenaireData.typeStructures) {
      return ['Partenaire'];
    }
    
    const types: { [key: string]: string } = {
      'Public-Administration': 'Administration Publique',
      'Public-Collectivite': 'Collectivité Territoriale',
      'SocieteCivile': 'Société Civile',
      'SecteurPrive': 'Secteur Privé',
      'PTF': 'Partenaire Technique et Financier',
      'InstitutionAcademique': 'Institution Académique'
    };
    
    return this.partenaireData.typeStructures.map(type => types[type] || type);
  }

  aRolesMultiples(): boolean {
    if (!this.partenaireData || !this.partenaireData.typeStructures) {
      return false;
    }
    return this.partenaireData.typeStructures.length > 1;
  }

  isPartenaireDataLoaded(): boolean {
    return this.partenaireData !== null;
  }

  peutGererVolontaires(): boolean {
    if (!this.partenaireData) {
      return false;
    }
    return this.partenaireData.permissions?.peutGererVolontaires ?? true;
  }

  aAccesZonePTF(): boolean {
    if (!this.partenaireData) {
      return false;
    }
    return this.partenaireData.typeStructures?.includes('PTF') || false;
  }

  getActionIcon(action: string): string {
    const icons: { [key: string]: string } = {
      'mes-volontaires': 'people',
      'gestion-rapports': 'description',
      'offres-mission': 'work',
      'projets': 'folder_open',
      'soumettre': 'add'
    };
    return icons[action] || 'link';
  }
  
  onAlerteAction(alerte: Alerte): void {
    console.log('🔗 Action sur alerte:', alerte.type);
    const routes: { [key: string]: string } = {
      'nouvelle_candidature': '/features/partenaires/candidatures',
      'projet_echeance': '/features/partenaires/projets',
      'action_requise': '/features/partenaires/actions',
      'rapport_a_soumettre': '/features/partenaires/rapports'
    };
    
    window.location.href = routes[alerte.type] || '/features/partenaires/dashboard';
  }
}