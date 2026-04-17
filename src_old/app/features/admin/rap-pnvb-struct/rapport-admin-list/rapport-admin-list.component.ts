import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PnvbAdminService, RapportAdmin, StatsAdmin, PartenaireStats } from '../../../services/rap-pnvb/pnvb-admin.service';

@Component({
  selector: 'app-rapport-admin-list',
  templateUrl: './rapport-admin-list.component.html',
  styleUrls: ['./rapport-admin-list.component.css']
})
export class RapportAdminListComponent implements OnInit {
  rapports: RapportAdmin[] = [];
  filteredRapports: RapportAdmin[] = [];
  stats: StatsAdmin | null = null;
  partenairesStats: PartenaireStats[] = [];
  topPartenaires: PartenaireStats[] = [];
  
  isLoading = true;
  
  // Filtres avancés
  statutFilter: string = '';
  periodeFilter: string = '';
  partenaireFilter: string | number | null = null;
  dateDebutFilter: string = '';
  dateFinFilter: string = '';
  searchTerm: string = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 15;
  
  // Données pour les filtres
  periodes: string[] = [];
  statuts: string[] = ['Soumis', 'Validé', 'Brouillon', 'Rejeté', 'Lu par PNVB', 'En attente'];
  partenaires: PartenaireStats[] = [];

  constructor(
    private adminService: PnvbAdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.periodes = this.getPeriodesDisponibles();
  }

  // Méthode pour obtenir les périodes disponibles
  getPeriodesDisponibles(): string[] {
    const currentYear = new Date().getFullYear();
    const periodes: string[] = [];
    
    for (let year = currentYear - 2; year <= currentYear; year++) {
      periodes.push(`Semestre 1 ${year}`);
      periodes.push(`Semestre 2 ${year}`);
      periodes.push(`Trimestre 1 ${year}`);
      periodes.push(`Trimestre 2 ${year}`);
      periodes.push(`Trimestre 3 ${year}`);
      periodes.push(`Trimestre 4 ${year}`);
    }
    
    return periodes;
  }

  loadData(): void {
    this.isLoading = true;
    console.log('🔄 Chargement dynamique des données...');
    
    // Charger tous les rapports dynamiquement
    this.adminService.getAllRapports().subscribe({
      next: (data: RapportAdmin[]) => {
        console.log(`✅ ${data.length} rapports dynamiques chargés`);
        this.rapports = data;
        this.filteredRapports = [...data];
        this.isLoading = false;
        
        // Mettre à jour les options de filtre
        this.updateFilterOptions();
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement rapports dynamiques:', error);
        this.isLoading = false;
      }
    });
    
    // Charger les statistiques dynamiquement
    this.adminService.getStatsAdmin().subscribe({
      next: (stats: StatsAdmin) => {
        console.log('📊 Statistiques dynamiques chargées:', stats);
        this.stats = stats;
      },
      error: (error: any) => {
        console.warn('⚠️ Erreur chargement stats, calcul local');
        this.calculerStatsLocales();
      }
    });
    
    // Charger les statistiques par partenaire dynamiquement
    this.adminService.getStatsPartenaires().subscribe({
      next: (data: PartenaireStats[]) => {
        console.log(`👥 ${data.length} statistiques partenaires dynamiques`);
        this.partenairesStats = data;
        this.partenaires = data;
        this.topPartenaires = data
          .sort((a, b) => b.totalRapports - a.totalRapports)
          .slice(0, 5);
      },
      error: (error: any) => {
        console.warn('⚠️ Erreur chargement stats partenaires, calcul local');
        this.calculerStatsPartenairesLocales();
      }
    });
  }

  // Mettre à jour les options de filtre à partir des données
  private updateFilterOptions(): void {
    // Extraire les statuts uniques des rapports
    const statutsUniques = [...new Set(this.rapports.map(r => r.statut).filter(s => s))];
    if (statutsUniques.length > 0) {
      this.statuts = statutsUniques;
    }
    
    // Extraire les périodes uniques
    const periodesUniques = [...new Set(this.rapports.map(r => r.periode).filter(p => p))];
    if (periodesUniques.length > 0) {
      this.periodes = [...new Set([...this.periodes, ...periodesUniques])];
    }
  }

  // Calculer les statistiques locales si l'API échoue
  private calculerStatsLocales(): void {
    if (this.rapports.length === 0) return;
    
    const totalRapports = this.rapports.length;
    const rapportsValides = this.rapports.filter(r => r.statut === 'Validé').length;
    const rapportsEnAttente = this.rapports.filter(r => 
      r.statut === 'Soumis' || r.statut === 'En attente' || r.statut === 'Brouillon'
    ).length;
    const rapportsRejetes = this.rapports.filter(r => r.statut === 'Rejeté').length;
    const rapportsSoumis = this.rapports.filter(r => r.statut === 'Soumis').length;
    
    // Calculer la moyenne générale
    const evaluations = this.rapports
      .filter(r => r.evaluationGlobale > 0)
      .map(r => r.evaluationGlobale);
    
    const sommeEvaluations = evaluations.reduce((total: number, note: number) => total + note, 0);
    const moyenneGenerale = evaluations.length > 0 
      ? Number((sommeEvaluations / evaluations.length).toFixed(1))
      : 0;

    // Compter les partenaires actifs
    const partenairesActifs = new Set(this.rapports.map(r => r.partenaireId)).size;

    this.stats = {
      totalRapports,
      rapportsSoumis,
      rapportsValides,
      rapportsEnAttente,
      rapportsRejetes,
      moyenneGenerale,
      partenairesActifs
    };
  }

  // Calculer les statistiques partenaires locales
  private calculerStatsPartenairesLocales(): void {
    if (this.rapports.length === 0) return;
    
    const statsMap = new Map<string | number, any>();
    
    this.rapports.forEach(rapport => {
      const partenaireId = rapport.partenaireId;
      
      if (!statsMap.has(partenaireId)) {
        statsMap.set(partenaireId, {
          id: partenaireId,
          nom: rapport.partenaireNom,
          totalRapports: 0,
          rapportsValides: 0,
          evaluations: []
        });
      }
      
      const stats = statsMap.get(partenaireId)!;
      stats.totalRapports++;
      
      if (rapport.statut === 'Validé') {
        stats.rapportsValides++;
      }
      
      if (rapport.evaluationGlobale > 0) {
        stats.evaluations.push(rapport.evaluationGlobale);
      }
    });
    
    this.partenairesStats = Array.from(statsMap.values()).map(stats => ({
      id: stats.id,
      nom: stats.nom,
      totalRapports: stats.totalRapports,
      rapportsValides: stats.rapportsValides,
      moyenneEvaluation: stats.evaluations.length > 0 
        ? Number((stats.evaluations.reduce((total: number, note: number) => total + note, 0) / stats.evaluations.length).toFixed(1))
        : 0
    }));
    
    this.partenaires = [...this.partenairesStats];
    this.topPartenaires = this.partenairesStats
      .sort((a, b) => b.totalRapports - a.totalRapports)
      .slice(0, 5);
  }

  applyFilters(): void {
    this.filteredRapports = this.rapports.filter(rapport => {
      const matchesStatut = !this.statutFilter || rapport.statut === this.statutFilter;
      const matchesPeriode = !this.periodeFilter || rapport.periode === this.periodeFilter;
      const matchesPartenaire = !this.partenaireFilter || 
        rapport.partenaireId.toString() === this.partenaireFilter.toString();
      
      // Filtre par date
      let matchesDate = true;
      if (this.dateDebutFilter) {
        const dateDebut = new Date(this.dateDebutFilter);
        const dateRapport = new Date(rapport.dateSoumission);
        matchesDate = matchesDate && dateRapport >= dateDebut;
      }
      if (this.dateFinFilter) {
        const dateFin = new Date(this.dateFinFilter);
        dateFin.setHours(23, 59, 59, 999);
        const dateRapport = new Date(rapport.dateSoumission);
        matchesDate = matchesDate && dateRapport <= dateFin;
      }
      
      const matchesSearch = !this.searchTerm || 
        rapport.volontaireNomComplet.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        rapport.partenaireNom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        rapport.commentaires.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesStatut && matchesPeriode && matchesPartenaire && matchesDate && matchesSearch;
    });
    
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.statutFilter = '';
    this.periodeFilter = '';
    this.partenaireFilter = null;
    this.dateDebutFilter = '';
    this.dateFinFilter = '';
    this.searchTerm = '';
    this.filteredRapports = [...this.rapports];
    this.currentPage = 1;
  }

  // Actions d'administration
  validerRapport(id: number | string): void {
    const feedback = prompt('Ajoutez un feedback optionnel pour le partenaire :');
    
    if (feedback !== null) {
      this.adminService.validerRapport(id, feedback).subscribe({
        next: () => {
          this.loadData();
          alert('Rapport validé avec succès');
        },
        error: (error: any) => {
          console.error('Erreur:', error);
          alert('Erreur lors de la validation');
        }
      });
    }
  }

  rejeterRapport(id: number | string): void {
    const raison = prompt('Veuillez indiquer la raison du rejet :');
    
    if (raison && raison.trim()) {
      this.adminService.rejeterRapport(id, raison).subscribe({
        next: () => {
          this.loadData();
          alert('Rapport rejeté avec succès');
        },
        error: (error: any) => {
          console.error('Erreur:', error);
          alert('Erreur lors du rejet');
        }
      });
    }
  }

  marquerCommeLu(id: number | string): void {
    this.adminService.marquerCommeLu(id).subscribe({
      next: () => {
        const rapport = this.rapports.find(r => r.id === id);
        if (rapport) {
          rapport.statut = 'Lu par PNVB';
        }
      },
      error: (error: any) => {
        console.error('Erreur:', error);
      }
    });
  }

  // Export
  exportRapports(format: 'excel' | 'pdf' = 'excel'): void {
    const filters = {
      statut: this.statutFilter,
      periode: this.periodeFilter,
      partenaireId: this.partenaireFilter,
      dateDebut: this.dateDebutFilter,
      dateFin: this.dateFinFilter
    };
    
    this.adminService.exportRapports(format, filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapports_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'export');
      }
    });
  }

  // Navigation
  viewRapport(id: number | string): void {
    this.router.navigate(['/admin/rapports', id]);
  }

  editRapport(id: number | string): void {
    this.router.navigate(['/admin/rapports', id, 'edit']);
  }

  // Utilitaires d'affichage
  getStatutBadgeClass(statut: string): string {
    switch(statut) {
      case 'Validé': return 'badge-success';
      case 'Soumis': 
      case 'En attente': 
        return 'badge-primary';
      case 'Brouillon': return 'badge-secondary';
      case 'Rejeté': return 'badge-danger';
      case 'Lu par PNVB': return 'badge-info';
      default: return 'badge-light';
    }
  }

  getStatutIcon(statut: string): string {
    switch(statut) {
      case 'Validé': return 'check-circle';
      case 'Soumis': 
      case 'En attente': 
        return 'clock';
      case 'Brouillon': return 'edit';
      case 'Rejeté': return 'x-circle';
      case 'Lu par PNVB': return 'eye';
      default: return 'file-text';
    }
  }

  getEvaluationColor(score: number): string {
    if (score >= 8) return 'text-success fw-bold';
    if (score >= 6) return 'text-warning';
    return 'text-danger';
  }

  // Méthode Math pour le template
  get math() {
    return Math;
  }

  // Pagination
  get paginatedRapports(): RapportAdmin[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredRapports.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRapports.length / this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
}