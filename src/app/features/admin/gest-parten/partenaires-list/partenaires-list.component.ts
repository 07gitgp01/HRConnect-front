import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Partenaire, TypeStructurePNVB } from '../../../models/partenaire.model';
import { PartenaireService } from '../../../services/service_parten/partenaire.service';
import { PermissionService } from '../../../services/permission.service';

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

  // Filtres avancés
  filterActif = '';
  filterType = '';

  // Statistiques globales
  statsGlobales = {
    totalPartenaires: 0,
    partenairesActifs: 0,
    partenairesInactifs: 0,
    types: {} as { [key: string]: number },
    statsRoles: {
      totalPTF: 0,
      totalStructuresAccueil: 0,
      totalMixtes: 0
    }
  };

  constructor(
    private partenaireService: PartenaireService,
    private permissionService: PermissionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPartenaires();
    this.loadStatsGlobales();
  }

  loadPartenaires() {
    this.isLoading = true;
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
      }
    });
  }

  loadStatsGlobales() {
    this.partenaireService.getStatsGlobales().subscribe({
      next: (stats) => {
        this.statsGlobales = stats;
      },
      error: (err) => {
        console.error('Erreur chargement statistiques', err);
      }
    });
  }

  calculateStatsForPartenaires() {
    this.partenaires.forEach(partenaire => {
      if (partenaire.id) {
        this.partenaireService.getStatsCompletesPartenaire(partenaire.id).subscribe({
          next: (statsCompletes) => {
            partenaire.stats = {
              totalProjets: statsCompletes.totalProjets,
              projetsActifs: statsCompletes.projetsActifs,
              projetsTermines: statsCompletes.projetsTermines,
              projetsEnAttente: statsCompletes.projetsEnAttente,
              volontairesAffectes: statsCompletes.volontairesAffectes,
              dateDernierProjet: statsCompletes.dateDernierProjet,
              statsParType: statsCompletes.statsParType || {}
            };
          },
          error: (err) => {
            console.error('Erreur calcul stats partenaire', err);
            partenaire.stats = this.getStatsParDefaut();
          }
        });
      } else {
        partenaire.stats = this.getStatsParDefaut();
      }
    });
  }

  getStatsParDefaut() {
    return {
      totalProjets: 0,
      projetsActifs: 0,
      projetsTermines: 0,
      projetsEnAttente: 0,
      volontairesAffectes: 0,
      dateDernierProjet: undefined,
      statsParType: {}
    };
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase();
    this.filteredPartenaires = this.partenaires.filter(
      (p) =>
        p.nomStructure?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        (p.typeStructures && p.typeStructures.some(type => 
          type.toLowerCase().includes(term)
        )) ||
        p.description?.toLowerCase().includes(term)
    );

    if (this.filterActif) {
      this.filteredPartenaires = this.filteredPartenaires.filter(p => 
        this.filterActif === 'actif' ? (p.estActive || p.compteActive) : (!p.estActive && !p.compteActive)
      );
    }

    if (this.filterType) {
      this.filteredPartenaires = this.filteredPartenaires.filter(p => 
        p.typeStructures && p.typeStructures.includes(this.filterType as TypeStructurePNVB)
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
        error: (err) => {
          console.error('Erreur changement statut', err);
          alert('Erreur lors du changement de statut');
        }
      });
    }
  }

  deletePartenaire(id?: number) {
    if (!id) return;
    
    this.partenaireService.getProjetsByPartenaire(id).subscribe({
      next: (projets) => {
        if (projets && projets.length > 0) {
          alert('Impossible de supprimer ce partenaire : il a des projets associés. Désactivez plutôt son compte.');
          return;
        }
        
        if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce partenaire ? Cette action est irréversible.')) {
          this.partenaireService.delete(id).subscribe({
            next: () => {
              this.partenaires = this.partenaires.filter((p) => p.id !== id);
              this.applyFilter();
              this.loadStatsGlobales();
            },
            error: (err) => {
              console.error('Erreur suppression', err);
              alert('Erreur lors de la suppression');
            }
          });
        }
      },
      error: (err) => {
        console.error('Erreur vérification projets', err);
        alert('Erreur lors de la vérification des projets associés');
      }
    });
  }

  addPartenaire() {
    this.router.navigate(['/features/admin/partenaires/creer']);
  }

  editPartenaire(id?: number) {
    if (id) this.router.navigate(['/features/admin/partenaires/edit', id]);
  }

  viewDetails(id?: number) {
    if (id) this.router.navigate(['/features/admin/partenaires/detail', id]);
  }

  viewProjets(id?: number) {
    if (id) this.router.navigate(['/features/admin/projets'], { 
      queryParams: { partenaire: id } 
    });
  }

  // Méthodes utilitaires
  getStatusBadgeClass(actif: boolean | undefined): string {
    return actif ? 'badge bg-success' : 'badge bg-secondary';
  }

  getStatusText(actif: boolean | undefined): string {
    return actif ? 'Actif' : 'Inactif';
  }

  getTotalProjets(): number {
    return this.partenaires.reduce((total, p) => total + (p.stats?.totalProjets || 0), 0);
  }

  getTotalVolontaires(): number {
    return this.partenaires.reduce((total, p) => total + (p.stats?.volontairesAffectes || 0), 0);
  }

  getTypeColor(partenaire: Partenaire): string {
    if (!partenaire.typeStructures || partenaire.typeStructures.length === 0) {
      return 'bg-secondary';
    }

    const premierType = partenaire.typeStructures[0];
    const colors: { [key: string]: string } = {
      'Public-Administration': 'bg-primary',
      'Public-Collectivite': 'bg-success',
      'SocieteCivile': 'bg-info',
      'SecteurPrive': 'bg-warning',
      'PTF': 'bg-purple',
      'InstitutionAcademique': 'bg-secondary'
    };
    return colors[premierType] || 'bg-secondary';
  }

  getTypeDisplay(partenaire: Partenaire): string {
    if (!partenaire.typeStructures || partenaire.typeStructures.length === 0) {
      return 'Non spécifié';
    }

    const premierType = partenaire.typeStructures[0];
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

  getAllTypesDisplay(partenaire: Partenaire): string {
    if (!partenaire.typeStructures || partenaire.typeStructures.length === 0) {
      return 'Non spécifié';
    }

    const types: { [key: string]: string } = {
      'Public-Administration': 'Admin. Publique',
      'Public-Collectivite': 'Collectivité',
      'SocieteCivile': 'Société Civile',
      'SecteurPrive': 'Secteur Privé',
      'PTF': 'PTF',
      'InstitutionAcademique': 'Institution Acad.'
    };

    return partenaire.typeStructures
      .map(type => types[type] || type)
      .join(', ');
  }

  hasMultipleTypes(partenaire: Partenaire): boolean {
    return partenaire.typeStructures ? partenaire.typeStructures.length > 1 : false;
  }

  isPTF(partenaire: Partenaire): boolean {
    return this.permissionService.estPTF(partenaire);
  }

  isStructureAccueil(partenaire: Partenaire): boolean {
    return this.permissionService.estStructureAccueil(partenaire);
  }

  getRolePrincipal(partenaire: Partenaire): string {
    if (this.isPTF(partenaire)) {
      return 'PTF';
    }
    if (this.isStructureAccueil(partenaire)) {
      return 'Structure d\'accueil';
    }
    return 'Partenaire';
  }

  getAvailableTypes(): string[] {
    const allTypes = this.partenaires.flatMap(p => p.typeStructures || []);
    return [...new Set(allTypes)];
  }

  getTypeDisplayShort(typeKey: string): string {
    const types: { [key: string]: string } = {
      'Public-Administration': 'Admin. Pub.',
      'Public-Collectivite': 'Collectivité',
      'SocieteCivile': 'Société Civile',
      'SecteurPrive': 'Secteur Privé',
      'PTF': 'PTF',
      'InstitutionAcademique': 'Inst. Acad.'
    };
    return types[typeKey] || typeKey;
  }

  // 🔥 CORRECTION : Méthode sécurisée pour les clés d'objets
  getObjectKeys(obj: any): string[] {
    if (!obj || typeof obj !== 'object') {
      return [];
    }
    return Object.keys(obj);
  }

  // 🔥 CORRECTION : Méthode sécurisée pour les valeurs d'objets
  getObjectValue(obj: any, key: string): any {
    if (!obj || typeof obj !== 'object') {
      return null;
    }
    return obj[key] || null;
  }

  // 🔥 NOUVELLE MÉTHODE : Vérification sécurisée des statistiques par type
  hasStatsParType(partenaire: Partenaire): boolean {
    return !!(partenaire.stats?.statsParType && 
              Object.keys(partenaire.stats.statsParType).length > 0);
  }

  // 🔥 NOUVELLE MÉTHODE : Récupération sécurisée des projets par type
  getProjetsByType(partenaire: Partenaire, typeKey: string): number {
    if (!partenaire.stats?.statsParType?.[typeKey]) {
      return 0;
    }
    return partenaire.stats.statsParType[typeKey].projets || 0;
  }
}