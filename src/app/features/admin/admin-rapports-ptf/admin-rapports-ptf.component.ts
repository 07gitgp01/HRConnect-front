// src/app/features/admin/components/rapports-ptf/admin-rapports-ptf.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import {
  RapportPTF,
  RapportPTFUploadRequest,
  RapportPTFResponse
} from '../../models/rapport-ptf.model';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog/confirm-dialog.component';
import { RapportPTFService } from '../../services/rap_ptf/rapport-ptf.service';
import { PartenaireService } from '../../services/service_parten/partenaire.service';

@Component({
  selector: 'app-admin-rapports-ptf',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatDialogModule, MatSnackBarModule,
    MatTooltipModule, MatChipsModule
  ],
  templateUrl: './admin-rapports-ptf.component.html',
  styleUrls: ['./admin-rapports-ptf.component.scss']
})
export class AdminRapportsPTFComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['titre', 'type', 'date', 'periode', 'destinataires', 'actions'];
  rapports: RapportPTF[] = [];
  totalRapports = 0;
  pageSize = 10;
  currentPage = 0;

  // Formulaire : 5 champs uniquement
  uploadForm: FormGroup;
  isUploading = false;
  isDownloading = false;
  selectedFile: File | null = null;

  types: string[] = [];
  partenairesPTF: any[] = [];

  // Filtres liste
  searchQuery = '';
  selectedType = '';

  constructor(
    private fb: FormBuilder,
    private rapportService: RapportPTFService,
    private partenaireService: PartenaireService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.uploadForm = this.fb.group({
      titre:            ['', [Validators.required, Validators.maxLength(200)]],
      type:             ['', Validators.required],
      partenairePTFIds: [[]], // multi-select → tableau de strings
      periode:          ['']
    });
  }

  ngOnInit(): void {
    this.loadFallbackData();
    this.loadTypes();
    this.loadPartenairesPTF();
    this.loadRapports();
  }

  // ─── Données de secours ───────────────────────────────────────────────────

  private loadFallbackData(): void {
    this.types = [
      'rapport_trimestriel', 'rapport_annuel',
      'rapport_impact', 'rapport_special', 'autre'
    ];
    this.partenairesPTF = [
      { id: '7357', nomStructure: 'startupEnter', email: 'startup@gmail.com' },
      { id: 'acd1', nomStructure: 'ptf1',         email: 'ptf1@gmail.com'   }
    ];
  }

  // ─── Chargement ───────────────────────────────────────────────────────────

  loadRapports(): void {
    const params = {
      page:      this.currentPage + 1,
      limit:     this.pageSize,
      type:      this.selectedType || undefined,
      search:    this.searchQuery  || undefined,
      sortBy:    'date',
      sortOrder: 'desc' as const
    };

    this.rapportService.getRapportsForPTF(undefined, params).subscribe({
      next: (response: RapportPTFResponse) => {
        this.rapports      = response.rapports || [];
        this.totalRapports = response.total    || 0;
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement des rapports', 'Fermer', { duration: 3000 });
        this.rapports = []; this.totalRapports = 0;
      }
    });
  }

  loadTypes(): void {
    this.rapportService.getTypes().subscribe({
      next: (types) => { if (types?.length) this.types = types; }
    });
  }

  loadPartenairesPTF(): void {
    this.partenaireService.getAll().subscribe({
      next: (partenaires: any[]) => {
        if (!Array.isArray(partenaires)) return;
        const ptfs = partenaires.filter(p => p?.typeStructures?.includes('PTF'));
        if (ptfs.length) {
          this.partenairesPTF = ptfs.map(p => ({
            id:           String(p.id), // ✅ toujours string
            nomStructure: p.nomStructure || p.nom || 'PTF sans nom',
            email:        p.email
          }));
        }
      }
    });
  }

  // ─── Fichier ──────────────────────────────────────────────────────────────

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowed.includes(file.type)) {
      this.snackBar.open('Seuls les fichiers PDF et Word sont acceptés', 'Fermer', { duration: 3000 });
      event.target.value = ''; return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('Le fichier ne doit pas dépasser 10 MB', 'Fermer', { duration: 3000 });
      event.target.value = ''; return;
    }

    this.selectedFile = file;
    if (!this.uploadForm.get('titre')?.value) {
      this.uploadForm.patchValue({ titre: file.name.replace(/\.[^/.]+$/, '') });
    }
  }

  // ─── Soumission ───────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', { duration: 3000 });
      return;
    }
    if (!this.selectedFile) {
      this.snackBar.open('Veuillez sélectionner un fichier', 'Fermer', { duration: 3000 });
      return;
    }

    this.isUploading = true;
    const v = this.uploadForm.value;

    const rapportData: RapportPTFUploadRequest = {
      titre:            v.titre,
      type:             v.type,
      partenairePTFIds: v.partenairePTFIds || [],
      metadata: {
        periode: v.periode || undefined
      }
    };

    this.rapportService.uploadRapport(rapportData, this.selectedFile).subscribe({
      next: () => {
        this.isUploading  = false;
        this.selectedFile = null;
        this.uploadForm.reset({ partenairePTFIds: [] });
        this.snackBar.open('Rapport envoyé avec succès', 'Fermer', { duration: 3000 });
        this.loadRapports();
      },
      error: (err: Error) => {
        this.isUploading = false;
        this.snackBar.open(
          err.message || 'Erreur lors de l\'envoi',
          'Fermer', { duration: 5000 }
        );
      }
    });
  }

  resetForm(): void {
    this.uploadForm.reset({ partenairePTFIds: [] });
    this.selectedFile = null;
  }

  // ─── Téléchargement ──────────────────────────────────────────────────────

  downloadRapport(rapportId: number, titre: string): void {
    this.isDownloading = true;
    this.rapportService.downloadRapport(rapportId).subscribe({
      next: (blob: Blob) => {
        const ext  = blob.type === 'application/pdf' ? 'pdf' : 'docx';
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `${titre || 'rapport'}.${ext}`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); window.URL.revokeObjectURL(url);
        this.isDownloading = false;
        this.snackBar.open('Rapport téléchargé avec succès', 'Fermer', { duration: 3000 });
      },
      error: (err: Error) => {
        this.isDownloading = false;
        this.snackBar.open(err.message || 'Erreur de téléchargement', 'Fermer', { duration: 4000 });
      }
    });
  }

  // ─── Suppression ─────────────────────────────────────────────────────────

  deleteRapport(rapportId: number): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title:   'Confirmer la suppression',
        message: 'Êtes-vous sûr de vouloir supprimer ce rapport ? Cette action est irréversible.'
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.rapportService.deleteRapport(rapportId).subscribe({
        next: () => {
          this.snackBar.open('Rapport supprimé', 'Fermer', { duration: 3000 });
          this.loadRapports();
        },
        error: (err: Error) => this.snackBar.open(
          err.message || 'Erreur suppression', 'Fermer', { duration: 3000 }
        )
      });
    });
  }

  // ─── Filtres & pagination ─────────────────────────────────────────────────

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize    = event.pageSize;
    this.loadRapports();
  }

  onSearch(): void { this.currentPage = 0; this.loadRapports(); }

  clearFilters(): void {
    this.searchQuery = ''; this.selectedType = '';
    this.currentPage = 0; this.loadRapports();
  }

  // ─── Utilitaires ─────────────────────────────────────────────────────────

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      rapport_trimestriel: 'Rapport Trimestriel',
      rapport_annuel:      'Rapport Annuel',
      rapport_impact:      "Rapport d'Impact",
      rapport_special:     'Rapport Spécial',
      autre:               'Autre'
    };
    return labels[type] || type;
  }

  getFileIcon(type: string): string {
    const icons: Record<string, string> = {
      rapport_trimestriel: 'calendar_today',
      rapport_annuel:      'calendar_view_month',
      rapport_impact:      'trending_up',
      rapport_special:     'star',
      autre:               'description'
    };
    return icons[type] || 'description';
  }

  getFileIconColor(type: string): string {
    const colors: Record<string, string> = {
      rapport_trimestriel: '#2196F3',
      rapport_annuel:      '#4CAF50',
      rapport_impact:      '#FF9800',
      rapport_special:     '#9C27B0',
      autre:               '#607D8B'
    };
    return colors[type] || '#757575';
  }

  /** Noms des PTF destinataires d'un rapport */
  getDestinataireLabels(rapport: RapportPTF): string {
    // Nouveau format
    const ids = rapport.partenairePTFIds;
    if (ids?.length) {
      return ids
        .map(id => this.partenairesPTF.find(p => p.id === String(id))?.nomStructure || id)
        .join(', ');
    }
    // Ancien format singulier
    const singulier = (rapport as any).partenairePTFId;
    if (singulier) {
      return this.partenairesPTF.find(p => p.id === String(singulier))?.nomStructure || String(singulier);
    }
    return 'Tous les PTF';
  }

  getPtfDisplayName(ptf: any): string {
    return ptf?.email
      ? `${ptf.nomStructure} (${ptf.email})`
      : ptf?.nomStructure || '';
  }
}