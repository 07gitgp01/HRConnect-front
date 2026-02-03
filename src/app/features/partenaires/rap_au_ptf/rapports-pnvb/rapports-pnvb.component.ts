// src/app/features/partenaires/components/rapports-pnvb/rapports-pnvb.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
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
import { RapportPTF, RapportPTFSearchParams } from '../../../models/rapport-ptf.model';
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
    FileSizePipe // AJOUTÉ ICI - le pipe doit être importé
  ],
  templateUrl: './rapports-pnvb.component.html',
  styleUrls: ['./rapports-pnvb.component.scss']
})
export class RapportsPnvbComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['titre', 'type', 'date', 'categories', 'taille', 'actions'];
  rapports: RapportPTF[] = [];
  totalRapports = 0;
  pageSize = 10;
  currentPage = 0;
  
  // Filtres
  types: string[] = [];
  categories: string[] = [];
  searchQuery = '';
  selectedType = '';
  selectedCategorie = '';
  selectedPeriode = '';
  
  // Chargement
  isLoading = true;
  isDownloading = false;
  
  // Partenaire PTF - CORRECTION: accepter string ou number
  partenairePTFId: string | number | null = null; // MODIFIÉ ICI
  statsConsultation: any = null;

  constructor(
    private rapportService: RapportsPtfConsultationService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('🎬 Initialisation consultation rapports PNVB');
    
    // Récupérer l'ID du partenaire PTF
    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user && user.id) {
          // CORRECTION: user.id peut être string ou number
          this.partenairePTFId = user.id;
          console.log('✅ Partenaire PTF ID:', this.partenairePTFId);
          
          this.loadTypes();
          this.loadCategories();
          this.loadRapports();
          this.loadStats();
        } else {
          console.error('❌ Utilisateur non connecté ou non PTF');
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('❌ Erreur récupération utilisateur:', error);
        this.isLoading = false;
      }
    });
  }

  loadRapports(): void {
    if (!this.partenairePTFId) {
      console.error('❌ ID partenaire PTF manquant');
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    
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

    // Convertir en number pour l'API si c'est un string
    const partenaireId = typeof this.partenairePTFId === 'string' 
      ? parseInt(this.partenairePTFId, 10) 
      : this.partenairePTFId;

    this.rapportService.getRapportsForPTF(partenaireId, params).subscribe({
      next: (response) => {
        console.log('✅ Rapports chargés:', response);
        this.rapports = response.rapports || [];
        this.totalRapports = response.total || 0;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement rapports:', error);
        this.snackBar.open('Erreur lors du chargement des rapports', 'Fermer', {
          duration: 3000
        });
        this.rapports = [];
        this.totalRapports = 0;
        this.isLoading = false;
      }
    });
  }

  loadTypes(): void {
    this.rapportService.getTypes().subscribe({
      next: (types) => {
        console.log('✅ Types disponibles:', types);
        if (types && types.length > 0) {
          this.types = types;
        } else {
          // Fallback
          this.types = [
            'rapport_trimestriel',
            'rapport_annuel', 
            'rapport_impact',
            'rapport_special',
            'autre'
          ];
        }
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement types:', error);
        this.types = [
          'rapport_trimestriel',
          'rapport_annuel', 
          'rapport_impact',
          'rapport_special',
          'autre'
        ];
      }
    });
  }

  loadCategories(): void {
    this.rapportService.getCategories().subscribe({
      next: (categories) => {
        console.log('✅ Catégories disponibles:', categories);
        if (categories && categories.length > 0) {
          this.categories = categories;
        } else {
          // Fallback
          this.categories = [
            'Rapport officiel',
            'Statistiques',
            'Impact social',
            'Finances',
            'Évaluation',
            'Projets',
            'Volontaires'
          ];
        }
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement catégories:', error);
        this.categories = [
          'Rapport officiel',
          'Statistiques',
          'Impact social',
          'Finances',
          'Évaluation',
          'Projets',
          'Volontaires'
        ];
      }
    });
  }

  loadStats(): void {
    if (!this.partenairePTFId) return;

    // Convertir en number pour l'API si c'est un string
    const partenaireId = typeof this.partenairePTFId === 'string' 
      ? parseInt(this.partenairePTFId, 10) 
      : this.partenairePTFId;

    this.rapportService.getStatsConsultation(partenaireId).subscribe({
      next: (stats) => {
        console.log('📈 Statistiques consultation:', stats);
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
    if (!rapport.id || !this.partenairePTFId) return;

    console.log('📥 Téléchargement rapport:', rapport.titre);
    
    this.isDownloading = true;

    // Convertir en number pour l'API si c'est un string
    const partenaireId = typeof this.partenairePTFId === 'string' 
      ? parseInt(this.partenairePTFId, 10) 
      : this.partenairePTFId;

    // Marquer comme consulté
    this.rapportService.marquerCommeConsulte(rapport.id, partenaireId).subscribe({
      next: () => {
        console.log('✅ Rapport marqué comme consulté');
      },
      error: (error: any) => {
        console.warn('⚠️ Erreur marquage consultation:', error);
      }
    });

    // Télécharger le fichier
    this.rapportService.telechargerRapport(rapport.id).subscribe({
      next: (blob: Blob) => {
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
        
        this.isDownloading = false;
        
        // Rafraîchir les stats
        this.loadStats();
      },
      error: (error: any) => {
        console.error('❌ Erreur téléchargement:', error);
        this.snackBar.open('Erreur lors du téléchargement du rapport', 'Fermer', {
          duration: 3000
        });
        this.isDownloading = false;
      }
    });
  }

  previewRapport(rapport: RapportPTF): void {
    console.log('👁️ Prévisualisation rapport:', rapport.titre);
    
    if (rapport.url) {
      // Ouvrir dans un nouvel onglet
      window.open(rapport.url, '_blank');
      
      // Marquer comme consulté
      if (rapport.id && this.partenairePTFId) {
        // Convertir en number pour l'API si c'est un string
        const partenaireId = typeof this.partenairePTFId === 'string' 
          ? parseInt(this.partenairePTFId, 10) 
          : this.partenairePTFId;

        this.rapportService.marquerCommeConsulte(rapport.id, partenaireId).subscribe({
          next: () => {
            console.log('✅ Rapport marqué comme consulté');
            this.loadStats();
          }
        });
      }
    }
  }

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

  // AJOUT: Méthode pour générer la couleur des catégories
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

  openInfoDialog(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Informations sur les rapports PNVB',
        message: 'Cette section vous permet de consulter les rapports officiels publiés par le Programme National de Volontariat (PNVB). ' +
                'Les rapports sont classés par type (trimestriel, annuel, d\'impact, etc.) et catégorie. ' +
                'Vous pouvez télécharger ou prévisualiser chaque rapport.',
        confirmButtonText: 'Compris',
        showCancelButton: false
      }
    });
  }
}