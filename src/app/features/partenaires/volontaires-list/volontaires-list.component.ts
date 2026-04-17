// src/app/features/partenaires/volontaires-list/volontaires-list.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

import { VolontairesStructureService, VolontaireStructure, StatsVolontairesStructure } from '../../services/serv_vol_struct/volontaires-structure.service';
import { AuthService } from '../../services/service_auth/auth.service';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-volontaires-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule
  ],
  templateUrl: './volontaires-list.component.html',
  styleUrls: ['./volontaires-list.component.css']
})
export class VolontairesListComponent implements OnInit, OnDestroy {
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
  statutFilter       = 'tous';
  projetFilter       = 'tous';
  roleFilter         = 'tous';
  competenceFilter   = 'toutes';
  disponibiliteFilter= 'toutes';
  niveauEtudesFilter = 'tous';
  typePieceFilter    = 'tous';
  dateDebutFilter    = '';
  dateFinFilter      = '';
  searchTerm         = '';

  // Pagination
  currentPage  = 1;
  itemsPerPage = 12;
  pageSize = 10;   // pour la pagination

  // Graphiques
  projetChart:    Chart | null = null;
  statutChart:    Chart | null = null;
  evolutionChart: Chart | null = null;

  isLoading         = true;
  chartOptionsLoaded = false;

  private destroy$ = new Subject<void>();

  constructor(
    private volontairesService: VolontairesStructureService,
    private authService: AuthService,
    private router: Router
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.projetChart?.destroy();
    this.statutChart?.destroy();
    this.evolutionChart?.destroy();
  }

  // ==================== PARTENAIRE ID ====================

  getPartenaireId(): number | string {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.warn('⚠️ Aucun utilisateur connecté');
      return 1;
    }
    const id = (user as any).id || (user as any).partenaireId;
    console.log('🔑 Partenaire ID:', id);
    return id;
  }

  // ==================== CHARGEMENT ====================

  loadData(): void {
    const partenaireId = this.getPartenaireId();
    this.isLoading = true;

    this.volontairesService.getVolontairesByStructure(partenaireId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('✅ Volontaires chargés:', data.length);
          this.volontaires = data;
          this.filteredVolontaires = [...data];
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur chargement volontaires:', error);
          this.isLoading = false;
        }
      });

    this.volontairesService.getStatsStructure(partenaireId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          console.log('📊 Stats:', stats);
          this.stats = stats;
        },
        error: (err) => console.error('❌ Erreur stats:', err)
      });

    this.volontairesService.getOptionsFiltres(partenaireId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.projets      = options.projets;
          this.roles        = options.roles;
          this.competences  = options.competences;
          this.niveauxEtudes= options.niveauxEtudes;
          this.typesPiece   = options.typesPiece;
          this.disponibilites = options.disponibilites;
          this.chartOptionsLoaded = true;

          setTimeout(() => this.createCharts(partenaireId), 100);
        },
        error: (err) => console.error('❌ Erreur options filtres:', err)
      });
  }

  // ==================== GRAPHIQUES ====================

  createCharts(partenaireId: number | string): void {
    this.volontairesService.getDataGraphiqueProjets(partenaireId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.createProjetChart(data));

    this.volontairesService.getDataGraphiqueStatuts(partenaireId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.createStatutChart(data));

    this.volontairesService.getEvolutionVolontaires(partenaireId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.createEvolutionChart(data));
  }

  createProjetChart(data: { nom: string, count: number }[]): void {
    const ctx = document.getElementById('projetChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.projetChart?.destroy();

    this.projetChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.nom),
        datasets: [{
          label: 'Volontaires par projet',
          data: data.map(d => d.count),
          backgroundColor: ['#008124', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#FF6384'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Répartition par projet' }
        },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  createStatutChart(data: { statut: string, count: number }[]): void {
    const ctx = document.getElementById('statutChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.statutChart?.destroy();

    this.statutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.statut),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: ['#008124', '#1d4ed8', '#17a2b8', '#dc3545', '#6c757d']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Répartition par statut' }
        }
      }
    });
  }

  createEvolutionChart(data: { mois: string, count: number }[]): void {
    const ctx = document.getElementById('evolutionChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.evolutionChart?.destroy();

    this.evolutionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.mois),
        datasets: [{
          label: 'Volontaires',
          data: data.map(d => d.count),
          borderColor: '#008124',
          backgroundColor: 'rgba(0,129,36,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#008124',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Évolution sur 6 mois' }
        },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  // ==================== FILTRES ====================

  applyFilters(): void {
    const filtres = {
      statutAffectation: this.statutFilter       === 'tous'    ? null : this.statutFilter,
      projetId:          this.projetFilter        === 'tous'    ? null : this.projetFilter,
      role:              this.roleFilter           === 'tous'    ? null : this.roleFilter,
      competence:        this.competenceFilter     === 'toutes'  ? null : this.competenceFilter,
      disponibilite:     this.disponibiliteFilter  === 'toutes'  ? null : this.disponibiliteFilter,
      niveauEtudes:      this.niveauEtudesFilter   === 'tous'    ? null : this.niveauEtudesFilter,
      typePiece:         this.typePieceFilter      === 'tous'    ? null : this.typePieceFilter,
      dateDebut:         this.dateDebutFilter,
      dateFin:           this.dateFinFilter,
      searchTerm:        this.searchTerm
    };

    this.filteredVolontaires = this.volontairesService.filtrerVolontaires(this.volontaires, filtres);
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.statutFilter        = 'tous';
    this.projetFilter        = 'tous';
    this.roleFilter          = 'tous';
    this.competenceFilter    = 'toutes';
    this.disponibiliteFilter = 'toutes';
    this.niveauEtudesFilter  = 'tous';
    this.typePieceFilter     = 'tous';
    this.dateDebutFilter     = '';
    this.dateFinFilter       = '';
    this.searchTerm          = '';
    this.filteredVolontaires = [...this.volontaires];
    this.currentPage = 1;
  }

  // ==================== NAVIGATION ====================

  viewVolontaire(id: number | string): void {
    this.router.navigate(['/features/partenaires/volontaires', id]);
  }

  terminerAffectation(affectationId: number | string, event?: Event): void {
    if (event) event.stopPropagation();
    if (!confirm('Êtes-vous sûr de vouloir terminer cette affectation ?')) return;

    this.volontairesService.terminerAffectation(affectationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.loadData(); alert('Affectation terminée avec succès'); },
        error: (err) => { console.error(err); alert('Erreur lors de la terminaison'); }
      });
  }

  updateRoleVolontaire(affectationId: number | string, currentRole: string): void {
    const nouveauRole = prompt('Nouveau rôle pour le volontaire :', currentRole);
    if (!nouveauRole?.trim() || nouveauRole === currentRole) return;

    this.volontairesService.updateRoleVolontaire(affectationId, nouveauRole.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.loadData(); alert('Rôle mis à jour avec succès'); },
        error: (err) => { console.error(err); alert('Erreur lors de la mise à jour'); }
      });
  }

  // ==================== EXPORT ====================

  exportVolontaires(format: 'excel' | 'pdf' = 'excel'): void {
    const partenaireId = this.getPartenaireId();
    this.volontairesService.exportVolontairesStructure(partenaireId, format)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href     = url;
          a.download = `volontaires_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => { console.error(err); alert("Erreur lors de l'export"); }
      });
  }

  // ==================== UTILITAIRES ====================

  getStatutAffectationClass(statut: string | undefined): string {
    switch (statut) {
      case 'active':   return 'cl-badge--active';
      case 'terminee': return 'cl-badge--termine';
      case 'annulee':  return 'cl-badge--annule';
      default:         return 'cl-badge--none';
    }
  }

  getStatutAffectationLabel(statut: string | undefined): string {
    switch (statut) {
      case 'active':   return 'Actif';
      case 'terminee': return 'Terminé';
      case 'annulee':  return 'Annulé';
      default:         return 'Non affecté';
    }
  }

  getEvaluationColor(score: number | undefined): string {
    if (!score) return 'text-secondary';
    if (score >= 8) return 'text-success';
    if (score >= 6) return 'text-warning';
    return 'text-danger';
  }

  // ✅ UNE SEULE VERSION de getProjetNom
  getProjetNom(projetId: string): string {
    return this.projets.find(p => p.id?.toString() === projetId)?.nom || projetId;
  }

  getAffichageRange(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end   = Math.min(this.currentPage * this.itemsPerPage, this.filteredVolontaires.length);
    return `${start} à ${end}`;
  }

  // ==================== MÉTHODES POUR L'HISTORIQUE ====================

  getTotalMissions(volontaire: VolontaireStructure): number {
    return volontaire.affectations?.length || 0;
  }

  getMissionsTerminees(volontaire: VolontaireStructure): number {
    return volontaire.affectations?.filter(a => a.statut === 'terminee').length || 0;
  }

  aDesMissionsAnterieures(volontaire: VolontaireStructure): boolean {
    return this.getMissionsTerminees(volontaire) > 0;
  }

  // ==================== PAGINATION ====================

  get paginatedVolontaires(): VolontaireStructure[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredVolontaires.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredVolontaires.length / this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }
}