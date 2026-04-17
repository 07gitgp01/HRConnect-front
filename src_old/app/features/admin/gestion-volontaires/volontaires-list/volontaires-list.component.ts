// src/app/features/admin/gestion-volontaires/volontaires-list/volontaires-list.component.ts
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

import { VolontaireService } from '../../../services/service_volont/volontaire.service';
import { Volontaire } from '../../../models/volontaire.model';
import { ProfilFormComponent } from '../profil-form/profil-form.component';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-volontaires-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSidenavModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatMenuModule,
    MatSelectModule,
    MatTooltipModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    ProfilFormComponent
  ],
  templateUrl: './volontaires-list.component.html',
  styleUrls: ['./volontaires-list.component.css']
})
export class VolontairesListComponent implements OnInit, AfterViewInit {
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('drawer') drawer!: MatSidenav;
  
  displayedColumns: string[] = [
    'nom', 'prenom', 'email', 'telephone', 'regionGeographique',
    'niveauEtudes', 'statut', 'competences', 'actions'
  ];

  dataSource = new MatTableDataSource<Volontaire>([]);

  /** Filtres */
  searchTerm: string = '';
  filterStatus: string = '';
  filterRegion: string = '';
  filterDomaine: string = '';
  filterCompetence: string = '';

  /** Drawer mode */
  editingVolontaireId?: number;

  /** Données de filtres */
  regions: string[] = [
    'Bankui', 'Djôrô', 'Goulmou', 'Guiriko', 'Kadiogo', 'Kuilsé', 
    'Liptako', 'Nando', 'Nakambé', 'Nazinon', 'Oubri', 'Sirba', 
    'Soum', 'Tannounyan', 'Tapoa', 'Sourou', 'Yaadga'
  ];

  domainesEtudes: string[] = [
    'Éducation', 'Santé', 'Environnement', 'Agriculture', 'Informatique',
    'Administration', 'Ingénierie', 'Droit', 'Économie', 'Autre'
  ];

  niveauxEtudes: string[] = [
    'CEP', 'BEPC', 'BAC', 'BAC+2', 'Licence', 'Master', 'Doctorat'
  ];

  constructor(
    private volontaireService: VolontaireService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadVolontaires();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadVolontaires(): void {
    this.volontaireService.getVolontaires().subscribe(vols => {
      this.dataSource.data = vols;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      this.dataSource.filterPredicate = this.customFilterPredicate();
      
      console.log('✅ Volontaires chargés:', vols.length);
    });
  }

  applyFilters() {
    this.dataSource.filter = JSON.stringify({
      searchTerm: this.searchTerm.toLowerCase(),
      status: this.filterStatus.toLowerCase(),
      region: this.filterRegion.toLowerCase(),
      domaine: this.filterDomaine.toLowerCase(),
      competence: this.filterCompetence.toLowerCase()
    });
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

      const matchesStatus =
        !f.status || (data.statut || '').toLowerCase() === f.status;

      const matchesRegion =
        !f.region || (data.regionGeographique || '').toLowerCase() === f.region;

      const matchesDomaine =
        !f.domaine || (data.domaineEtudes || '').toLowerCase() === f.domaine;

      const matchesCompetence =
        !f.competence ||
        (data.competences || []).some(c =>
          c.toLowerCase().includes(f.competence)
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRegion &&
        matchesDomaine &&
        matchesCompetence
      );
    };
  }

  filterByStatus(status: string) {
    this.filterStatus = status;
    this.applyFilters();
  }

  /** -------------------------------
   *  Drawer : ajouter / modifier
   * -------------------------------- */
  openDrawerForAdd(): void {
    console.log('Ouverture du drawer pour ajout');
    this.editingVolontaireId = undefined;
    this.drawer.open();
  }

  openDrawerForEdit(id: number): void {
    console.log('Ouverture du drawer pour modification, id:', id);
    this.editingVolontaireId = id;
    this.drawer.open();
  }

  onVolontaireSaved(): void {
    console.log('Volontaire sauvegardé, fermeture du drawer');
    this.drawer.close();
    this.loadVolontaires();
    this.snackBar.open('Volontaire sauvegardé avec succès', 'Fermer', { duration: 3000 });
  }

  onDrawerClosed(): void {
    console.log('Drawer fermé');
    this.editingVolontaireId = undefined;
  }

  /** -------------------------------
   *  Suppression volontaire
   * -------------------------------- */
  deleteVolontaire(id?: number) {
    if (!id) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer le volontaire',
        message: 'Êtes-vous sûr de vouloir supprimer définitivement ce volontaire ? Cette action est irréversible.',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.volontaireService.deleteVolontaire(id).subscribe({
          next: () => {
            this.dataSource.data = this.dataSource.data.filter(v => v.id !== id);
            this.snackBar.open('Volontaire supprimé avec succès', 'Fermer', { duration: 3000 });
          },
          error: (err: any) => {
            console.error('Erreur suppression volontaire:', err);
            this.snackBar.open('Erreur lors de la suppression du volontaire', 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  /** -------------------------------
   *  Changer statut volontaire
   * -------------------------------- */
  changerStatutVolontaire(v: Volontaire, nouveauStatut: Volontaire['statut']) {
    if (!v.id) {
      console.error('❌ ID du volontaire non défini:', v);
      this.snackBar.open('Erreur: ID du volontaire non défini', 'Fermer', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Changer le statut',
        message: `Changer le statut de ${v.prenom} ${v.nom} en "${nouveauStatut}" ?`,
        confirmText: 'Confirmer',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        const volontaireId: number = v.id as number;
        
        const updatedVolontaire: Volontaire = {
          ...v,
          statut: nouveauStatut
        };
        
        this.volontaireService.updateVolontaire(volontaireId, updatedVolontaire).subscribe({
          next: () => {
            this.loadVolontaires();
            this.snackBar.open(
              `Statut mis à jour pour ${v.prenom} ${v.nom}`,
              'Fermer',
              { duration: 3000 }
            );
          },
          error: (err: any) => {
            console.error('❌ Erreur changement statut:', err);
            this.snackBar.open(
              'Erreur lors de la mise à jour du statut',
              'Fermer',
              { duration: 3000 }
            );
          }
        });
      }
    });
  }

  exportCSV() {
  const rows = this.dataSource.filteredData;

  const csvContent = [
    // Remplacer 'NIP' par 'Numéro Pièce'
    ['Nom', 'Prénom', 'Email', 'Téléphone', 'Numéro Pièce', 'Région', 'Niveau Études', 'Domaine', 'Statut', 'Compétences'],
    ...rows.map(v => [
      v.nom,
      v.prenom,
      v.email,
      v.telephone,
      v.numeroPiece || '', // ✅ Utiliser numeroPiece au lieu de nip
      v.regionGeographique || '',
      v.niveauEtudes || '',
      v.domaineEtudes || '',
      v.statut,
      (v.competences || []).join(', ')
    ])
  ]
    .map(e => e.join(';'))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `volontaires_pnvb_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  
  this.snackBar.open('Export CSV généré avec succès', 'Fermer', { duration: 3000 });
}

  getCompetencesDisplay(competences: string[] | undefined): string {
    if (!competences || competences.length === 0) return 'Aucune';
    return competences.slice(0, 2).join(', ') + (competences.length > 2 ? '...' : '');
  }
}