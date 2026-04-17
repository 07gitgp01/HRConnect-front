// src/app/features/partenaires/rap_au_ptf/rapports-pnvb/rapports-pnvb.component.ts
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { 
  RapportPTF, 
  RapportPTFSearchParams, 
  RapportPTFResponse,
  RapportType,
  StatsConsultation
} from '../../../models/rapport-ptf.model';
import { RapportsPtfConsultationService } from '../../../services/rap_ptf_consul/rapports-ptf-consultation.service';
import { AuthService } from '../../../services/service_auth/auth.service';
import { FileSizePipe } from '../../../../shared/pipes/pipeptf/file-size.pipe';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-rapports-pnvb',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    RouterModule,
    FileSizePipe
  ],
  templateUrl: './rapports-pnvb.component.html',
  styleUrls: ['./rapports-pnvb.component.scss']
})
export class RapportsPnvbComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['titre', 'type', 'date', 'categories', 'taille', 'actions'];
  rapports: RapportPTF[] = [];
  totalRapports = 0;
  pageSize = 10;
  currentPage = 0;
  
  // Filtres - CORRECTION: selectedType est de type RapportType
  types: RapportType[] = [];
  categories: string[] = [];
  searchQuery = '';
  selectedType: RapportType | '' = '';
  selectedCategorie = '';
  selectedPeriode = '';
  
  // États de chargement
  isLoading = true;
  isDownloading = false;
  
  // Identifiant du partenaire PTF connecté
  partenairePTFId: number | null = null;
  
  // Statistiques de consultation
  statsConsultation: StatsConsultation | null = null;
  
  // Subject pour gérer la désinscription des observables
  private destroy$ = new Subject<void>();

  constructor(
    private rapportService: RapportsPtfConsultationService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('🎬 Initialisation RapportsPnvbComponent');
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          if (user && user.id) {
            this.partenairePTFId = typeof user.id === 'string' 
              ? parseInt(user.id, 10) 
              : user.id;
            
            console.log('✅ Partenaire PTF ID:', this.partenairePTFId);
            
            this.loadTypes();
            this.loadCategories();
            this.loadRapports();
            this.loadStats();
          } else {
            console.error('❌ Utilisateur non connecté ou ID manquant');
            this.handleAuthError();
          }
        },
        error: (error: any) => {
          console.error('❌ Erreur récupération utilisateur:', error);
          this.handleAuthError();
        }
      });
  }

  private handleAuthError(): void {
    this.isLoading = false;
    this.snackBar.open(
      'Vous devez être connecté en tant que PTF pour consulter les rapports',
      'Fermer',
      { duration: 5000 }
    );
  }

  loadRapports(): void {
    if (!this.partenairePTFId) {
      console.error('❌ ID partenaire PTF manquant');
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    
    // CORRECTION: Typage strict des params
    const params: RapportPTFSearchParams = {
      page: this.currentPage + 1,
      limit: this.pageSize,
      type: this.selectedType || undefined,
      categorie: this.selectedCategorie || undefined,
      periode: this.selectedPeriode || undefined,
      search: this.searchQuery || undefined,
      sortBy: 'date',
      sortOrder: 'desc'
    };

    console.log('📊 Chargement rapports avec params:', params);

    this.rapportService.getRapportsForPTF(this.partenairePTFId, params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: RapportPTFResponse) => {
          console.log('✅ Rapports chargés:', {
            total: response.total,
            count: response.rapports.length
          });
          
          this.rapports = response.rapports || [];
          this.totalRapports = response.total || 0;
          this.isLoading = false;
          
          if (this.rapports.length === 0 && !this.hasActiveFilters()) {
            this.snackBar.open(
              'Aucun rapport disponible pour le moment',
              'OK',
              { duration: 3000 }
            );
          }
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement rapports:', error);
          this.rapports = [];
          this.totalRapports = 0;
          this.isLoading = false;
          
          this.snackBar.open(
            'Erreur lors du chargement des rapports',
            'Fermer',
            { duration: 3000 }
          );
        }
      });
  }

  loadTypes(): void {
    this.rapportService.getTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types: RapportType[]) => {
          this.types = types;
          console.log('✅ Types chargés:', types.length);
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement types:', error);
        }
      });
  }

  loadCategories(): void {
    this.rapportService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories: string[]) => {
          this.categories = categories;
          console.log('✅ Catégories chargées:', categories.length);
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement catégories:', error);
        }
      });
  }

  loadStats(): void {
    if (!this.partenairePTFId) return;

    this.rapportService.getStatsConsultation(this.partenairePTFId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats: StatsConsultation) => {
          console.log('📈 Statistiques chargées:', stats);
          this.statsConsultation = stats;
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement stats:', error);
          this.statsConsultation = {
            totalRapports: 0,
            rapportsConsultes: 0,
            derniereConsultation: null
          };
        }
      });
  }

  telechargerRapport(rapport: RapportPTF): void {
    if (!rapport.id || !this.partenairePTFId) {
      this.snackBar.open('Impossible de télécharger ce rapport', 'Fermer', {
        duration: 3000
      });
      return;
    }

    console.log('📥 Téléchargement rapport:', rapport.titre);
    
    this.isDownloading = true;

    this.rapportService.marquerCommeConsulte(rapport.id, this.partenairePTFId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('✅ Consultation marquée'),
        error: (error: any) => console.warn('⚠️ Erreur marquage:', error)
      });

    this.rapportService.telechargerRapport(rapport.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.downloadBlob(blob, rapport);
          this.isDownloading = false;
          this.loadStats();
        },
        error: (error: Error) => {
          console.error('❌ Erreur téléchargement:', error);
          this.snackBar.open(
            error.message || 'Erreur lors du téléchargement du rapport',
            'Fermer',
            { duration: 3000 }
          );
          this.isDownloading = false;
        }
      });
  }

  private downloadBlob(blob: Blob, rapport: RapportPTF): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rapport.titre}.${this.getFileExtension(rapport.url)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Rapport téléchargé avec succès', 'Fermer', {
      duration: 3000
    });
  }

  previewRapport(rapport: RapportPTF): void {
    console.log('👁️ Prévisualisation rapport:', rapport.titre);
    
    if (!rapport.url) {
      this.snackBar.open('URL du rapport non disponible', 'Fermer', {
        duration: 3000
      });
      return;
    }
    
    window.open(rapport.url, '_blank');
    
    if (rapport.id && this.partenairePTFId) {
      this.rapportService.marquerCommeConsulte(rapport.id, this.partenairePTFId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Consultation marquée');
            this.loadStats();
          },
          error: (error: any) => console.warn('⚠️ Erreur marquage:', error)
        });
    }
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRapports();
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadRapports();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedType = '';
    this.selectedCategorie = '';
    this.selectedPeriode = '';
    this.currentPage = 0;
    this.loadRapports();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedType || this.selectedCategorie || this.selectedPeriode);
  }

  openInfoDialog(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Informations sur les rapports PNVB',
        message: 
          'Cette section vous permet de consulter les rapports officiels publiés par le Programme National de Volontariat (PNVB). ' +
          'Les rapports sont classés par type (trimestriel, annuel, d\'impact, etc.) et catégorie. ' +
          'Vous pouvez télécharger ou prévisualiser chaque rapport.',
        confirmButtonText: 'Compris',
        showCancelButton: false
      }
    });
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'rapport_trimestriel': 'Rapport Trimestriel',
      'rapport_annuel': 'Rapport Annuel',
      'rapport_impact': 'Rapport d\'Impact',
      'rapport_special': 'Rapport Spécial',
      'autre': 'Autre'
    };
    return labels[type] || type;
  }

  getFileIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'rapport_trimestriel': 'calendar_today',
      'rapport_annuel': 'calendar_view_month',
      'rapport_impact': 'trending_up',
      'rapport_special': 'star',
      'autre': 'description'
    };
    return icons[type] || 'description';
  }

  getFileIconColor(type: string): string {
    const colors: { [key: string]: string } = {
      'rapport_trimestriel': '#2196F3',
      'rapport_annuel': '#4CAF50',
      'rapport_impact': '#FF9800',
      'rapport_special': '#9C27B0',
      'autre': '#607D8B'
    };
    return colors[type] || '#757575';
  }

  getFileExtension(url: string): string {
    if (!url) return 'pdf';
    const parts = url.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : 'pdf';
  }

  getPeriodeLabel(rapport: RapportPTF): string {
    if (rapport.metadata?.periode) {
      return rapport.metadata.periode;
    }
    
    const date = new Date(rapport.date);
    const mois = date.getMonth() + 1;
    const annee = date.getFullYear();
    
    if (rapport.type === 'rapport_trimestriel') {
      const trimestre = Math.ceil(mois / 3);
      return `T${trimestre} ${annee}`;
    } else if (rapport.type === 'rapport_annuel') {
      return `Année ${annee}`;
    }
    
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  getCategoryColor(category: string): string {
    const colors = [
      '#E3F2FD', '#F3E5F5', '#E8F5E9', '#FFF3E0', '#FCE4EC',
      '#F1F8E9', '#FFF8E1', '#F9FBE7', '#E0F2F1', '#F5F5F5'
    ];
    
    if (!category) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}