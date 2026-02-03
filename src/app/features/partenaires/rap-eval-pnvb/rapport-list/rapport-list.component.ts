import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RapportService } from '../../../services/rap-eval/rapport.service';
import { RapportAvecDetails, RapportStats } from '../../../models/rapport-evaluation.model';

@Component({
  selector: 'app-rapport-list',
  templateUrl: './rapport-list.component.html',
  styleUrls: ['./rapport-list.component.css']
})
export class RapportListComponent implements OnInit {
  rapports: RapportAvecDetails[] = [];
  filteredRapports: RapportAvecDetails[] = [];
  stats: RapportStats | null = null;
  isLoading = true;
  
  // Filtres
  statutFilter: string = '';
  periodeFilter: string = '';
  searchTerm: string = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  
  // Données pour les filtres
  periodes: string[] = [];
  statuts: string[] = [];

  constructor(
    private rapportService: RapportService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.periodes = this.rapportService.getPeriodesDisponibles();
    this.statuts = this.rapportService.getStatutsDisponibles();
  }

  loadData(): void {
    this.isLoading = true;
    
    this.rapportService.getRapportsByPartenaire(this.getPartenaireId()).subscribe({
      next: (data) => {
        this.rapports = data;
        this.filteredRapports = [...data];
        this.calculateStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.isLoading = false;
      }
    });
    
    this.rapportService.getStatsPartenaire(this.getPartenaireId()).subscribe({
      next: (stats) => {
        this.stats = stats;
      }
    });
  }

  getPartenaireId(): number {
    // À remplacer par l'ID réel du partenaire connecté
    return 201;
  }

  calculateStats(): void {
    if (!this.stats) return;
    
    this.stats = {
      ...this.stats,
      total: this.rapports.length,
      soumis: this.rapports.filter(r => r.statut === 'Soumis').length,
      valide: this.rapports.filter(r => r.statut === 'Validé').length,
      brouillon: this.rapports.filter(r => r.statut === 'Brouillon').length
    };
  }

  applyFilters(): void {
    this.filteredRapports = this.rapports.filter(rapport => {
      const matchesStatut = !this.statutFilter || rapport.statut === this.statutFilter;
      const matchesPeriode = !this.periodeFilter || rapport.periode === this.periodeFilter;
      const matchesSearch = !this.searchTerm || 
        rapport.volontaireNomComplet.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        rapport.commentaires.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesStatut && matchesPeriode && matchesSearch;
    });
    
    this.currentPage = 1; // Retour à la première page après filtrage
  }

  clearFilters(): void {
    this.statutFilter = '';
    this.periodeFilter = '';
    this.searchTerm = '';
    this.filteredRapports = [...this.rapports];
    this.currentPage = 1;
  }

  // Navigation
  createRapport(): void {
    this.router.navigate(['/features/partenaires/rapports/nouveau']);
  }

  editRapport(id: number | string): void {
    this.router.navigate(['/features/partenaires/rapports', id, 'edit']);
  }

  viewRapport(id: number | string): void {
    this.router.navigate(['/features/partenaires/rapports', id]);
  }

  // Utilitaires d'affichage
  getStatutBadgeClass(statut: string): string {
    switch(statut) {
      case 'Validé': return 'badge-success';
      case 'Soumis': return 'badge-primary';
      case 'Brouillon': return 'badge-secondary';
      case 'Rejeté': return 'badge-danger';
      case 'Lu par PNVB': return 'badge-info';
      default: return 'badge-light';
    }
  }

  getStatutIcon(statut: string): string {
    switch(statut) {
      case 'Validé': return 'check-circle';
      case 'Soumis': return 'send';
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

  getEvaluationIcon(score: number): string {
    if (score >= 8) return 'star-fill';
    if (score >= 6) return 'star-half';
    return 'star';
  }

  // Pagination
  get paginatedRapports(): RapportAvecDetails[] {
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

  // Actions
  soumettreRapport(id: number | string): void {
    if (confirm('Êtes-vous sûr de vouloir soumettre ce rapport ? Cette action est définitive.')) {
      this.rapportService.soumettreRapport(id).subscribe({
        next: () => {
          this.loadData();
        },
        error: (error) => {
          console.error('Erreur:', error);
          alert('Erreur lors de la soumission');
        }
      });
    }
  }

  deleteRapport(id: number | string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
      this.rapportService.deleteRapport(id).subscribe({
        next: () => {
          this.rapports = this.rapports.filter(r => r.id !== id);
          this.filteredRapports = this.filteredRapports.filter(r => r.id !== id);
          this.calculateStats();
        },
        error: (error) => {
          console.error('Erreur:', error);
          alert('Erreur lors de la suppression');
        }
      });
    }
  }

  // Export
  exportToExcel(): void {
    // À implémenter selon vos besoins
    console.log('Export Excel des rapports');
  }
  // Ajoutez dans la classe :
get math() {
  return Math;
}
}