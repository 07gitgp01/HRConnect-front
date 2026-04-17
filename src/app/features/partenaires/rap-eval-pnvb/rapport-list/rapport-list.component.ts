// src/app/features/partenaires/components/rapport-list/rapport-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router }                       from '@angular/router';
import { Subject, takeUntil }           from 'rxjs';
import { RapportService }               from '../../../services/rap-eval/rapport.service';
import { RapportAvecDetails, RapportStats } from '../../../models/rapport-evaluation.model';

@Component({
  selector:    'app-rapport-list',
  templateUrl: './rapport-list.component.html',
  styleUrls:   ['./rapport-list.component.scss']
})
export class RapportListComponent implements OnInit, OnDestroy {
  rapports:         RapportAvecDetails[] = [];
  filteredRapports: RapportAvecDetails[] = [];
  stats:            RapportStats | null  = null;
  isLoading = true;

  statutFilter  = '';
  periodeFilter = '';
  searchTerm    = '';

  currentPage  = 1;
  itemsPerPage = 10;

  periodes: string[] = [];
  statuts:  string[] = [];

  private destroy$ = new Subject<void>();
  readonly math = Math;

  constructor(
    private rapportService: RapportService,
    private router:         Router
  ) {}

  ngOnInit(): void {
    this.periodes = this.rapportService.getPeriodesDisponibles();
    this.statuts  = this.rapportService.getStatutsDisponibles();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Chargement ──────────────────────────────────────────────────────────

  loadData(): void {
    this.isLoading = true;
    const partenaireId = this.rapportService.getPartenaireIdFromStorage();

    this.rapportService.getRapportsByPartenaire(partenaireId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.rapports         = data;
          this.filteredRapports = [...data];
          this.calculateStats();
          this.isLoading        = false;
        },
        error: (err) => {
          console.error('Erreur chargement rapports:', err);
          this.isLoading = false;
        }
      });

    this.rapportService.getStatsPartenaire(partenaireId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (stats) => this.stats = stats,
        error: (err)   => console.error('Erreur stats:', err)
      });
  }

  calculateStats(): void {
    const base = {
      total:     this.rapports.length,
      soumis:    this.rapports.filter(r => r.statut === 'Soumis').length,
      valide:    this.rapports.filter(r => r.statut === 'Validé').length,
      brouillon: this.rapports.filter(r => r.statut === 'Brouillon').length,
      rejete:    this.rapports.filter(r => r.statut === 'Rejeté').length,
      enAttente: this.rapports.filter(r =>
        r.statut === 'Lu par PNVB' || r.statut === 'En attente'
      ).length
    };

    this.stats = this.stats
      ? { ...this.stats, ...base }
      : {
          ...base,
          moyenneEvaluation: 0,
          parStatut:         {},
          parPeriode:        {},
          parPartenaire:     {}
        };
  }

  // ─── Filtres ──────────────────────────────────────────────────────────────

  applyFilters(): void {
    this.filteredRapports = this.rapports.filter(r => {
      const matchStatut  = !this.statutFilter  || r.statut  === this.statutFilter;
      const matchPeriode = !this.periodeFilter || r.periode === this.periodeFilter;
      const term         = this.searchTerm.toLowerCase();

      const missionNom   = (r as any).missionNom   ?? '';
      const commentaires = r.commentaires           ?? '';
      const partenaire   = r.partenaireNom           ?? '';

      const matchSearch = !term ||
        missionNom.toLowerCase().includes(term)   ||
        commentaires.toLowerCase().includes(term) ||
        partenaire.toLowerCase().includes(term);

      return matchStatut && matchPeriode && matchSearch;
    });
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.statutFilter     = '';
    this.periodeFilter    = '';
    this.searchTerm       = '';
    this.filteredRapports = [...this.rapports];
    this.currentPage      = 1;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  createRapport(): void {
    this.router.navigate(['/features/partenaires/rapports/nouveau']);
  }

  editRapport(id: number | string): void {
    this.router.navigate(['/features/partenaires/rapports', id, 'edit']);
  }

  viewRapport(id: number | string): void {
    this.router.navigate(['/features/partenaires/rapports', id]);
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  soumettreRapport(id: number | string): void {
    if (!confirm('Soumettre ce rapport ? Cette action est définitive.')) return;

    this.rapportService.soumettreRapport(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => this.loadData(),
        error: (err) => {
          console.error('Erreur soumission:', err);
          alert('Erreur lors de la soumission');
        }
      });
  }

  deleteRapport(id: number | string): void {
    if (!confirm('Supprimer ce rapport ?')) return;

    this.rapportService.deleteRapport(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.rapports         = this.rapports.filter(r => r.id !== id);
          this.filteredRapports = this.filteredRapports.filter(r => r.id !== id);
          this.calculateStats();
        },
        error: (err) => {
          console.error('Erreur suppression:', err);
          alert('Erreur lors de la suppression');
        }
      });
  }

  exportToExcel(): void {
    console.log('Export Excel — à implémenter');
  }

  // ─── Pagination ───────────────────────────────────────────────────────────

  get paginatedRapports(): RapportAvecDetails[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredRapports.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRapports.length / this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  // ─── Utilitaires ─────────────────────────────────────────────────────────

  getMissionNom(rapport: RapportAvecDetails): string {
    return (rapport as any).missionNom ?? rapport.missionVolontaire ?? '—';
  }

  getStatutBadgeClass(statut: string): string {
    const map: Record<string, string> = {
      'Validé':      'badge-success',
      'Soumis':      'badge-primary',
      'Brouillon':   'badge-secondary',
      'Rejeté':      'badge-danger',
      'Lu par PNVB': 'badge-info',
      'En attente':  'badge-warning'
    };
    return map[statut] || 'badge-light';
  }

  getStatutIcon(statut: string): string {
    const map: Record<string, string> = {
      'Validé':      'check-circle',
      'Soumis':      'send',
      'Brouillon':   'edit',
      'Rejeté':      'x-circle',
      'Lu par PNVB': 'eye',
      'En attente':  'clock'
    };
    return map[statut] || 'file-text';
  }

  getEvaluationColor(score: number): string {
    if (score >= 8) return 'evaluation-excellente';
    if (score >= 6) return 'evaluation-bonne';
    if (score >= 4) return 'evaluation-moyenne';
    return 'evaluation-insuffisante';
  }

  getEvaluationIcon(score: number): string {
    if (score >= 8) return 'bi-star-fill text-warning';
    if (score >= 6) return 'bi-star-half text-warning';
    return 'bi-star text-muted';
  }
}