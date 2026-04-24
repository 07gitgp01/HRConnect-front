// src/app/features/admin/rap-pnvb-struct/rapport-detail-admin/rapport-detail-admin.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; // ✅ IMPORT AJOUTÉ

import { PnvbAdminService, RapportAdmin } from '../../../services/rap-pnvb/pnvb-admin.service';
import { Partenaire } from '../../../models/partenaire.model';
import { UploadService } from '../../../services/upload.service';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-rapport-admin-detail',
  templateUrl: './rapport-detail-admin.component.html',
  styleUrls: ['./rapport-detail-admin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  providers: [DatePipe]
})
export class RapportAdminDetailComponent implements OnInit, OnDestroy {

  rapport: RapportAdmin | null = null;
  partenaire: Partenaire | null = null;
  missionNom = '';

  isLoading = true;
  isProcessing = false;
  isDownloading = false;
  error = '';

  moyenneCriteres = 0;
  evaluationLabel = '';

  showFeedbackModal = false;
  feedbackText = '';
  feedbackAction: 'valider' | 'rejeter' | null = null;

  feedbackForm!: FormGroup;

  // ✅ AJOUTER CES PROPRIÉTÉS POUR LA MODAL PDF
  showDocumentPreview = false;
  documentUrl: SafeResourceUrl | null = null;

  private destroy$ = new Subject<void>();
  private apiUrl = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: PnvbAdminService,
    private http: HttpClient,
    private fb: FormBuilder,
    public uploadService: UploadService,
    private sanitizer: DomSanitizer  // ✅ AJOUTER DomSanitizer
  ) {}

  ngOnInit(): void {
    this.feedbackForm = this.fb.group({
      feedback: ['', Validators.maxLength(2000)],
      action: ['valider']
    });
    this.loadRapport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRapport(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID du rapport non spécifié';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = '';

    forkJoin({
      rapport: this.adminService.getRapportAdmin(id),
      partenaires: this.http.get<Partenaire[]>(`${this.apiUrl}/partenaires`)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ rapport, partenaires }) => {
          this.rapport = rapport;

          if (rapport.partenaireId) {
            this.partenaire = partenaires.find(
              p => String(p.id) === String(rapport.partenaireId)
            ) ?? null;
          }

          this.missionNom = (rapport as any).missionNom
            ?? rapport.missionVolontaire
            ?? '';

          this.calculateMetrics();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur chargement:', err);
          this.error = 'Impossible de charger le rapport.';
          this.isLoading = false;
        }
      });
  }

  calculateMetrics(): void {
    if (!this.rapport) return;

    if (this.rapport.criteres) {
      const vals = Object.values(this.rapport.criteres).filter(
        (v): v is number => typeof v === 'number'
      );
      this.moyenneCriteres = vals.length > 0
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : 0;
    }

    const s = this.rapport.evaluationGlobale ?? 0;
    if (s >= 9) this.evaluationLabel = 'Excellent';
    else if (s >= 8) this.evaluationLabel = 'Très bon';
    else if (s >= 7) this.evaluationLabel = 'Bon';
    else if (s >= 6) this.evaluationLabel = 'Satisfaisant';
    else if (s >= 5) this.evaluationLabel = 'Moyen';
    else this.evaluationLabel = 'Insuffisant';
  }

  /**
   * 📄 Obtenir le nom du document pour l'affichage
   */
  getDocumentNom(): string {
    if (!this.rapport) return 'Document';
    
    const nomStocke = (this.rapport as any).nomDocumentAnnexe;
    if (nomStocke) return nomStocke;
    
    if (this.rapport.urlDocumentAnnexe) {
      const filename = this.uploadService.extractFilename(this.rapport.urlDocumentAnnexe);
      return this.cleanFilename(filename);
    }
    
    return 'Document';
  }

  /**
   * 🧹 Nettoyer le nom du fichier pour l'affichage
   */
  private cleanFilename(filename: string): string {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\./i;
    if (uuidPattern.test(filename)) {
      const extension = filename.split('.').pop();
      return `document_annexe.${extension}`;
    }
    return filename;
  }

  /**
   * 🔗 Obtenir l'URL complète du document
   */
  getDocumentUrl(): string {
    if (!this.rapport?.urlDocumentAnnexe) return '#';
    return this.uploadService.getFullUrl(this.rapport.urlDocumentAnnexe);
  }

  /**
   * 📥 Télécharger le document
   */
  downloadDocument(): void {
    if (!this.rapport?.urlDocumentAnnexe) return;

    this.isDownloading = true;
    const fileUrl = this.rapport.urlDocumentAnnexe;
    const displayName = this.getDocumentNom();

    this.uploadService.downloadFile(fileUrl, displayName).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = displayName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.isDownloading = false;
      },
      error: (error) => {
        console.error('Erreur téléchargement:', error);
        alert('Impossible de télécharger le fichier. Veuillez réessayer.');
        this.isDownloading = false;
      }
    });
  }

  /**
   * 👁️ Aperçu du document - PDF dans modal, autres dans nouvel onglet
   */
  previewDocument(): void {
    const url = this.getDocumentUrl();
    if (url && url !== '#') {
      if (url.toLowerCase().endsWith('.pdf')) {
        this.documentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.showDocumentPreview = true;
      } else {
        window.open(url, '_blank');
      }
    } else {
      alert('Document non disponible');
    }
  }

  /**
   * ❌ Fermer la modal de prévisualisation
   */
  closePreview(): void {
    this.showDocumentPreview = false;
    this.documentUrl = null;
  }

  ouvrirModalValider(): void {
    this.feedbackAction = 'valider';
    this.feedbackText = '';
    this.feedbackForm.reset({ feedback: '', action: 'valider' });
    this.showFeedbackModal = true;
  }

  ouvrirModalRejeter(): void {
    this.feedbackAction = 'rejeter';
    this.feedbackText = '';
    this.feedbackForm.reset({ feedback: '', action: 'rejeter' });
    this.feedbackForm.get('feedback')?.setValidators([Validators.required]);
    this.feedbackForm.get('feedback')?.updateValueAndValidity();
    this.showFeedbackModal = true;
  }

  fermerModal(): void {
    this.showFeedbackModal = false;
    this.feedbackText = '';
    this.feedbackAction = null;
    this.feedbackForm.reset();
  }

  confirmerAction(): void {
    if (!this.rapport?.id) return;
    if (this.feedbackAction === 'rejeter' && !this.feedbackText.trim()) return;

    this.isProcessing = true;

    const action$ = this.feedbackAction === 'valider'
      ? this.adminService.validerRapport(this.rapport.id, this.feedbackText || undefined)
      : this.adminService.rejeterRapport(this.rapport.id, this.feedbackText);

    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.fermerModal();
        this.isProcessing = false;
        this.loadRapport();
      },
      error: (err) => {
        console.error('Erreur action:', err);
        this.isProcessing = false;
        alert('Une erreur est survenue. Veuillez réessayer.');
      }
    });
  }

  marquerLu(): void {
    if (!this.rapport?.id || this.rapport.statut !== 'Soumis') return;
    this.isProcessing = true;

    this.adminService.marquerCommeLu(this.rapport.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isProcessing = false;
          this.loadRapport();
        },
        error: () => {
          this.isProcessing = false;
        }
      });
  }

  getCriteresList(): any[] {
    const c = (this.rapport as any)?.criteres;
    if (!c) return [];
    return [
      { label: 'Intégration', description: "Capacité à s'intégrer dans l'équipe", score: c.integration ?? 0 },
      { label: 'Compétences', description: 'Maîtrise des compétences requises', score: c.competences ?? 0 },
      { label: 'Initiative', description: "Prise d'initiative et autonomie", score: c.initiative ?? 0 },
      { label: 'Collaboration', description: 'Travail en équipe et communication', score: c.collaboration ?? 0 },
      { label: 'Respect des engagements', description: 'Ponctualité et respect des délais', score: c.respectEngagement ?? 0 }
    ].map(item => ({ ...item, stars: this.getStarIcons(item.score) }));
  }

  getStarIcons(score: number, max = 5): string[] {
    const full = Math.floor(score);
    const half = score % 1 >= 0.5;
    const empty = max - full - (half ? 1 : 0);
    return [
      ...Array(full).fill('bi-star-fill'),
      ...(half ? ['bi-star-half'] : []),
      ...Array(Math.max(0, empty)).fill('bi-star')
    ];
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      'Validé': 'rda-statut-validé',
      'Soumis': 'rda-statut-soumis',
      'Brouillon': 'rda-statut-brouillon',
      'Rejeté': 'rda-statut-rejeté',
      'Lu par PNVB': 'rda-statut-lu',
      'En attente': 'rda-statut-attente'
    };
    return map[statut] || 'rda-statut-brouillon';
  }

  getStatutIcon(statut: string): string {
    const map: Record<string, string> = {
      'Validé': 'check-circle',
      'Soumis': 'send',
      'Brouillon': 'pencil',
      'Rejeté': 'x-circle',
      'Lu par PNVB': 'eye',
      'En attente': 'clock'
    };
    return map[statut] || 'file-text';
  }

  getEvaluationColor(score: number): string {
    if (score >= 8) return 'rda-eval-excellent';
    if (score >= 6) return 'rda-eval-bon';
    if (score >= 4) return 'rda-eval-moyen';
    return 'rda-eval-faible';
  }

  getEvaluationBadgeClass(score: number): string {
    if (score >= 8) return 'rda-badge-success';
    if (score >= 6) return 'rda-badge-warning';
    return 'rda-badge-danger';
  }

  getProgressClass(score: number): string {
    if (score >= 4.5) return 'excellent';
    if (score >= 4) return 'good';
    if (score >= 3) return 'average';
    if (score >= 2) return 'poor';
    return 'weak';
  }

  canValider(): boolean {
    return ['Soumis', 'Lu par PNVB'].includes(this.rapport?.statut ?? '');
  }

  canRejeter(): boolean {
    return ['Soumis', 'Lu par PNVB'].includes(this.rapport?.statut ?? '');
  }

  goBack(): void {
    this.router.navigate(['/features/admin/rap-struct/']);
  }
}