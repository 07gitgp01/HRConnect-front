import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { skip, distinctUntilChanged } from 'rxjs/operators';

import { MatCardModule }             from '@angular/material/card';
import { MatButtonModule }           from '@angular/material/button';
import { MatIconModule }             from '@angular/material/icon';
import { MatProgressSpinnerModule }  from '@angular/material/progress-spinner';
import { MatChipsModule }            from '@angular/material/chips';
import { MatDividerModule }          from '@angular/material/divider';
import { MatFormFieldModule }        from '@angular/material/form-field';
import { MatSelectModule }           from '@angular/material/select';
import { MatInputModule }            from '@angular/material/input';
import { MatSnackBar }               from '@angular/material/snack-bar';
import { MatDialog }                 from '@angular/material/dialog';
import { MatTableModule }            from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule }             from '@angular/material/sort';
import { MatMenuModule }             from '@angular/material/menu';
import { MatTooltipModule }          from '@angular/material/tooltip';

import { Candidature }              from '../../../models/candidature.model';
import { Project }                  from '../../../models/projects.model';
import { Volontaire }               from '../../../models/volontaire.model';
import { CandidatureService }       from '../../../services/service_candi/candidature.service';
import { ProjectService }           from '../../../services/service_projects/projects.service';
import { VolontaireService }        from '../../../services/service_volont/volontaire.service';
import { SyncService }              from '../../../../features/services/sync.service';
import { CandidatureDetailComponent } from '../candidature-detail/candidature-detail.component';
import { CandidatureFormComponent }   from '../candidature-form/candidature-form.component';

@Component({
  selector:    'app-candidature-list',
  standalone:  true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatChipsModule, MatDividerModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatTableModule,
    MatPaginatorModule, MatSortModule, MatMenuModule, MatTooltipModule
  ],
  templateUrl: './candidature-list.component.html',
  styleUrls:   ['./candidature-list.component.css']
})
export class CandidatureListComponent implements OnInit, OnDestroy {
  candidatures: Candidature[] = [];
  projets:      Project[]     = [];
  volontaires:  Volontaire[]  = [];
  loading = true;

  filtreStatut = '';
  filtreProjet = '';
  searchTerm   = '';

  pageSize        = 10;
  currentPage     = 0;
  pageSizeOptions = [5, 10, 25, 50];

  private destroy$             = new Subject<void>();
  private pendingCandidatureId: string | number | null = null;

  displayedColumns: string[] = ['candidat', 'projet', 'competences', 'statut', 'date', 'actions'];

  readonly transitionsStatut: Record<string, {
    statut: Candidature['statut']; label: string; icon: string; color: string
  }[]> = {
    en_attente: [
      { statut: 'entretien', label: 'Mettre en entretien', icon: 'event',           color: 'accent'  },
      { statut: 'acceptee',  label: 'Accepter',            icon: 'check_circle',    color: 'primary' },
      { statut: 'refusee',   label: 'Refuser',             icon: 'cancel',          color: 'warn'    }
    ],
    entretien: [
      { statut: 'acceptee',   label: 'Accepter',            icon: 'check_circle',    color: 'primary' },
      { statut: 'refusee',    label: 'Refuser',             icon: 'cancel',          color: 'warn'    },
      { statut: 'en_attente', label: 'Remettre en attente', icon: 'hourglass_empty', color: ''        }
    ],
    acceptee: [
      { statut: 'refusee', label: "Annuler l'acceptation", icon: 'cancel', color: 'warn' }
    ],
    refusee: [
      { statut: 'en_attente', label: 'Remettre en attente', icon: 'restart_alt', color: 'primary' }
    ]
  };

  constructor(
    private candidatureService: CandidatureService,
    private projectService:     ProjectService,
    private volontaireService:  VolontaireService,
    private syncService:        SyncService,
    private router:             Router,
    private route:              ActivatedRoute,
    private snackBar:           MatSnackBar,
    private dialog:             MatDialog
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['candidatureId']) this.pendingCandidatureId = params['candidatureId'];
    });

    this.loadAll();

    this.syncService.candidatures$.pipe(
      skip(1),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      console.log('🔄 [CandidatureList] candidatures$ → rechargement');
      this.loadCandidatures();
    });

    this.syncService.volontaires$.pipe(
      skip(1),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      console.log('🔄 [CandidatureList] volontaires$ → rechargement volontaires');
      this.loadVolontaires();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Chargement ───────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading = true;
    this.loadProjets();
    this.loadVolontaires();
    this.loadCandidatures();
  }

  loadCandidatures(): void {
    this.candidatureService.getAll().subscribe({
      next: candidatures => {
        console.log('📋 Candidatures chargées:', candidatures.map(c => ({ id: c.id, type: typeof c.id, nom: c.nom })));
        this.candidatures = candidatures.sort((a, b) =>
          new Date(b.cree_le || '').getTime() - new Date(a.cree_le || '').getTime()
        );
        this.loading = false;
        if (this.pendingCandidatureId !== null) {
          this.ouvrirCandidatureParId(this.pendingCandidatureId);
          this.pendingCandidatureId = null;
        }
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement des candidatures', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  loadProjets(): void {
    this.projectService.getProjects().subscribe({
      next: projets => { this.projets = projets; },
      error: err    => console.error('Erreur chargement projets:', err)
    });
  }

  loadVolontaires(): void {
    this.volontaireService.getVolontaires().subscribe({
      next: vols => { this.volontaires = vols; },
      error: err  => console.error('Erreur chargement volontaires:', err)
    });
  }

  // ─── Ouverture depuis query param ─────────────────────────────────────────

  private ouvrirCandidatureParId(id: string | number): void {
    const candidature = this.candidatures.find(c => String(c.id) === String(id));
    if (candidature) {
      const index = this.getCandidaturesFiltrees().findIndex(c => String(c.id) === String(id));
      if (index >= 0) this.currentPage = Math.floor(index / this.pageSize);
      setTimeout(() => this.voirDetails(candidature), 150);
    } else {
      this.snackBar.open('Candidature introuvable', 'Fermer', { duration: 3000 });
    }
    this.router.navigate([], {
      relativeTo:          this.route,
      queryParams:         { candidatureId: null },
      queryParamsHandling: 'merge'
    });
  }

  // ─── Filtrage ─────────────────────────────────────────────────────────────

  getCandidaturesFiltrees(): Candidature[] {
    let filtered = this.candidatures;
    if (this.filtreStatut) filtered = filtered.filter(c => c.statut === this.filtreStatut);
    if (this.filtreProjet) filtered = filtered.filter(c => String(c.projectId) === String(this.filtreProjet));
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.poste_vise.toLowerCase().includes(term)             ||
        (c.nom + ' ' + c.prenom).toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)                  ||
        this.getProjectName(c.projectId).toLowerCase().includes(term)
      );
    }
    return filtered;
  }

  get totalCandidatures(): number { return this.getCandidaturesFiltrees().length; }

  getCandidaturesPaginees(): Candidature[] {
    const filtrees = this.getCandidaturesFiltrees();
    const start    = this.currentPage * this.pageSize;
    return filtrees.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void { this.currentPage = event.pageIndex; this.pageSize = event.pageSize; }
  onFiltreChange(): void               { this.currentPage = 0; }
  clearFilters(): void                 { this.filtreStatut = ''; this.filtreProjet = ''; this.searchTerm = ''; this.currentPage = 0; }

  // ─── Changement de statut ─────────────────────────────────────────────────

  acceptationBloquee(candidature: Candidature): boolean {
    if (!candidature.volontaireId) return false;
    const vol = this.volontaires.find(v => String(v.id) === String(candidature.volontaireId));
    return vol?.statut === 'Actif';
  }

  changerStatut(candidature: Candidature, nouveauStatut: Candidature['statut']): void {
    if (!candidature.id) {
      console.error('❌ ID de candidature manquant:', candidature);
      this.snackBar.open('Erreur : candidature sans identifiant', 'Fermer', { duration: 4000 });
      return;
    }

    // Log pour debug
    console.log('🔄 Changement de statut:', {
      id: candidature.id,
      idType: typeof candidature.id,
      idString: String(candidature.id),
      statutActuel: candidature.statut,
      nouveauStatut,
      candidature
    });

    if (nouveauStatut === 'acceptee') {
      this.candidatureService.accepterEtAffecterCandidature(candidature.id).subscribe({
        next: result => {
          console.log('✅ Acceptation réussie:', result);
          this.updateCandidatureLocalement(candidature.id!, 'acceptee');
          this.snackBar.open(result.message, 'Fermer', { duration: 5000 });
        },
        error: (err) => {
          console.error('❌ Erreur acceptation détaillée:', err);
          const msg = err?.message || "Erreur lors de l'acceptation";
          this.snackBar.open(msg, 'Fermer', { duration: 4000 });
        }
      });

    } else if (nouveauStatut === 'refusee') {
      this.candidatureService.changerStatut(candidature.id, 'refusee').subscribe({
        next: () => {
          console.log('✅ Refus réussi');
          this.updateCandidatureLocalement(candidature.id!, 'refusee');
          this.snackBar.open('Candidature refusée.', 'Fermer', { duration: 4000 });
        },
        error: (err) => {
          console.error('❌ Erreur refus:', err);
          this.snackBar.open('Erreur lors du refus', 'Fermer', { duration: 3000 });
        }
      });

    } else {
      this.candidatureService.changerStatut(candidature.id, nouveauStatut).subscribe({
        next: () => {
          console.log('✅ Changement statut réussi');
          this.updateCandidatureLocalement(candidature.id!, nouveauStatut);
          this.snackBar.open(
            `Candidature passée à "${this.getStatutText(nouveauStatut)}"`,
            'Fermer', { duration: 3000 }
          );
        },
        error: (err) => {
          console.error('❌ Erreur changement statut:', err);
          this.snackBar.open('Erreur lors du changement de statut', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  private updateCandidatureLocalement(id: number | string, statut: Candidature['statut']): void {
    const index = this.candidatures.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
      this.candidatures[index] = { ...this.candidatures[index], statut };
      this.candidatures = [...this.candidatures];
      console.log('✅ Mise à jour locale effectuée');
    } else {
      console.warn('⚠️ Candidature non trouvée pour mise à jour locale:', id);
    }
  }

  getTransitionsDisponibles(statut: string) {
    return this.transitionsStatut[statut] || [];
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  voirDetails(candidature: Candidature): void {
    const project = this.projets.find(p => String(p.id) === String(candidature.projectId));
    this.dialog.open(CandidatureDetailComponent, {
      width:     '800px',
      maxHeight: '90vh',
      data:      { candidature, project }
    });
  }

  nouvelleCandidature(): void {
    this.dialog.open(CandidatureFormComponent, {
      width:     '800px',
      maxHeight: '90vh',
      data:      { projects: this.projets }
    }).afterClosed().subscribe(result => {
      if (result) this.loadCandidatures();
    });
  }

  supprimerCandidature(candidatureId: number | string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette candidature ? Cette action est irréversible.')) return;
    this.candidatureService.delete(candidatureId).subscribe({
      next: () => {
        this.candidatures = this.candidatures.filter(c => String(c.id) !== String(candidatureId));
        const maxPage = Math.max(0, Math.ceil(this.totalCandidatures / this.pageSize) - 1);
        if (this.currentPage > maxPage) this.currentPage = maxPage;
        this.snackBar.open('Candidature supprimée', 'Fermer', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 })
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  getProjectName(projectId?: number | string): string {
    if (projectId == null) return 'Non spécifié';
    return this.projets.find(p => String(p.id) === String(projectId))?.titre || 'Projet inconnu';
  }

  getProjectRegion(projectId?: number | string): string {
    if (projectId == null) return '';
    return this.projets.find(p => String(p.id) === String(projectId))?.regionAffectation || '';
  }

  getStatutText(statut: string): string {
    const textes: Record<string, string> = {
      en_attente: 'En attente',
      entretien:  'En entretien',
      acceptee:   'Acceptée',
      refusee:    'Refusée'
    };
    return textes[statut] || statut;
  }

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    if (Array.isArray(competences)) return competences;
    return String(competences).split(',').map(c => c.trim());
  }
}