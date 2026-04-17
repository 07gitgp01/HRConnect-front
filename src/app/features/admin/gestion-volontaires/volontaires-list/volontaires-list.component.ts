// src/app/features/admin/gestion-volontaires/volontaires-list/volontaires-list.component.ts

import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, distinctUntilChanged, skip, catchError } from 'rxjs/operators';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { VolontaireService } from '../../../services/service_volont/volontaire.service';
import { ProjectService } from '../../../services/service_projects/projects.service';
import { AffectationService } from '../../../services/service-affecta/affectation.service';
import { SyncService } from '../../../../features/services/sync.service';
import { Volontaire } from '../../../models/volontaire.model';
import { Project } from '../../../models/projects.model';
import { ProfilFormComponent } from '../profil-form/profil-form.component';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog/confirm-dialog.component';
import { Component as NgComponent, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// ==================== DIALOG D'AFFECTATION ====================

@NgComponent({
  selector: 'app-affecter-volontaire-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatDividerModule],
  template: `
    <div style="padding:24px; min-width:420px">
      <h2 style="margin:0 0 8px; font-size:1.1rem; font-weight:700; color:#0f172a">
        <mat-icon style="vertical-align:middle; margin-right:8px; color:#008124">assignment_turned_in</mat-icon>
        Affecter {{ data.volontaire.prenom }} {{ data.volontaire.nom }}
      </h2>
      <p style="margin:0 0 20px; font-size:0.875rem; color:#64748b">
        Sélectionnez la mission CLÔTURÉE à laquelle affecter ce volontaire.
      </p>

      <div *ngIf="data.projetsClotures.length === 0"
           style="padding:16px; background:#fef9c3; border-radius:8px; font-size:0.875rem; color:#92400e; margin-bottom:16px">
        <mat-icon style="vertical-align:middle; font-size:1rem; margin-right:6px">warning</mat-icon>
        Aucune mission clôturée disponible pour le moment.
      </div>

      <div class="field-wrap" style="margin-bottom:16px" *ngIf="data.projetsClotures.length > 0">
        <label style="display:block; font-size:0.8rem; font-weight:600; color:#334155; margin-bottom:6px">
          Mission clôturée *
        </label>
        <select [(ngModel)]="projetSelectionne"
                style="width:100%; padding:10px 14px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:0.875rem; outline:none; cursor:pointer">
          <option [value]="null">— Choisir une mission clôturée —</option>
          <ng-container *ngFor="let p of data.projetsClotures">
            <option [value]="p.id">{{ p.titre }} — {{ p.regionAffectation }} ({{ p.dateFin | date:'dd/MM/yyyy' }})</option>
          </ng-container>
        </select>
      </div>

      <div style="display:flex; gap:10px; justify-content:flex-end">
        <button mat-button (click)="dialogRef.close(false)"
                style="border:1.5px solid #cbd5e1; border-radius:8px; padding:0 16px; height:38px;">
          Annuler
        </button>
        <button mat-flat-button
                [disabled]="!projetSelectionne || data.projetsClotures.length === 0"
                (click)="confirmer()"
                style="background:#008124; color:white; border-radius:8px; padding:0 20px; height:38px;">
          <mat-icon style="font-size:1rem">assignment_turned_in</mat-icon>
          Affecter
        </button>
      </div>
    </div>
  `
})
export class AffecterVolontaireDialogComponent {
  projetSelectionne: number | string | null = null;
  role = 'Volontaire';

  constructor(
    public dialogRef: MatDialogRef<AffecterVolontaireDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { volontaire: Volontaire; projetsClotures: Project[] }
  ) {}

  confirmer(): void {
    if (!this.projetSelectionne) return;
    this.dialogRef.close({ projetId: this.projetSelectionne, role: this.role });
  }
}

// ==================== COMPOSANT PRINCIPAL ====================

@Component({
  selector: 'app-volontaires-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatSidenavModule, MatTableModule, MatPaginatorModule,
    MatSortModule, MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatCardModule, MatMenuModule, MatSelectModule, MatTooltipModule, MatDividerModule,
    MatSnackBarModule, MatDialogModule, ProfilFormComponent, RouterModule,
    AffecterVolontaireDialogComponent
  ],
  templateUrl: './volontaires-list.component.html',
  styleUrls: ['./volontaires-list.component.css']
})
export class VolontairesListComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('drawer') drawer!: MatSidenav;

  displayedColumns: string[] = [
    'nom', 'niveauEtudes', 'statut', 'mission', 'competences', 'actions'
  ];

  dataSource = new MatTableDataSource<Volontaire>([]);

  searchTerm       = '';
  filterStatus     = '';
  filterRegion     = '';
  filterDomaine    = '';
  filterCompetence = '';

  editingVolontaireId?: number;
  isSyncing = false;
  loading   = false;
  erreur: string | null = null;

  missionsVolontaires = new Map<string | number, {
    id: string | number;
    projetTitre: string;
    projetRegion?: string;
    dateAffectation: string;
  }>();

  private destroy$ = new Subject<void>();

  regions: string[] = [
    'Bankui', 'Djôrô', 'Goulmou', 'Guiriko', 'Kadiogo', 'Kuilsé',
    'Liptako', 'Nando', 'Nakambé', 'Nazinon', 'Oubri', 'Sirba',
    'Soum', 'Tannounyan', 'Tapoa', 'Sourou', 'Yaadga'
  ];

  domainesEtudes: string[] = [
    'Éducation', 'Santé', 'Environnement', 'Agriculture', 'Informatique',
    'Administration', 'Ingénierie', 'Droit', 'Économie', 'Autre'
  ];

  constructor(
    private volontaireService: VolontaireService,
    private projectService: ProjectService,
    private affectationService: AffectationService,
    private syncService: SyncService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.isSyncing = true;
    this.loading   = true;

    this.chargerDonnees();

    this.syncService.volontaires$.pipe(
      skip(1),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      console.log('🔄 [VolontairesList] Notification reçue → rechargement');
      this.chargerDonnees();
    });
  }

  ngAfterViewInit(): void {
    // ✅ Configuration de la pagination et du tri
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // ✅ Personnalisation du filtre
    this.dataSource.filterPredicate = this.customFilterPredicate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== CHARGEMENT DES DONNÉES ====================

  chargerDonnees(): void {
    forkJoin({
      volontaires: this.volontaireService.getVolontaires(),
      affectations: this.affectationService.getAllAffectations().pipe(catchError(() => of([]))),
      projets: this.http.get<any[]>(`http://localhost:3000/projets`).pipe(catchError(() => of([])))
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ volontaires, affectations, projets }) => {
        const projetsClotures = projets.filter(p => p.statutProjet === 'cloture');
        
        this.missionsVolontaires.clear();
        
        affectations
          .filter(a => a.statut === 'active')
          .forEach(affectation => {
            const projet = projetsClotures.find(p => String(p.id) === String(affectation.projectId));
            if (!projet) return;
            
            this.missionsVolontaires.set(affectation.volontaireId, {
              id: affectation.id!,
              projetTitre: projet.titre || 'Mission sans titre',
              projetRegion: projet.regionAffectation,
              dateAffectation: affectation.dateAffectation
            });
          });
        
        this._applyData(volontaires);
        this.loading = false;
        this.isSyncing = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement:', err);
        this.erreur = 'Erreur lors du chargement';
        this.loading = false;
        this.isSyncing = false;
      }
    });
  }

  loadVolontaires(): void {
    this.chargerDonnees();
  }

  rafraichir(): void {
    this.loading = true;
    this.erreur = null;
    this.chargerDonnees();
  }

  private _applyData(vols: Volontaire[]): void {
    this.dataSource.data = vols;
    
    // ✅ Important: réattacher le paginator après mise à jour des données
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
        this.paginator.firstPage();
      }
    });
  }

  // ==================== FILTRES ====================

  applyFilters(): void {
    this.dataSource.filter = JSON.stringify({
      searchTerm: this.searchTerm.toLowerCase(),
      status:     this.filterStatus.toLowerCase(),
      region:     this.filterRegion.toLowerCase(),
      domaine:    this.filterDomaine.toLowerCase(),
      competence: this.filterCompetence.toLowerCase()
    });
    
    // ✅ Retour à la première page après filtrage
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  customFilterPredicate() {
    return (data: Volontaire, filter: string): boolean => {
      const f = JSON.parse(filter);
      const matchesSearch =
        data.nom.toLowerCase().includes(f.searchTerm) ||
        data.prenom.toLowerCase().includes(f.searchTerm) ||
        data.email.toLowerCase().includes(f.searchTerm) ||
        (data.telephone || '').toLowerCase().includes(f.searchTerm) ||
        (data.competences || []).some(c => c.toLowerCase().includes(f.searchTerm));
      const matchesStatus    = !f.status    || (data.statut || '').toLowerCase() === f.status;
      const matchesRegion    = !f.region    || (data.regionGeographique || '').toLowerCase() === f.region;
      const matchesDomaine   = !f.domaine   || (data.domaineEtudes      || '').toLowerCase() === f.domaine;
      const matchesCompetence = !f.competence ||
        (data.competences || []).some(c => c.toLowerCase().includes(f.competence));
      return matchesSearch && matchesStatus && matchesRegion && matchesDomaine && matchesCompetence;
    };
  }

  filterByStatus(status: string): void { 
    this.filterStatus = status; 
    this.applyFilters(); 
  }

  reinitialiserFiltres(): void {
    this.searchTerm = ''; 
    this.filterStatus = ''; 
    this.filterRegion = '';
    this.filterDomaine = ''; 
    this.filterCompetence = '';
    this.applyFilters();
  }

  // ==================== GETTERS ====================

  getMissionVolontaire(volontaire: Volontaire): { 
    projetTitre: string; 
    projetRegion?: string; 
    dateAffectation: string;
  } | null {
    if (!volontaire.id) return null;
    return this.missionsVolontaires.get(volontaire.id) || null;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  getAffectationTooltip(volontaire: Volontaire): string {
    if (volontaire.statut === 'Candidat') {
      return '❌ Impossible : le volontaire a le statut "Candidat". Son profil doit d\'abord être complété.';
    }
    if (this.getMissionVolontaire(volontaire)) {
      return '⚠️ Ce volontaire a déjà une mission. L\'affectation remplacera la mission existante.';
    }
    return '✅ Affecter à une mission clôturée';
  }

  // ==================== DRAWER ====================

  openDrawerForAdd(): void  { 
    this.editingVolontaireId = undefined; 
    this.drawer.open(); 
  }
  
  openDrawerForEdit(id: number): void { 
    this.editingVolontaireId = id; 
    this.drawer.open(); 
  }

  onVolontaireSaved(): void {
    this.drawer.close();
    this.chargerDonnees();
    this.snackBar.open('Volontaire sauvegardé avec succès', 'Fermer', { duration: 3000 });
  }

  onDrawerClosed(): void { 
    this.editingVolontaireId = undefined; 
  }

  // ==================== SUPPRESSION ====================

  deleteVolontaire(id?: number): void {
    if (!id) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title:       'Supprimer le volontaire',
        message:     'Êtes-vous sûr de vouloir supprimer définitivement ce volontaire ?',
        confirmText: 'Supprimer',
        cancelText:  'Annuler'
      }
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.volontaireService.deleteVolontaire(id).subscribe({
          next: () => {
            this.dataSource.data = this.dataSource.data.filter(v => v.id !== id);
            this.snackBar.open('Volontaire supprimé', 'Fermer', { duration: 3000 });
          },
          error: () => this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 })
        });
      }
    });
  }

  // ==================== STATUT ====================

  changerStatutVolontaire(v: Volontaire, nouveauStatut: Volontaire['statut']): void {
    if (!v.id) { 
      this.snackBar.open('ID non défini', 'Fermer', { duration: 3000 }); 
      return; 
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title:       'Changer le statut',
        message:     `Changer le statut de ${v.prenom} ${v.nom} en "${nouveauStatut}" ?`,
        confirmText: 'Confirmer',
        cancelText:  'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        const updatedVolontaire: Volontaire = { ...v, statut: nouveauStatut };
        this.volontaireService.updateVolontaire(v.id as number, updatedVolontaire).subscribe({
          next: () => {
            this.chargerDonnees();
            this.snackBar.open(`Statut mis à jour`, 'Fermer', { duration: 3000 });
          },
          error: () => this.snackBar.open('Erreur mise à jour statut', 'Fermer', { duration: 3000 })
        });
      }
    });
  }

  // ==================== AFFECTATION ====================

  ouvrirDialogAffecter(v: Volontaire, triggerElement?: HTMLElement): void {
    if (!v.id) { 
      this.snackBar.open('ID non défini', 'Fermer', { duration: 3000 }); 
      return; 
    }

    if (v.statut === 'Candidat') {
      this.snackBar.open(
        '❌ Impossible : les volontaires avec le statut "Candidat" ne peuvent pas être affectés.',
        'Fermer', 
        { duration: 5000, panelClass: 'snackbar-error' }
      );
      return;
    }

    if (triggerElement) triggerElement.blur();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    this.projectService.getProjects().subscribe(projets => {
      const projetsClotures = projets.filter(p => p.statutProjet === 'cloture');

      if (projetsClotures.length === 0) {
        this.snackBar.open('Aucune mission clôturée disponible.', 'Fermer', { duration: 5000 });
        return;
      }

      const projetsTries = [...projetsClotures].sort((a, b) =>
        (a.titre || '').localeCompare(b.titre || '')
      );

      const dialogRef = this.dialog.open(AffecterVolontaireDialogComponent, {
        width:        '480px',
        data:         { volontaire: v, projetsClotures: projetsTries },
        autoFocus:    'first-tabbable',
        restoreFocus: false
      });

      dialogRef.afterClosed().subscribe((result: { projetId: number | string; role: string } | false) => {
        if (!result) return;

        this.affectationService.peutEtreAffecte(v.id!, result.projetId).subscribe(peutEtreAffecte => {
          if (!peutEtreAffecte) {
            this.snackBar.open(
              `${v.prenom} ${v.nom} ne peut pas être affecté à cette mission.`,
              'Fermer', { duration: 5000 }
            );
            return;
          }

          this.affectationService.createAffectation({
            volontaireId:    v.id!,
            projectId:       result.projetId,
            dateAffectation: new Date().toISOString(),
            statut:          'active',
            role:            result.role || 'Volontaire',
            notes:           `Affectation à une mission clôturée`
          }).subscribe({
            next: () => {
              this.snackBar.open(
                `${v.prenom} ${v.nom} affecté(e) à la mission clôturée ✔`,
                'Fermer', { duration: 4000 }
              );
              this.chargerDonnees();
            },
            error: err => {
              console.error('❌ Erreur affectation:', err);
              this.snackBar.open(err.message || 'Erreur lors de l\'affectation.', 'Fermer', { duration: 4000 });
            }
          });
        });
      });
    });
  }

  // ==================== EXPORT ====================

  exportCSV(): void {
    const rows = this.dataSource.filteredData;
    const csvContent = [
      ['Nom', 'Prénom', 'Email', 'Téléphone', 'Région', 'Niveau Études', 'Domaine', 'Statut', 'Mission', 'Compétences'],
      ...rows.map(v => {
        const mission = this.getMissionVolontaire(v);
        return [
          v.nom, v.prenom, v.email, v.telephone || '',
          v.regionGeographique || '', v.niveauEtudes || '', v.domaineEtudes || '',
          v.statut, mission ? mission.projetTitre : 'Aucune',
          (v.competences || []).join(', ')
        ];
      })
    ].map(e => e.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `volontaires_pnvb_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    this.snackBar.open('Export CSV généré', 'Fermer', { duration: 3000 });
  }

  // ==================== HELPERS ====================

  getCompetencesDisplay(competences: string[] | undefined): string {
    if (!competences || competences.length === 0) return 'Aucune';
    return competences.slice(0, 2).join(', ') + (competences.length > 2 ? '...' : '');
  }

  getInitiales(volontaire: Volontaire): string {
    const n = volontaire.nom?.[0]?.toUpperCase()    || '';
    const p = volontaire.prenom?.[0]?.toUpperCase() || '';
    return `${n}${p}` || '??';
  }

  getNomComplet(volontaire: Volontaire): string {
    return [volontaire.prenom, volontaire.nom].filter(Boolean).join(' ');
  }
}