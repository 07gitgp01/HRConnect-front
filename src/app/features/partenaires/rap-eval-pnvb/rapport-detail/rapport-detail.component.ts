// src/app/features/partenaires/rap-eval-pnvb/rapport-detail/rapport-detail.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { Subject, forkJoin, takeUntil, of } from 'rxjs';
import { catchError }                   from 'rxjs/operators';
import { RapportService }               from '../../../services/rap-eval/rapport.service';
import { RapportEvaluation }            from '../../../models/rapport-evaluation.model';
import { Partenaire }                   from '../../../models/partenaire.model';
import { HttpClient }                   from '@angular/common/http';
import { UploadService }                from '../../../services/upload.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment }                  from '../../../environment/environment'; // ✅ IMPORT AJOUTÉ

@Component({
  selector:    'app-rapport-detail',
  templateUrl: './rapport-detail.component.html',
  styleUrls:   ['./rapport-detail.component.scss']
})
export class RapportDetailComponent implements OnInit, OnDestroy {
  rapport:    RapportEvaluation | null = null;
  partenaire: Partenaire | null        = null;
  missionNom  = '';

  isLoading = true;
  error     = '';
  isDownloading = false;
  documentUrl: SafeResourceUrl | null = null;
  showDocumentPreview = false;

  moyenneCriteres = 0;
  evaluationLabel = '';

  private destroy$ = new Subject<void>();
  private apiUrl   = environment.apiUrl; // ✅ CORRIGÉ : plus d'URL en dur

  constructor(
    private route:          ActivatedRoute,
    private router:         Router,
    private rapportService: RapportService,
    private http:           HttpClient,
    public uploadService:   UploadService,
    private sanitizer:      DomSanitizer
  ) {}

  ngOnInit(): void  { 
    console.log('📡 API URL utilisée:', this.apiUrl); // Vérification
    this.loadRapport(); 
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRapport(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error     = 'ID du rapport non spécifié';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error     = '';

    forkJoin({
      rapport:    this.rapportService.getRapport(id),
      partenaires: this.http.get<any[]>(`${this.apiUrl}/partenaires`).pipe(catchError(() => of([]))),
      projets:    this.http.get<any[]>(`${this.apiUrl}/projets`).pipe(catchError(() => of([])))
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ rapport, partenaires, projets }) => {
        this.rapport = rapport;
        const r      = rapport as any;

        // Partenaire
        if (r.partenaire) {
          this.partenaire = r.partenaire;
        } else if (r.partenaireId != null) {
          const found = partenaires.find((p: any) => String(p.id) === String(r.partenaireId));
          if (found) {
            this.partenaire = {
              ...found,
              nomStructure: found.nomStructure || found.nom || `Partenaire #${r.partenaireId}`
            } as Partenaire;
          }
        }

        // Mission
        if (r.missionNom) {
          this.missionNom = r.missionNom;
        } else if (r.projetId != null) {
          const projet = projets.find((p: any) => String(p.id) === String(r.projetId));
          this.missionNom = projet?.titre ?? projet?.title ?? `Mission #${r.projetId}`;
        }

        this.calculateMetrics();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement rapport:', err);
        this.error     = 'Impossible de charger le rapport. Vérifiez que le serveur est démarré.';
        this.isLoading = false;
      }
    });
  }

  calculateMetrics(): void {
    if (!this.rapport) return;
    const r = this.rapport as any;

    if (r.criteres && typeof r.criteres === 'object') {
      const vals = Object.values(r.criteres) as number[];
      this.moyenneCriteres = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    const s = this.rapport.evaluationGlobale;
    if      (s >= 9) this.evaluationLabel = 'Excellent';
    else if (s >= 8) this.evaluationLabel = 'Très bon';
    else if (s >= 7) this.evaluationLabel = 'Bon';
    else if (s >= 6) this.evaluationLabel = 'Satisfaisant';
    else if (s >= 5) this.evaluationLabel = 'Moyen';
    else             this.evaluationLabel = 'Insuffisant';
  }

  getCriteresList(): any[] {
    if (!this.rapport) return [];
    const c = (this.rapport as any).criteres;
    if (!c) return [];

    return [
      { label: 'Intégration',             description: "Capacité à s'intégrer dans l'équipe",   score: c.integration       ?? 0 },
      { label: 'Compétences',             description: 'Maîtrise des compétences requises',       score: c.competences       ?? 0 },
      { label: 'Initiative',              description: "Prise d'initiative et autonomie",          score: c.initiative        ?? 0 },
      { label: 'Collaboration',           description: 'Travail en équipe et communication',       score: c.collaboration     ?? 0 },
      { label: 'Respect des engagements', description: 'Ponctualité et respect des délais',        score: c.respectEngagement ?? 0 }
    ].map(item => ({ ...item, stars: this.getStarIcons(item.score) }));
  }

  getDocumentNom(): string {
    if (!this.rapport) return 'Document';
    
    const nomStocke = (this.rapport as any).nomDocumentAnnexe;
    if (nomStocke) return nomStocke;
    
    if (this.rapport.urlDocumentAnnexe) {
      return this.uploadService.extractFilename(this.rapport.urlDocumentAnnexe);
    }
    
    return 'Document';
  }

  getDocumentUrl(): string {
    if (!this.rapport?.urlDocumentAnnexe) return '#';
    
    const fullUrl = this.uploadService.getFullUrl(this.rapport.urlDocumentAnnexe);
    console.log('📄 URL document:', fullUrl);
    return fullUrl;
  }

  ouvrirDocument(): void {
    const url = this.getDocumentUrl();
    if (url && url !== '#') {
      window.open(url, '_blank');
    } else {
      alert('Document non disponible');
    }
  }

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

  closePreview(): void {
    this.showDocumentPreview = false;
    this.documentUrl = null;
  }

  downloadDocument(): void {
    if (!this.rapport?.urlDocumentAnnexe) {
      alert('Aucun document à télécharger');
      return;
    }
    
    this.isDownloading = true;
    const url = this.rapport.urlDocumentAnnexe;
    const displayName = this.getDocumentNom();
    
    this.uploadService.downloadFile(url, displayName).subscribe({
      next: (blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = displayName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        this.isDownloading = false;
      },
      error: (error) => {
        console.error('❌ Erreur téléchargement:', error);
        alert('Impossible de télécharger le fichier. Vérifiez que le document existe sur le serveur.');
        this.isDownloading = false;
      }
    });
  }

  verifierDocument(): void {
    if (!this.rapport?.urlDocumentAnnexe) return;
    
    this.uploadService.checkFileExists(this.rapport.urlDocumentAnnexe).subscribe({
      next: (exists) => {
        if (exists) {
          alert('✅ Document accessible sur le serveur');
        } else {
          alert('❌ Document introuvable sur le serveur');
        }
      },
      error: () => {
        alert('❌ Erreur lors de la vérification');
      }
    });
  }

  editRapport(): void {
    if (this.rapport?.id)
      this.router.navigate(['/features/partenaires/rapports', this.rapport.id, 'edit']);
  }

  soumettreRapport(): void {
    if (!this.rapport?.id) return;
    if (!confirm('Soumettre ce rapport ? Cette action est définitive.')) return;

    this.rapportService.soumettreRapport(this.rapport.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => this.loadRapport(),
        error: () => alert('Erreur lors de la soumission')
      });
  }

  deleteRapport(): void {
    if (!this.rapport?.id) return;
    if (!confirm('Supprimer ce rapport définitivement ?')) return;

    this.rapportService.deleteRapport(this.rapport.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => this.router.navigate(['/features/partenaires/rapports']),
        error: () => alert('Erreur lors de la suppression')
      });
  }

  goBack(): void {
    this.router.navigate(['/features/partenaires/rapports']);
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      'Validé':      'rd-statut-validé',
      'Soumis':      'rd-statut-soumis',
      'Brouillon':   'rd-statut-brouillon',
      'Rejeté':      'rd-statut-rejeté',
      'Lu par PNVB': 'rd-statut-lu',
      'En attente':  'rd-statut-attente'
    };
    return map[statut] || 'rd-statut-default';
  }

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
    if (score >= 8) return 'rd-eval-excellent';
    if (score >= 6) return 'rd-eval-bon';
    if (score >= 4) return 'rd-eval-moyen';
    return 'rd-eval-faible';
  }

  getEvaluationBadgeClass(score: number): string {
    if (score >= 8) return 'rd-badge-success';
    if (score >= 6) return 'rd-badge-warning';
    return 'rd-badge-danger';
  }

  getProgressBarClass(score: number): string {
    if (score >= 4.5) return 'excellent';
    if (score >= 4)   return 'good';
    if (score >= 3)   return 'average';
    if (score >= 2)   return 'poor';
    return 'weak';
  }

  getStarIcons(score: number, max = 5): string[] {
    const full  = Math.floor(score);
    const half  = score % 1 >= 0.5;
    const empty = max - full - (half ? 1 : 0);
    return [
      ...Array(full).fill('bi-star-fill'),
      ...(half ? ['bi-star-half'] : []),
      ...Array(Math.max(0, empty)).fill('bi-star')
    ];
  }
}