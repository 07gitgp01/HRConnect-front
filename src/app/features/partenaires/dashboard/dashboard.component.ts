// src/app/features/partenaires/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PartenaireService } from '../../services/service_parten/partenaire.service';
import { PartenaireDashboardStats, Alerte, Partenaire } from '../../models/partenaire.model';
import { AuthService } from '../../services/service_auth/auth.service';
import { PermissionService } from '../../services/permission.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-partenaire-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class PartenaireDashboardComponent implements OnInit, OnDestroy {
  stats: PartenaireDashboardStats = this.getStatsParDefaut();
  isLoading = true;
  currentUser: any;
  partenaireData: Partenaire | null = null;
  erreurChargement = '';
  isPTF = false;
  
  // ✅ STATS SPÉCIFIQUES POUR LE PARTENAIRE
  projetsStats: any = {
    en_attente: 0,
    actifs: 0,
    clotures: 0,
    total: 0,
    volontairesAffectes: 0,
    limiteProjets: 10 // Limite configurable
  };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private partenaireService: PartenaireService,
    private authService: AuthService,
    private permissionService: PermissionService
    // ✅ RETIRÉ ProjectService car non disponible
  ) {}

  ngOnInit(): void {
    console.log('🔄 Dashboard partenaire initialisation');
    
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
        this.loadPartenaireData(partenaireId);
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

  loadPartenaireData(partenaireId: string | number): void {
    console.log('🔄 Chargement données partenaire ID:', partenaireId);
    
    const partenaireSub = this.partenaireService.getById(partenaireId).subscribe({
      next: (partenaire: Partenaire) => {
        console.log('✅ Données partenaire chargées:', partenaire);
        this.partenaireData = partenaire;
        this.isPTF = this.permissionService.estPTF(partenaire);
        
        // ✅ CHARGER LES STATS DU PARTENAIRE
        this.loadPartenaireStats(partenaireId);
        
        // ✅ CHARGER LE DASHBOARD ADAPTÉ
        this.loadDashboardAdapte(partenaireId);
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement données partenaire:', error);
        this.isLoading = false;
        this.erreurChargement = 'Erreur lors du chargement des données du partenaire';
      }
    });
    
    this.subscriptions.push(partenaireSub);
  }

  // ✅ MÉTHODE POUR CHARGER LES STATS GÉNÉRALES DU PARTENAIRE
  loadPartenaireStats(partenaireId: string | number): void {
    const generalStatsSub = this.partenaireService.getDashboardStats(partenaireId).subscribe({
      next: (stats: PartenaireDashboardStats) => {
        console.log('📈 Stats générales partenaire:', stats);
        // Fusionner avec les stats existantes
        this.stats = { ...this.stats, ...stats };
        
        // ✅ METTRE À JOUR LES STATS DE PROJETS À PARTIR DES STATS GÉNÉRALES
        this.updateProjetsStatsFromGeneral();
        
        // ✅ AJOUTER DES ALERTES SI PROJETS EN ATTENTE
        this.ajouterAlertesProjets();
        
        // ✅ VÉRIFIER LA LIMITE DE PROJETS POUR CE PARTENAIRE
        this.verifierLimiteProjetsPartenaire(partenaireId);
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement stats générales:', error);
      }
    });
    
    this.subscriptions.push(generalStatsSub);
  }

  // ✅ METTRE À JOUR LES STATS DE PROJETS À PARTIR DES STATS GÉNÉRALES
  updateProjetsStatsFromGeneral(): void {
    this.projetsStats = {
      en_attente: this.stats.projetsEnAttente || 0,
      actifs: this.stats.projetsActifs || 0,
      clotures: this.stats.projetsTermines || 0,
      total: this.stats.totalProjets || 0,
      volontairesAffectes: this.stats.volontairesActuels || 0,
      limiteProjets: 10
    };
  }

  // ✅ VÉRIFIER LA LIMITE DE PROJETS POUR LE PARTENAIRE
  verifierLimiteProjetsPartenaire(partenaireId: string | number): void {
    const projetsActuels = this.getProjetsActuelsCount();
    const limite = this.projetsStats.limiteProjets;
    const peutCreer = projetsActuels < limite;
    
    console.log('🔍 Limite projets partenaire:', { 
      peutCreer, 
      projetsActuels,
      limite
    });
    
    // ✅ AJOUTER UNE ALERTE SI LIMITE ATTEINTE
    if (!peutCreer) {
      const alerte: Alerte = {
        id: Date.now(),
        titre: 'Limite de projets atteinte',
        message: `Vous avez atteint la limite de ${limite} projets actifs/en attente. Vous ne pouvez pas créer de nouveaux projets pour le moment.`,
        type: 'action_requise',
        date: new Date().toISOString(),
        lu: false
      };
      
      this.stats.alertes = [alerte, ...this.stats.alertes].slice(0, 10);
    }
  }

  // ✅ AJOUTER DES ALERTES LIÉES AUX PROJETS
  ajouterAlertesProjets(): void {
    const nouvellesAlertes: Alerte[] = [];
    
    // Projets en attente de validation
    if (this.projetsStats.en_attente > 0) {
      nouvellesAlertes.push({
        id: Date.now() + 1,
        titre: 'Projets en attente',
        message: `Vous avez ${this.projetsStats.en_attente} projet(s) en attente de validation par l'administration.`,
        type: 'action_requise', // ✅ CORRECTION : 'action_requise' au lieu de 'info'
        date: new Date().toISOString(),
        lu: false
      });
    }
    
    // Volontaires affectés
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
    
    // Ajouter aux alertes existantes
    if (nouvellesAlertes.length > 0) {
      this.stats.alertes = [...nouvellesAlertes, ...this.stats.alertes].slice(0, 10);
    }
  }

  loadDashboardAdapte(partenaireId: string | number): void {
    this.isLoading = true;
    this.erreurChargement = '';

    const dashboardSub = this.partenaireService.getDashboardAdapte(partenaireId).subscribe({
      next: (data: any) => {
        console.log('✅ Dashboard adapté chargé:', data);
        
        if (data.dashboardStructure) {
          this.stats = data.dashboardStructure;
        } else if (data.dashboardPTF) {
          this.stats = this.adapterStatsPTF(data.dashboardPTF);
        } else {
          // ✅ UTILISER LES STATS DE PROJETS COMME FALLBACK
          this.stats = this.getStatsAvecProjets();
          this.isLoading = false;
          return;
        }
        
        // ✅ FUSIONNER AVEC LES STATS DE PROJETS
        this.fusionnerStatsAvecProjets();
        
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement dashboard adapté:', error);
        // ✅ UTILISER LES STATS DE PROJETS EN CAS D'ERREUR
        this.stats = this.getStatsAvecProjets();
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(dashboardSub);
  }

  // ✅ CRÉER LES STATS À PARTIR DES PROJETS
  getStatsAvecProjets(): PartenaireDashboardStats {
    return {
      totalProjets: this.projetsStats.total,
      projetsActifs: this.projetsStats.actifs,
      projetsEnAttente: this.projetsStats.en_attente,
      projetsTermines: this.projetsStats.clotures,
      totalCandidatures: this.projetsStats.volontairesAffectes, // Approximation
      nouvellesCandidatures: 0,
      volontairesActuels: this.projetsStats.volontairesAffectes,
      evolutionCandidatures: this.genererEvolutionFromProjets(),
      alertes: this.stats.alertes || []
    };
  }

  fusionnerStatsAvecProjets(): void {
    this.stats = {
      ...this.stats,
      totalProjets: this.projetsStats.total || this.stats.totalProjets,
      projetsActifs: this.projetsStats.actifs || this.stats.projetsActifs,
      projetsEnAttente: this.projetsStats.en_attente || this.stats.projetsEnAttente,
      projetsTermines: this.projetsStats.clotures || this.stats.projetsTermines,
      volontairesActuels: this.projetsStats.volontairesAffectes || this.stats.volontairesActuels
    };
  }

  private adapterStatsPTF(dataPTF: any): PartenaireDashboardStats {
    return {
      totalProjets: this.projetsStats.total,
      projetsActifs: this.projetsStats.actifs,
      projetsEnAttente: 0, // PTF n'a pas de projets en attente
      projetsTermines: this.projetsStats.clotures,
      totalCandidatures: this.projetsStats.volontairesAffectes,
      nouvellesCandidatures: 0,
      volontairesActuels: this.projetsStats.volontairesAffectes,
      evolutionCandidatures: this.genererEvolutionPTF(dataPTF),
      alertes: dataPTF.alertes || []
    };
  }

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

  // ✅ MÉTHODES D'ACCÈS AUX STATS
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

  // ✅ MÉTHODES POUR LA LIMITE DE PROJETS
  getProjetsActuelsCount(): number {
    return this.projetsStats.actifs + this.projetsStats.en_attente;
  }
  
  getLimiteProjets(): number {
    return this.projetsStats.limiteProjets;
  }
  
  getPourcentageLimite(): number {
    const total = this.getProjetsActuelsCount();
    const limite = this.getLimiteProjets();
    return Math.min(100, (total / limite) * 100);
  }
  
  estProcheLimite(): boolean {
    const total = this.getProjetsActuelsCount();
    const limite = this.getLimiteProjets();
    return total >= limite * 0.8; // 80% de la limite
  }
  
  aAtteintLimite(): boolean {
    const total = this.getProjetsActuelsCount();
    const limite = this.getLimiteProjets();
    return total >= limite;
  }

  // ✅ MÉTHODES EXISTANTES
  hasEvolutionData(): boolean { 
    return this.stats.evolutionCandidatures.length > 0; 
  }

  getLast7Days(): { date: string; count: number }[] { 
    return this.stats.evolutionCandidatures.slice(-7); 
  }

  getMaxCandidatures(): number { 
    if (!this.stats.evolutionCandidatures.length) return 10;
    const max = Math.max(...this.stats.evolutionCandidatures.map(d => d.count));
    return max > 0 ? max : 10;
  }

  hasAlerts(): boolean { 
    return this.stats.alertes.length > 0; 
  }

  getRecentAlerts(): Alerte[] { 
    return this.stats.alertes.slice(0, 5); 
  }

  getUnreadAlertsCount(): number { 
    return this.stats.alertes.filter(a => !a.lu).length; 
  }

  marquerCommeLue(alerte: Alerte): void {
    const marquerSub = this.partenaireService.marquerAlerteCommeLue(alerte.id).subscribe({
      next: () => {
        alerte.lu = true;
      },
      error: (error: any) => {
        console.error('Erreur mise à jour alerte', error);
        alerte.lu = true;
      }
    });
    
    this.subscriptions.push(marquerSub);
  }

  getIconAlerte(type: string): string {
    const icons: { [key: string]: string } = {
      'nouvelle_candidature': 'fa-user-plus',
      'projet_echeance': 'fa-calendar-exclamation',
      'action_requise': 'fa-exclamation-triangle',
      'rapport_a_soumettre': 'fa-file-alt',
      'validation_requise': 'fa-check-circle'
    };
    return icons[type] || 'fa-bell';
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

  peutCreerProjets(): boolean {
    if (!this.partenaireData) {
      return false;
    }
    
    // ✅ VÉRIFIER LA LIMITE ET LES PERMISSIONS
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
      'mes-volontaires': 'fa-users',
      'gestion-rapports': 'fa-file-alt',
      'offres-mission': 'fa-briefcase',
      'projets': 'fa-list',
      'soumettre': 'fa-plus'
    };
    return icons[action] || 'fa-link';
  }
  
  // ✅ GESTION DES ACTIONS SUR LES ALERTES
  onAlerteAction(alerte: Alerte): void {
    console.log('Action sur alerte:', alerte);
    // Implémentez la logique de redirection selon le type d'alerte
    switch(alerte.type) {
      case 'nouvelle_candidature':
        // Rediriger vers les candidatures
        window.location.href = '/features/partenaires/candidatures';
        break;
      case 'projet_echeance':
        // Rediriger vers les projets
        window.location.href = '/features/partenaires/projets';
        break;
      case 'action_requise':
        // Rediriger vers les actions requises
        window.location.href = '/features/partenaires/actions';
        break;
      case 'rapport_a_soumettre':
        // Rediriger vers les rapports
        window.location.href = '/features/partenaires/rapports';
        break;
      default:
        // Par défaut vers le tableau de bord
        window.location.href = '/features/partenaires/dashboard';
    }
  }
}