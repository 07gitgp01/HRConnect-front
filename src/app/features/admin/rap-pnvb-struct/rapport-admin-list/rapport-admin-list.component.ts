// src/app/features/admin/components/rapport-admin/rapport-list-admin.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PnvbAdminService, RapportAdmin, StatsAdmin } from '../../../services/rap-pnvb/pnvb-admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-rapport-admin-list',
  templateUrl: './rapport-admin-list.component.html',
  styleUrls: ['./rapport-admin-list.component.scss']
})
export class RapportAdminListComponent implements OnInit, OnDestroy {
  rapports:         RapportAdmin[] = [];
  filteredRapports: RapportAdmin[] = [];
  stats:            StatsAdmin | null = null;
  isLoading = true;

  searchTerm    = '';
  statutFilter  = '';
  periodeFilter = '';

  currentPage  = 1;
  itemsPerPage = 10;

  statuts  = ['Soumis', 'Lu par PNVB', 'Validé', 'Rejeté', 'Brouillon', 'En attente'];
  periodes: string[] = [];

  readonly math = Math;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: PnvbAdminService,
    private router:       Router,
    private snackBar:     MatSnackBar
  ) {}

  ngOnInit(): void  { this.loadData(); }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Chargement ──────────────────────────────────────────────────────────

  loadData(): void {
    this.isLoading = true;

    this.adminService.getAllRapports()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.rapports         = data;
          this.filteredRapports = [...data];
          this.periodes         = [...new Set(data.map(r => r.periode))].filter(Boolean);
          this.isLoading        = false;
        },
        error: (err) => {
          console.error('Erreur chargement:', err);
          this.isLoading = false;
        }
      });

    this.adminService.getStatsAdmin()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (s) => this.stats = s,
        error: (err) => console.error('Erreur stats:', err)
      });
  }

  // ─── Filtres ──────────────────────────────────────────────────────────────

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredRapports = this.rapports.filter(r => {
      const matchStatut  = !this.statutFilter  || r.statut  === this.statutFilter;
      const matchPeriode = !this.periodeFilter || r.periode === this.periodeFilter;
      const matchSearch  = !term ||
        r.partenaireNom.toLowerCase().includes(term)     ||
        r.missionVolontaire.toLowerCase().includes(term) ||
        (r.commentaires ?? '').toLowerCase().includes(term);
      return matchStatut && matchPeriode && matchSearch;
    });
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.searchTerm       = '';
    this.statutFilter     = '';
    this.periodeFilter    = '';
    this.filteredRapports = [...this.rapports];
    this.currentPage      = 1;
  }

  // ─── Actions admin ────────────────────────────────────────────────────────

  viewRapport(id: number | string): void {
    this.router.navigate(['/features/admin/rapports/', id]);
  }

  marquerLu(id: number | string): void {
    this.adminService.marquerCommeLu(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify('Rapport marqué comme lu');
          this.updateLocalStatut(id, 'Lu par PNVB');
        },
        error: () => this.notify('Erreur lors du marquage', true)
      });
  }

  valider(id: number | string): void {
    const feedback = prompt('Feedback de validation (optionnel) :');
    if (feedback === null) return;

    this.adminService.validerRapport(id, feedback || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify('Rapport validé avec succès');
          this.updateLocalStatut(id, 'Validé');
        },
        error: () => this.notify('Erreur lors de la validation', true)
      });
  }

  rejeter(id: number | string): void {
    const raison = prompt('Raison du rejet :');
    if (!raison?.trim()) return;

    this.adminService.rejeterRapport(id, raison)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify('Rapport rejeté');
          this.updateLocalStatut(id, 'Rejeté');
        },
        error: () => this.notify('Erreur lors du rejet', true)
      });
  }

  exportRapports(): void {
    this.adminService.exportRapports('csv')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url  = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href     = url;
          link.download = `rapports_pnvb_${new Date().toISOString().slice(0, 10)}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.notify('Erreur export', true)
      });
  }

  // ─── Pagination ───────────────────────────────────────────────────────────

  get paginatedRapports(): RapportAdmin[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredRapports.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRapports.length / this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private updateLocalStatut(id: number | string, statut: RapportAdmin['statut']): void {
    const update = (list: RapportAdmin[]): RapportAdmin[] =>
      list.map(r => String(r.id) === String(id) ? { ...r, statut } : r);
    this.rapports         = update(this.rapports);
    this.filteredRapports = update(this.filteredRapports);
  }

  private notify(msg: string, error = false): void {
    this.snackBar.open(msg, 'Fermer', {
      duration:    3000,
      panelClass: error ? ['snack-error'] : ['snack-success']
    });
  }

  // ─── Utilitaires affichage ────────────────────────────────────────────────

  getStatutIcon(statut: string): string {
    const map: Record<string, string> = {
      'Validé':      'check-circle',
      'Soumis':      'send',
      'Brouillon':   'pencil',
      'Rejeté':      'x-circle',
      'Lu par PNVB': 'eye',
      'En attente':  'clock'
    };
    return map[statut] || 'file-text';
  }

  getEvaluationColor(score: number): string {
    if (score >= 8) return 'eval-excellent';
    if (score >= 6) return 'eval-bon';
    if (score >= 4) return 'eval-moyen';
    return 'eval-faible';
  }

  canValider(statut: string): boolean {
    return ['Soumis', 'Lu par PNVB'].includes(statut);
  }

  canRejeter(statut: string): boolean {
    return ['Soumis', 'Lu par PNVB'].includes(statut);
  }
}