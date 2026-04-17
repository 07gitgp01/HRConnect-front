// src/app/features/partenaires/rap_au_ptf/rapports-pnvb/rapports-pnvb.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, filter, take, catchError, of } from 'rxjs';

import {
  RapportPTF,
  RapportPTFSearchParams,
  RapportPTFResponse,
  RapportType,
  StatsConsultation
} from '../../../models/rapport-ptf.model';
import { RapportsPtfConsultationService } from '../../../services/rap_ptf_consul/rapports-ptf-consultation.service';
import { AuthService } from '../../../services/service_auth/auth.service';
import { AuthenticatedUser } from '../../../models/user.model';
import { Partenaire } from '../../../models/partenaire.model';
import { FileSizePipe } from '../../../../shared/pipes/pipeptf/file-size.pipe';
import { environment } from '../../../environment/environment';

// Types de fichiers prévisualisables directement dans le navigateur
type FileCategory = 'pdf' | 'image' | 'office' | 'other';

@Component({
  selector: 'app-rapports-pnvb',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTooltipModule,
    MatProgressSpinnerModule, MatProgressBarModule,
    MatSnackBarModule, FileSizePipe
  ],
  templateUrl: './rapports-pnvb.component.html',
  styleUrls: ['./rapports-pnvb.component.scss']
})
export class RapportsPnvbComponent implements OnInit, OnDestroy {

  displayedColumns: string[] = ['titre', 'type', 'date', 'periode', 'taille', 'actions'];
  rapports: RapportPTF[]     = [];
  totalRapports  = 0;
  pageSize       = 10;
  currentPage    = 0;

  types: RapportType[]           = [];
  searchQuery                    = '';
  selectedType: RapportType | '' = '';
  selectedPeriode                = '';

  isLoading     = true;
  isDownloading = false;
  isPreviewing  = false;

  // ── Modale prévisualisation ───────────────────────────────────────────────
  showPreviewModal  = false;
  previewTitle      = '';
  previewCategory: FileCategory = 'other';
  previewSafeUrl: SafeResourceUrl | null = null;   // pour <iframe> et <img>
  previewBlobUrl    = '';                           // URL brute pour téléchargement
  private previewRapportCourant: RapportPTF | null = null;

  partenairePTFId: string | null              = null;
  statsConsultation: StatsConsultation | null = null;

  private readonly apiUrl    = `${environment.apiUrl}/rapports-ptf`;
  private readonly serverUrl = environment.apiUrl.replace(/\/api$/, '');
  private blobUrls: string[] = [];
  private destroy$           = new Subject<void>();

  constructor(
    private rapportService: RapportsPtfConsultationService,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void { this.initializeComponent(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.blobUrls.forEach(url => URL.revokeObjectURL(url));
  }

  // ─── Initialisation ───────────────────────────────────────────────────────

  private initializeComponent(): void {
    this.authService.currentUser$.pipe(
      filter(user => user !== null && user !== undefined),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user: AuthenticatedUser) => {
        if (user?.role !== 'partenaire') {
          this.isLoading = false;
          this.snackBar.open('Accès réservé aux PTF', 'Fermer', { duration: 5000 });
          return;
        }
        const partenaire = user as Partenaire;
        if (!partenaire.typeStructures?.includes('PTF')) {
          this.isLoading = false;
          this.snackBar.open('Votre structure n\'a pas accès à l\'espace PTF', 'Fermer', { duration: 5000 });
          return;
        }
        const rawId = partenaire.id;
        if (rawId === undefined || rawId === null) {
          this.isLoading = false;
          this.snackBar.open('Erreur : ID partenaire introuvable', 'Fermer', { duration: 5000 });
          return;
        }
        this.partenairePTFId = String(rawId);
        console.log('✅ PTF connecté:', partenaire.nomStructure, '| ID:', this.partenairePTFId);
        this.loadTypes();
        this.loadRapportsEtStats();
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Erreur d\'authentification', 'Fermer', { duration: 5000 });
      }
    });
  }

  // ─── Chargement ───────────────────────────────────────────────────────────

  private loadRapportsEtStats(): void {
    if (!this.partenairePTFId) { this.isLoading = false; return; }
    this.isLoading = true;

    const params: RapportPTFSearchParams = {
      page:      this.currentPage + 1,
      limit:     this.pageSize,
      type:      this.selectedType    || undefined,
      periode:   this.selectedPeriode || undefined,
      search:    this.searchQuery     || undefined,
      sortBy:    'date',
      sortOrder: 'desc'
    };

    this.rapportService.getRapportsForPTF(this.partenairePTFId, params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: RapportPTFResponse) => {
          this.rapports      = response.rapports || [];
          this.totalRapports = response.total    || 0;
          this.isLoading     = false;
          this.calculerStats();
        },
        error: () => {
          this.rapports = []; this.totalRapports = 0; this.isLoading = false;
          this.snackBar.open('Erreur lors du chargement', 'Fermer', { duration: 3000 });
        }
      });
  }

  private calculerStats(): void {
    if (!this.partenairePTFId) return;
    this.rapportService.getStatsConsultation(this.partenairePTFId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (s: StatsConsultation) => this.statsConsultation = s });
  }

  private refreshStats(): void {
    if (!this.partenairePTFId) return;
    this.rapportService.getStatsConsultation(this.partenairePTFId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (s: StatsConsultation) => this.statsConsultation = s });
  }

  loadRapports(): void { this.loadRapportsEtStats(); }

  loadTypes(): void {
    this.rapportService.getTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (t) => this.types = t });
  }

  // ─── Détection du type de fichier ────────────────────────────────────────

  /**
   * Détermine la catégorie depuis l'extension OU le mimeType stocké.
   * Priorité : extension de l'URL → mimeType du rapport → 'other'
   */
  private detecterCategorie(url?: string, mimeType?: string): FileCategory {
    const ext = url ? url.split('.').pop()?.toLowerCase() ?? '' : '';

    if (['pdf'].includes(ext) || mimeType === 'application/pdf') {
      return 'pdf';
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) ||
        mimeType?.startsWith('image/')) {
      return 'image';
    }
    if (['doc', 'docx', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext) ||
        mimeType?.includes('word') || mimeType?.includes('officedocument') ||
        mimeType?.includes('opendocument')) {
      return 'office';
    }
    return 'other';
  }

  // ─── Prévisualisation ─────────────────────────────────────────────────────

  previewRapport(rapport: RapportPTF): void {
    if (!rapport.id) {
      this.snackBar.open('ID du rapport manquant', 'Fermer', { duration: 3000 });
      return;
    }

    if (this.partenairePTFId) {
      this.rapportService.marquerCommeConsulte(rapport.id, this.partenairePTFId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: () => this.refreshStats() });
    }

    const urlRelative = (rapport as any).url as string | undefined;
    const mimeType    = (rapport as any).typeFichier as string | undefined;
    const categorie   = this.detecterCategorie(urlRelative, mimeType);

    // Fichiers office/other → téléchargement direct (pas de viewer natif)
    if (categorie === 'office' || categorie === 'other') {
      this.snackBar.open(
        categorie === 'office'
          ? 'Fichier Office — ouverture via téléchargement…'
          : 'Type de fichier non prévisualisable — téléchargement…',
        'Fermer', { duration: 2500 }
      );
      this.telechargerRapport(rapport);
      return;
    }

    // PDF ou image → modale
    this.isPreviewing = true;
    this.previewRapportCourant = rapport;

    if (urlRelative) {
      const urlComplete = this.buildFileUrl(urlRelative);
      this.http.get(urlComplete, { responseType: 'blob' })
        .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
        .subscribe(blob => {
          if (blob && blob.size > 0) {
            this.afficherDansModale(blob, rapport.titre, categorie);
          } else {
            this.previewViaBase64(rapport.id!, rapport.titre, categorie);
          }
        });
    } else {
      this.previewViaBase64(rapport.id, rapport.titre, categorie);
    }
  }

  private previewViaBase64(rapportId: number, titre: string, categorie: FileCategory): void {
    this.http.get<any>(`${this.apiUrl}/${rapportId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (data?.fichierBase64) {
            const mime = data.typeFichier || this.mimeParCategorie(categorie);
            const blob = this.base64ToBlob(data.fichierBase64, mime);
            // Recalculer la catégorie depuis le vrai mimeType stocké
            const cat  = this.detecterCategorie(undefined, mime);
            if (cat === 'office' || cat === 'other') {
              this.isPreviewing = false;
              this.snackBar.open('Fichier non prévisualisable — téléchargement…', 'Fermer', { duration: 2500 });
              this.declencharTelechargement(blob, titre, mime);
            } else {
              this.afficherDansModale(blob, titre, cat);
            }
          } else {
            this.isPreviewing = false;
            this.snackBar.open('Fichier introuvable dans la base de données', 'Fermer', { duration: 3000 });
          }
        },
        error: () => {
          this.isPreviewing = false;
          this.snackBar.open('Impossible de prévisualiser ce rapport', 'Fermer', { duration: 3000 });
        }
      });
  }

  private afficherDansModale(blob: Blob, titre: string, categorie: FileCategory): void {
    // Révoquer l'URL précédente si elle existe
    if (this.previewBlobUrl) {
      URL.revokeObjectURL(this.previewBlobUrl);
    }

    const blobUrl = URL.createObjectURL(blob);
    this.blobUrls.push(blobUrl);

    this.previewBlobUrl   = blobUrl;
    this.previewTitle     = titre;
    this.previewCategory  = categorie;
    this.previewSafeUrl   = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
    this.isPreviewing     = false;
    this.showPreviewModal = true;

    console.log('👁️ Modale ouverte — catégorie:', categorie, '| URL:', blobUrl);
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.previewSafeUrl   = null;
    this.previewTitle     = '';
    this.previewRapportCourant = null;
  }

  downloadFromPreview(): void {
    if (this.previewRapportCourant) {
      this.telechargerRapport(this.previewRapportCourant);
    }
  }

  // ─── Téléchargement ───────────────────────────────────────────────────────

  telechargerRapport(rapport: RapportPTF): void {
    if (!rapport.id || !this.partenairePTFId) {
      this.snackBar.open('Impossible de télécharger ce rapport', 'Fermer', { duration: 3000 });
      return;
    }

    const urlRelative = (rapport as any).url       as string | undefined;
    const mimeType    = (rapport as any).typeFichier as string | undefined;
    const nomFichier  = rapport.titre + this.extensionFichier(urlRelative, mimeType);

    this.isDownloading = true;

    this.rapportService.marquerCommeConsulte(rapport.id, this.partenairePTFId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.refreshStats() });

    this.rapportService.telechargerRapport(rapport.id, urlRelative)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.declencharTelechargement(blob, nomFichier);
          this.isDownloading = false;
          this.snackBar.open('Rapport téléchargé avec succès', 'Fermer', { duration: 3000 });
        },
        error: (err: Error) => {
          this.isDownloading = false;
          console.error('❌ Erreur téléchargement:', err.message);
          if (urlRelative) {
            window.open(this.buildFileUrl(urlRelative), '_blank');
          } else {
            this.snackBar.open('Erreur lors du téléchargement', 'Fermer', { duration: 3000 });
          }
        }
      });
  }

  private declencharTelechargement(blob: Blob, nomFichier: string, _mime?: string): void {
    const blobUrl = window.URL.createObjectURL(blob);
    const link    = document.createElement('a');
    link.href     = blobUrl;
    link.download = nomFichier;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }

  // ─── Filtres & pagination ─────────────────────────────────────────────────

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize    = event.pageSize;
    this.loadRapportsEtStats();
  }

  onSearch(): void { this.currentPage = 0; this.loadRapportsEtStats(); }

  clearFilters(): void {
    this.searchQuery = ''; this.selectedType = ''; this.selectedPeriode = '';
    this.currentPage = 0; this.loadRapportsEtStats();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedType || this.selectedPeriode);
  }

  // ─── Utilitaires privés ───────────────────────────────────────────────────

  private buildFileUrl(relativeUrl: string): string {
    if (!relativeUrl)                   return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    const base = this.serverUrl.replace(/\/$/, '');
    const p    = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    return `${base}${p}`;
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteString  = atob(base64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array  = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([uint8Array], { type: mimeType });
  }

  private extensionFichier(url?: string, mime?: string): string {
    if (url) {
      const ext = url.split('.').pop()?.toLowerCase();
      if (ext) return `.${ext}`;
    }
    const mimeMap: Record<string, string> = {
      'application/pdf':                                                           '.pdf',
      'image/jpeg':                                                                '.jpg',
      'image/png':                                                                 '.png',
      'image/gif':                                                                 '.gif',
      'image/webp':                                                                '.webp',
      'application/msword':                                                        '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':  '.docx',
      'application/vnd.oasis.opendocument.text':                                  '.odt',
    };
    return mime ? (mimeMap[mime] ?? '') : '';
  }

  private mimeParCategorie(cat: FileCategory): string {
    switch (cat) {
      case 'pdf':   return 'application/pdf';
      case 'image': return 'image/jpeg';
      default:      return 'application/octet-stream';
    }
  }

  // ─── Utilitaires template ─────────────────────────────────────────────────

  /**
   * Icône Material selon la catégorie du fichier (pour la colonne Actions)
   */
  getPreviewIcon(rapport: RapportPTF): string {
    const url      = (rapport as any).url       as string | undefined;
    const mimeType = (rapport as any).typeFichier as string | undefined;
    const cat      = this.detecterCategorie(url, mimeType);
    switch (cat) {
      case 'pdf':   return 'picture_as_pdf';
      case 'image': return 'image';
      case 'office': return 'description';
      default:       return 'insert_drive_file';
    }
  }

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

  getPeriodeLabel(rapport: RapportPTF): string {
    return rapport.metadata?.periode || '—';
  }
}