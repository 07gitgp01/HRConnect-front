// src/app/features/admin/gest-parten/partenaires-list/partenaires-list.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Partenaire, TypeStructurePNVB } from '../../../models/partenaire.model';
import { PartenaireService } from '../../../services/service_parten/partenaire.service';
import { PermissionService } from '../../../services/permission.service';
import { RapportsPtfConsultationService } from '../../../services/rap_ptf_consul/rapports-ptf-consultation.service';

@Component({
  selector: 'app-partenaires-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './partenaires-list.component.html',
  styleUrls: ['./partenaires-list.component.css']
})
export class PartenairesListComponent implements OnInit {
  partenaires: Partenaire[] = [];
  filteredPartenaires: Partenaire[] = [];
  searchTerm = '';
  isLoading = true;
  isLoadingStats = true;
  filterActif = '';
  filterType = '';

  // ✅ Cache pour les totaux
  totalProjetsCache = 0;
  totalVolontairesCache = 0;
  activeProjectsCache = 0;
  activeVolunteersCache = 0;

  statsGlobales = {
    totalPartenaires: 0,
    partenairesActifs: 0,
    partenairesInactifs: 0,
    types: {} as { [key: string]: number },
    statsRoles: { totalPTF: 0, totalStructuresAccueil: 0, totalMixtes: 0 }
  };

  constructor(
    private partenaireService: PartenaireService,
    private permissionService: PermissionService,
    private rapportService: RapportsPtfConsultationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPartenaires();
    this.loadStatsGlobales();
  }

  loadPartenaires() {
    this.isLoading = true;
    this.isLoadingStats = true;
    this.partenaireService.getAll().subscribe({
      next: (data) => {
        this.partenaires = data;
        this.filteredPartenaires = data;
        this.calculateStatsForPartenaires();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement partenaires', err);
        this.isLoading = false;
        this.isLoadingStats = false;
      }
    });
  }

  loadStatsGlobales() {
    this.partenaireService.getStatsGlobales().subscribe({
      next: (stats) => { 
        this.statsGlobales = stats;
        console.log('📊 Stats globales chargées:', stats);
      },
      error: (err) => { console.error('Erreur stats globales', err); }
    });
  }

  calculateStatsForPartenaires() {
    let completedCalls = 0;
    const totalCalls = this.partenaires.length;
    
    if (totalCalls === 0) {
      this.updateTotalsCache();
      this.isLoadingStats = false;
      return;
    }
    
    this.partenaires.forEach(partenaire => {
      if (!partenaire.id) {
        partenaire.stats = this.getStatsParDefaut();
        partenaire.statsPTF = this.getStatsPTFParDefaut();
        completedCalls++;
        if (completedCalls === totalCalls) {
          this.updateTotalsCache();
          this.isLoadingStats = false;
        }
        return;
      }

      // ✅ PTF → charger stats de consultation de rapports
      if (this.isPTF(partenaire)) {
        this.rapportService.getStatsConsultation(String(partenaire.id)).subscribe({
          next: (stats) => {
            partenaire.statsPTF = {
              totalRapports: stats.totalRapports ?? 0,
              rapportsConsultes: stats.rapportsConsultes ?? 0,
              rapportsNonConsultes: (stats.totalRapports ?? 0) - (stats.rapportsConsultes ?? 0),
              tauxConsultation: stats.tauxConsultation ?? 0,
              derniereConsultation: stats.derniereConsultation ?? null
            };
            completedCalls++;
            if (completedCalls === totalCalls) {
              this.updateTotalsCache();
              this.isLoadingStats = false;
            }
          },
          error: () => {
            partenaire.statsPTF = this.getStatsPTFParDefaut();
            completedCalls++;
            if (completedCalls === totalCalls) {
              this.updateTotalsCache();
              this.isLoadingStats = false;
            }
          }
        });

      // ✅ Structure d'accueil → charger stats projets/volontaires
      } else {
        this.partenaireService.getStatsCompletesPartenaire(partenaire.id).subscribe({
          next: (statsCompletes) => {
            partenaire.stats = {
              totalProjets: statsCompletes.totalProjets ?? 0,
              projetsActifs: statsCompletes.projetsActifs ?? 0,
              projetsTermines: statsCompletes.projetsTermines ?? 0,
              projetsEnAttente: statsCompletes.projetsEnAttente ?? 0,
              volontairesAffectes: statsCompletes.volontairesAffectes ?? 0,
              dateDernierProjet: statsCompletes.dateDernierProjet,
              statsParType: statsCompletes.statsParType || {}
            };
            completedCalls++;
            if (completedCalls === totalCalls) {
              this.updateTotalsCache();
              this.isLoadingStats = false;
            }
          },
          error: () => {
            partenaire.stats = this.getStatsParDefaut();
            completedCalls++;
            if (completedCalls === totalCalls) {
              this.updateTotalsCache();
              this.isLoadingStats = false;
            }
          }
        });
      }
    });
  }

  // ✅ Mettre à jour le cache des totaux
  updateTotalsCache() {
    this.totalProjetsCache = this.partenaires.reduce((total, p) => total + (p.stats?.totalProjets || 0), 0);
    this.totalVolontairesCache = this.partenaires.reduce((total, p) => total + (p.stats?.volontairesAffectes || 0), 0);
    this.activeProjectsCache = this.partenaires.reduce((total, p) => total + (p.stats?.projetsActifs || 0), 0);
    this.activeVolunteersCache = this.partenaires.reduce((total, p) => total + (p.stats?.volontairesAffectes || 0), 0);
    
    console.log('📊 Totaux mis à jour:', {
      totalProjets: this.totalProjetsCache,
      totalVolontaires: this.totalVolontairesCache,
      activeProjects: this.activeProjectsCache,
      activeVolunteers: this.activeVolunteersCache
    });
  }

  private getStatsParDefaut() {
    return {
      totalProjets: 0, projetsActifs: 0, projetsTermines: 0,
      projetsEnAttente: 0, volontairesAffectes: 0,
      dateDernierProjet: undefined, statsParType: {}
    };
  }

  private getStatsPTFParDefaut() {
    return {
      totalRapports: 0, rapportsConsultes: 0, rapportsNonConsultes: 0,
      tauxConsultation: 0, derniereConsultation: null
    };
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase();
    this.filteredPartenaires = this.partenaires.filter(p =>
      p.nomStructure?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.typeStructures?.some(t => t.toLowerCase().includes(term)) ||
      p.description?.toLowerCase().includes(term)
    );
    if (this.filterActif) {
      this.filteredPartenaires = this.filteredPartenaires.filter(p =>
        this.filterActif === 'actif'
          ? (p.estActive || p.compteActive)
          : (!p.estActive && !p.compteActive)
      );
    }
    if (this.filterType) {
      this.filteredPartenaires = this.filteredPartenaires.filter(p =>
        p.typeStructures?.includes(this.filterType as TypeStructurePNVB)
      );
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.filterActif = '';
    this.filterType = '';
    this.applyFilter();
  }

  toggleAccountStatus(partenaire: Partenaire) {
    if (!partenaire.id) return;
    const newStatus = !(partenaire.estActive || partenaire.compteActive);
    const action = newStatus ? 'activer' : 'désactiver';
    if (confirm(`Êtes-vous sûr de vouloir ${action} le compte de ${partenaire.nomStructure} ?`)) {
      this.partenaireService.toggleAccountStatus(partenaire.id, newStatus).subscribe({
        next: () => {
          partenaire.estActive = newStatus;
          partenaire.compteActive = newStatus;
          this.loadStatsGlobales();
        },
        error: () => alert('Erreur lors du changement de statut')
      });
    }
  }

  deletePartenaire(id?: number | string) {
    if (!id) return;
    this.partenaireService.getProjetsByPartenaire(id).subscribe({
      next: (projets) => {
        if (projets?.length > 0) {
          alert('Impossible de supprimer ce partenaire : il a des projets associés.');
          return;
        }
        if (confirm('Supprimer définitivement ce partenaire ? Cette action est irréversible.')) {
          this.partenaireService.delete(id).subscribe({
            next: () => {
              this.partenaires = this.partenaires.filter(p => p.id !== id);
              this.filteredPartenaires = this.filteredPartenaires.filter(p => p.id !== id);
              this.loadStatsGlobales();
            },
            error: () => alert('Erreur lors de la suppression')
          });
        }
      },
      error: () => alert('Erreur lors de la vérification des projets associés')
    });
  }

  addPartenaire() { this.router.navigate(['/features/admin/partenaires/creer']); }
  editPartenaire(id?: number | string) { if (id) this.router.navigate(['/features/admin/partenaires/edit', id]); }
  viewDetails(id?: number | string) { if (id) this.router.navigate(['/features/admin/partenaires/detail', id]); }
  viewProjets(id?: number | string) { if (id) this.router.navigate(['/features/admin/projets'], { queryParams: { partenaire: id } }); }

  // ─── Utilitaires affichage ────────────────────────────────────────────────

  getStatusBadgeClass(actif: boolean | undefined): string { 
    return actif ? 'badge bg-success' : 'badge bg-secondary'; 
  }
  
  getStatusText(actif: boolean | undefined): string { 
    return actif ? 'Actif' : 'Inactif'; 
  }
  
  // ✅ Méthodes utilisant le cache
  getTotalProjets(): number { 
    return this.totalProjetsCache; 
  }
  
  getTotalVolontaires(): number { 
    return this.totalVolontairesCache; 
  }
  
  getActiveProjects(): number { 
    return this.activeProjectsCache; 
  }
  
  getActiveVolunteers(): number { 
    return this.activeVolunteersCache; 
  }

  getTypeColor(p: Partenaire): string {
    const colors: { [k: string]: string } = {
      'Public-Administration': 'bg-primary', 'Public-Collectivite': 'bg-success',
      'SocieteCivile': 'bg-info', 'SecteurPrive': 'bg-warning',
      'PTF': 'bg-purple', 'InstitutionAcademique': 'bg-secondary'
    };
    return colors[p.typeStructures?.[0] || ''] || 'bg-secondary';
  }

  getTypeDisplay(p: Partenaire): string {
    const types: { [k: string]: string } = {
      'Public-Administration': 'Administration Publique', 'Public-Collectivite': 'Collectivité Territoriale',
      'SocieteCivile': 'Société Civile', 'SecteurPrive': 'Secteur Privé',
      'PTF': 'Partenaire Technique et Financier', 'InstitutionAcademique': 'Institution Académique'
    };
    const t = p.typeStructures?.[0];
    return t ? (types[t] || t) : 'Non spécifié';
  }

  getAllTypesDisplay(p: Partenaire): string {
    const types: { [k: string]: string } = {
      'Public-Administration': 'Admin. Publique', 'Public-Collectivite': 'Collectivité',
      'SocieteCivile': 'Société Civile', 'SecteurPrive': 'Secteur Privé',
      'PTF': 'PTF', 'InstitutionAcademique': 'Institution Acad.'
    };
    return p.typeStructures?.map(t => types[t] || t).join(', ') || 'Non spécifié';
  }

  getTypeDisplayShort(typeKey: string): string {
    const types: { [k: string]: string } = {
      'Public-Administration': 'Admin. Pub.', 'Public-Collectivite': 'Collectivité',
      'SocieteCivile': 'Société Civile', 'SecteurPrive': 'Secteur Privé',
      'PTF': 'PTF', 'InstitutionAcademique': 'Inst. Acad.'
    };
    return types[typeKey] || typeKey;
  }

  hasMultipleTypes(p: Partenaire): boolean { 
    return (p.typeStructures?.length ?? 0) > 1; 
  }
  
  isPTF(p: Partenaire): boolean { 
    return this.permissionService.estPTF(p); 
  }
  
  isStructureAccueil(p: Partenaire): boolean { 
    return this.permissionService.estStructureAccueil(p); 
  }

  getRolePrincipal(p: Partenaire): string {
    if (this.isPTF(p)) return 'PTF';
    if (this.isStructureAccueil(p)) return "Structure d'accueil";
    return 'Partenaire';
  }

  getAvailableTypes(): string[] {
    return [...new Set(this.partenaires.flatMap(p => p.typeStructures || []))];
  }

  getObjectKeys(obj: any): string[] { 
    return obj && typeof obj === 'object' ? Object.keys(obj) : []; 
  }
  
  getObjectValue(obj: any, key: string): any { 
    return obj?.[key] || null; 
  }
  
  hasStatsParType(p: Partenaire): boolean { 
    return !!(p.stats?.statsParType && Object.keys(p.stats.statsParType).length > 0); 
  }
  
  getProjetsByType(p: Partenaire, k: string): number { 
    return p.stats?.statsParType?.[k]?.projets || 0; 
  }

  getRolePercentage(role: string): number {
    if (!this.statsGlobales?.statsRoles) return 0;
    const total = this.statsGlobales.totalPartenaires;
    if (total === 0) return 0;
    let count = 0;
    switch(role) {
      case 'ptf':
        count = this.statsGlobales.statsRoles.totalPTF || 0;
        break;
      case 'structure':
        count = this.statsGlobales.statsRoles.totalStructuresAccueil || 0;
        break;
      case 'mixte':
        count = this.statsGlobales.statsRoles.totalMixtes || 0;
        break;
    }
    return (count / total) * 100;
  }

  getActiveRate(): number {
    if (!this.statsGlobales?.totalPartenaires || this.statsGlobales.totalPartenaires === 0) return 0;
    return Math.round((this.statsGlobales.partenairesActifs / this.statsGlobales.totalPartenaires) * 100);
  }

  getTrendPercentage(): number | null { 
    return null; 
  }
}