// src/app/features/admin/components/rapports-ptf/admin-rapports-ptf.component.ts
import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RapportPTF, RapportPTFUploadRequest, RapportPTFResponse } from '../../models/rapport-ptf.model';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog/confirm-dialog.component';
import { RapportPTFService } from '../../services/rap_ptf/rapport-ptf.service';
import { PartenaireService } from '../../services/service_parten/partenaire.service';

@Component({
  selector: 'app-admin-rapports-ptf',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatAutocompleteModule
  ],
  templateUrl: './admin-rapports-ptf.component.html',
  styleUrls: ['./admin-rapports-ptf.component.scss']
})
export class AdminRapportsPTFComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['titre', 'type', 'date', 'categories', 'partenaire', 'actions'];
  rapports: RapportPTF[] = [];
  totalRapports = 0;
  pageSize = 10;
  currentPage = 0;

  uploadForm: FormGroup;
  isUploading = false;
  selectedFile: File | null = null;

  types: string[] = [];
  categories: string[] = [];
  partenairesPTF: any[] = [];
  searchQuery = '';
  selectedType = '';
  selectedCategorie = '';

  constructor(
    private fb: FormBuilder,
    @Inject(RapportPTFService) private rapportService: RapportPTFService,
    @Inject(PartenaireService) private partenaireService: PartenaireService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.uploadForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(200)]],
      type: ['', Validators.required],
      description: ['', Validators.maxLength(1000)],
      partenairePTFId: [''],
      categories: [[]],
      periode: [''],
      zoneGeographique: [''],
      themes: ['']
    });
  }

  ngOnInit(): void {
    console.log('🎬 Initialisation AdminRapportsPTFComponent');
    this.loadFallbackData();
    this.loadApiData();
    this.loadRapports();
  }

  loadFallbackData(): void {
    this.types = [
      'rapport_trimestriel',
      'rapport_annuel', 
      'rapport_impact',
      'rapport_special',
      'autre'
    ];
    
    this.categories = [
      'Rapport officiel',
      'Statistiques',
      'Impact social',
      'Finances',
      'Évaluation',
      'Projets',
      'Volontaires'
    ];
    
    this.partenairesPTF = [
      {
        id: "7357",
        nom: "startupEnter",
        nomStructure: "startupEnter",
        email: "startup@gmail.com",
        typeStructures: ["SecteurPrive", "PTF"]
      },
      {
        id: "acd1",
        nom: "ptf1",
        nomStructure: "ptf1",
        email: "ptf1@gmail.com",
        typeStructures: ["PTF"]
      }
    ];
  }

  loadApiData(): void {
    this.loadTypes();
    this.loadCategories();
    this.loadPartenairesPTF();
  }

  loadRapports(): void {
    const params = {
      page: this.currentPage + 1,
      limit: this.pageSize,
      type: this.selectedType || undefined,
      search: this.searchQuery || undefined,
      sortBy: 'date',
      sortOrder: 'desc' as const
    };

    this.rapportService.getRapportsForPTF(undefined, params).subscribe({
      next: (response: RapportPTFResponse) => {
        this.rapports = response.rapports || [];
        this.totalRapports = response.total || 0;
        
        if (this.rapports.length === 0) {
          this.snackBar.open('Aucun rapport disponible. Ajoutez-en un nouveau.', 'OK', {
            duration: 3000
          });
        }
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement rapports:', error);
        this.snackBar.open('Erreur lors du chargement des rapports: ' + error.message, 'Fermer', {
          duration: 3000
        });
        this.rapports = [];
        this.totalRapports = 0;
      }
    });
  }

  loadTypes(): void {
    this.rapportService.getTypes().subscribe({
      next: (types: string[]) => {
        if (types && types.length > 0) {
          this.types = types;
        }
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement types:', error);
      }
    });
  }

  loadCategories(): void {
    this.rapportService.getCategories().subscribe({
      next: (categories: string[]) => {
        if (categories && categories.length > 0) {
          this.categories = categories;
        }
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement catégories:', error);
      }
    });
  }

  loadPartenairesPTF(): void {
    this.partenaireService.getAll().subscribe({
      next: (partenaires: any[]) => {
        if (!partenaires || !Array.isArray(partenaires)) {
          return;
        }
        
        this.partenairesPTF = partenaires.filter(p => {
          if (!p || !p.typeStructures) return false;
          return p.typeStructures.includes('PTF');
        });
        
        this.partenairesPTF = this.partenairesPTF.map(ptf => ({
          id: ptf.id,
          nom: ptf.nomStructure || ptf.nom || 'PTF sans nom',
          nomStructure: ptf.nomStructure,
          email: ptf.email,
          typeStructures: ptf.typeStructures
        }));
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement partenaires:', error);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        this.snackBar.open('Seuls les fichiers PDF et Word sont acceptés', 'Fermer', {
          duration: 3000
        });
        event.target.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        this.snackBar.open('Le fichier ne doit pas dépasser 10MB', 'Fermer', {
          duration: 3000
        });
        event.target.value = '';
        return;
      }

      this.selectedFile = file;
      
      if (!this.uploadForm.get('titre')?.value) {
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        this.uploadForm.patchValue({ titre: fileName });
      }
    }
  }

  onSubmit(): void {
    if (this.uploadForm.invalid) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', {
        duration: 3000
      });
      return;
    }

    if (!this.selectedFile) {
      this.snackBar.open('Veuillez sélectionner un fichier', 'Fermer', {
        duration: 3000
      });
      return;
    }

    this.isUploading = true;

    const rapportData: RapportPTFUploadRequest = {
      titre: this.uploadForm.value.titre,
      type: this.uploadForm.value.type,
      description: this.uploadForm.value.description,
      partenairePTFId: this.uploadForm.value.partenairePTFId || undefined,
      categories: this.uploadForm.value.categories || [],
      metadata: {
        periode: this.uploadForm.value.periode,
        zoneGeographique: this.uploadForm.value.zoneGeographique?.split(',').map((z: string) => z.trim()) || [],
        themes: this.uploadForm.value.themes?.split(',').map((t: string) => t.trim()) || []
      }
    };

    this.rapportService.uploadRapport(rapportData, this.selectedFile).subscribe({
      next: (rapport: RapportPTF) => {
        this.isUploading = false;
        this.selectedFile = null;
        this.uploadForm.reset();
        
        this.snackBar.open('Rapport téléchargé avec succès', 'Fermer', {
          duration: 3000
        });
        
        this.loadRapports();
      },
      error: (error: any) => {
        console.error('❌ Erreur upload rapport:', error);
        this.isUploading = false;
        this.snackBar.open('Erreur lors du téléchargement du rapport: ' + (error.message || 'Erreur inconnue'), 'Fermer', {
          duration: 5000
        });
      }
    });
  }

  deleteRapport(rapportId: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmer la suppression',
        message: 'Êtes-vous sûr de vouloir supprimer ce rapport ? Cette action est irréversible.'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.rapportService.deleteRapport(rapportId).subscribe({
          next: () => {
            this.snackBar.open('Rapport supprimé avec succès', 'Fermer', {
              duration: 3000
            });
            this.loadRapports();
          },
          error: (error: any) => {
            console.error('❌ Erreur suppression rapport:', error);
            this.snackBar.open('Erreur lors de la suppression du rapport: ' + error.message, 'Fermer', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  downloadRapport(url: string, titre: string): void {
    if (!url) {
      this.snackBar.open('URL de téléchargement non disponible', 'Fermer', {
        duration: 3000
      });
      return;
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = (titre || 'rapport') + '.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    this.currentPage = 0;
    this.loadRapports();
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

  getPartnerName(partenairePTFId: string | number | undefined): string {
    if (!partenairePTFId) {
      return 'Tous les PTF';
    }
    
    const partenaire = this.partenairesPTF.find(p => p.id === partenairePTFId.toString());
    return partenaire ? partenaire.nomStructure : 'PTF inconnu';
  }

  getPtfDisplayName(ptf: any): string {
    if (!ptf) return '';
    
    let display = ptf.nomStructure || ptf.nom || 'PTF sans nom';
    if (ptf.email) {
      display += ` (${ptf.email})`;
    }
    return display;
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

  scrollToUpload(): void {
    const uploadSection = document.querySelector('.upload-section');
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  debugForm(): void {
    console.log('🐛 Debug formulaire:', {
      formValid: this.uploadForm.valid,
      formValues: this.uploadForm.value,
      selectedFile: this.selectedFile
    });
  }
}