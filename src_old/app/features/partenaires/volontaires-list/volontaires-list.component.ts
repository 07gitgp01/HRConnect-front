import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { VolontairesStructureService, VolontaireStructure, StatsVolontairesStructure } from '../../services/serv_vol_struct/volontaires-structure.service';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-volontaires-list',
  templateUrl: './volontaires-list.component.html',
  styleUrls: ['./volontaires-list.component.css']
})
export class VolontairesListComponent implements OnInit {
  volontaires: VolontaireStructure[] = [];
  filteredVolontaires: VolontaireStructure[] = [];
  stats: StatsVolontairesStructure | null = null;
  
  // Options de filtres
  projets: { id: string, nom: string }[] = [];
  roles: string[] = [];
  competences: string[] = [];
  niveauxEtudes: string[] = [];
  typesPiece: string[] = [];
  disponibilites: string[] = [];
  
  // Filtres actuels
  statutFilter: string = 'tous';
  projetFilter: string = 'tous';
  roleFilter: string = 'tous';
  competenceFilter: string = 'toutes';
  disponibiliteFilter: string = 'toutes';
  niveauEtudesFilter: string = 'tous';
  typePieceFilter: string = 'tous';
  dateDebutFilter: string = '';
  dateFinFilter: string = '';
  searchTerm: string = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 12;
  
  // Graphiques
  projetChart: any;
  statutChart: any;
  evolutionChart: any;
  
  isLoading = true;
  chartOptionsLoaded = false;

  constructor(
    private volontairesService: VolontairesStructureService,
    private router: Router
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadData();
  }

  getPartenaireId(): number {
    // À remplacer par l'ID réel du partenaire connecté
    return 1; // Exemple
  }

  loadData(): void {
    const partenaireId = this.getPartenaireId();
    this.isLoading = true;
    
    // Charger les volontaires
    this.volontairesService.getVolontairesByStructure(partenaireId).subscribe({
      next: (data) => {
        this.volontaires = data;
        this.filteredVolontaires = [...data];
        this.applyFilters(); // Appliquer les filtres par défaut
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.isLoading = false;
      }
    });
    
    // Charger les statistiques
    this.volontairesService.getStatsStructure(partenaireId).subscribe({
      next: (stats) => {
        this.stats = stats;
      }
    });
    
    // Charger les options de filtres
    this.volontairesService.getOptionsFiltres(partenaireId).subscribe({
      next: (options) => {
        this.projets = options.projets;
        this.roles = options.roles;
        this.competences = options.competences;
        this.niveauxEtudes = options.niveauxEtudes;
        this.typesPiece = options.typesPiece;
        this.disponibilites = options.disponibilites;
        this.chartOptionsLoaded = true;
        
        // Créer les graphiques
        this.createCharts(partenaireId);
      }
    });
  }

  createCharts(partenaireId: number): void {
    // Graphique répartition par projet
    this.volontairesService.getDataGraphiqueProjets(partenaireId).subscribe(data => {
      this.createProjetChart(data);
    });
    
    // Graphique répartition par statut
    this.volontairesService.getDataGraphiqueStatuts(partenaireId).subscribe(data => {
      this.createStatutChart(data);
    });
    
    // Graphique d'évolution
    this.volontairesService.getEvolutionVolontaires(partenaireId).subscribe(data => {
      this.createEvolutionChart(data);
    });
  }

  createProjetChart(data: { nom: string, count: number }[]): void {
    const ctx = document.getElementById('projetChart') as HTMLCanvasElement;
    
    if (this.projetChart) {
      this.projetChart.destroy();
    }
    
    this.projetChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.nom),
        datasets: [{
          label: 'Volontaires par projet',
          data: data.map(d => d.count),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#C9CBCF', '#FF6384'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Répartition par projet'
          }
        }
      }
    });
  }

  createStatutChart(data: { statut: string, count: number }[]): void {
    const ctx = document.getElementById('statutChart') as HTMLCanvasElement;
    
    if (this.statutChart) {
      this.statutChart.destroy();
    }
    
    this.statutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.statut),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: [
            '#28a745', // Actif
            '#007bff', // En attente
            '#17a2b8', // Terminé
            '#dc3545', // Annulé
            '#6c757d'  // Non affecté
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Répartition par statut'
          }
        }
      }
    });
  }

  createEvolutionChart(data: { mois: string, count: number }[]): void {
    const ctx = document.getElementById('evolutionChart') as HTMLCanvasElement;
    
    if (this.evolutionChart) {
      this.evolutionChart.destroy();
    }
    
    this.evolutionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.mois),
        datasets: [{
          label: 'Volontaires',
          data: data.map(d => d.count),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Évolution sur 6 mois'
          }
        }
      }
    });
  }

  applyFilters(): void {
    const filtres = {
      statutAffectation: this.statutFilter === 'tous' ? null : this.statutFilter,
      projetId: this.projetFilter === 'tous' ? null : this.projetFilter,
      role: this.roleFilter === 'tous' ? null : this.roleFilter,
      competence: this.competenceFilter === 'toutes' ? null : this.competenceFilter,
      disponibilite: this.disponibiliteFilter === 'toutes' ? null : this.disponibiliteFilter,
      niveauEtudes: this.niveauEtudesFilter === 'tous' ? null : this.niveauEtudesFilter,
      typePiece: this.typePieceFilter === 'tous' ? null : this.typePieceFilter,
      dateDebut: this.dateDebutFilter,
      dateFin: this.dateFinFilter,
      searchTerm: this.searchTerm
    };
    
    this.filteredVolontaires = this.volontairesService.filtrerVolontaires(this.volontaires, filtres);
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.statutFilter = 'tous';
    this.projetFilter = 'tous';
    this.roleFilter = 'tous';
    this.competenceFilter = 'toutes';
    this.disponibiliteFilter = 'toutes';
    this.niveauEtudesFilter = 'tous';
    this.typePieceFilter = 'tous';
    this.dateDebutFilter = '';
    this.dateFinFilter = '';
    this.searchTerm = '';
    this.filteredVolontaires = [...this.volontaires];
    this.currentPage = 1;
  }

  // Navigation et actions
  viewVolontaire(id: number | string): void {
    this.router.navigate(['/features/partenaires/volontaires', id]);
  }

  terminerAffectation(affectationId: number | string, event?: Event): void {
    if (event) event.stopPropagation();
    
    if (confirm('Êtes-vous sûr de vouloir terminer cette affectation ?')) {
      this.volontairesService.terminerAffectation(affectationId).subscribe({
        next: () => {
          this.loadData();
          alert('Affectation terminée avec succès');
        },
        error: (error) => {
          console.error('Erreur:', error);
          alert('Erreur lors de la terminaison');
        }
      });
    }
  }

  updateRoleVolontaire(affectationId: number | string, currentRole: string): void {
    const nouveauRole = prompt('Nouveau rôle pour le volontaire:', currentRole);
    if (nouveauRole && nouveauRole.trim() && nouveauRole !== currentRole) {
      this.volontairesService.updateRoleVolontaire(affectationId, nouveauRole.trim()).subscribe({
        next: () => {
          this.loadData();
          alert('Rôle mis à jour avec succès');
        },
        error: (error) => {
          console.error('Erreur:', error);
          alert('Erreur lors de la mise à jour');
        }
      });
    }
  }

  // Export
  exportVolontaires(format: 'excel' | 'pdf' = 'excel'): void {
    const partenaireId = this.getPartenaireId();
    this.volontairesService.exportVolontairesStructure(partenaireId, format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `volontaires_structure_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'export');
      }
    });
  }

  // Utilitaires d'affichage
  getStatutAffectationClass(statut: string | undefined): string {
    switch(statut) {
      case 'active': return 'badge-success';
      case 'terminee': return 'badge-info';
      case 'annulee': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getStatutAffectationLabel(statut: string | undefined): string {
    switch(statut) {
      case 'active': return 'Actif';
      case 'terminee': return 'Terminé';
      case 'annulee': return 'Annulé';
      default: return 'Non affecté';
    }
  }

  getEvaluationColor(score: number | undefined): string {
    if (!score) return 'text-secondary';
    if (score >= 8) return 'text-success fw-bold';
    if (score >= 6) return 'text-warning';
    return 'text-danger';
  }

  // Pagination
  get paginatedVolontaires(): VolontaireStructure[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredVolontaires.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredVolontaires.length / this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  getProjetNom(projetId: string): string {
  const projet = this.projets.find(p => p.id?.toString() === projetId);
  return projet?.nom || projetId;
}
getAffichageRange(): string {
  const start = (this.currentPage - 1) * this.itemsPerPage + 1;
  const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredVolontaires.length);
  return `${start} à ${end}`;
}
}