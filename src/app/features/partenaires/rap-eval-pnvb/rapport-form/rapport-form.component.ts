// src/app/features/partenaires/components/rapport-form/rapport-form.component.ts
import { Component, OnInit }          from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router }     from '@angular/router';
import { forkJoin, of }               from 'rxjs';
import { catchError, finalize }       from 'rxjs/operators';
import { RapportService }             from '../../../services/rap-eval/rapport.service';
import { UploadService }              from '../../../services/upload.service';
import { NouveauRapport, RapportEvaluation } from '../../../models/rapport-evaluation.model';

@Component({
  selector:    'app-rapport-form',
  templateUrl: './rapport-form.component.html',
  styleUrls:   ['./rapport-form.component.css']
})
export class RapportFormComponent implements OnInit {
  rapportForm:      FormGroup;
  isEditMode        = false;
  rapportId:        string | null = null;
  isLoading         = false;
  isSubmitting      = false;
  isLoadingProjets  = false;

  projets:  any[]    = [];
  periodes: string[] = [];
  criteres: any[]    = [];

  selectedFile:   File | null = null;
  uploadProgress  = 0;
  isUploading     = false;
  uploadedFileUrl: string | null = null;

  formSubmitted  = false;
  successMessage = '';
  errorMessage   = '';

  constructor(
    private fb:             FormBuilder,
    private rapportService: RapportService,
    private uploadService:  UploadService,
    private route:          ActivatedRoute,
    private router:         Router
  ) {
    this.rapportForm = this.createForm();
  }

  ngOnInit(): void {
    this.periodes = this.rapportService.getPeriodesDisponibles();
    this.criteres = this.rapportService.getCriteresEvaluation();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.rapportId  = params['id'];
        this.loadRapportForEdit(this.rapportId!);
      } else {
        this.loadProjets();
      }
    });
  }

  // ─── Formulaire ───────────────────────────────────────────────────────────

  createForm(): FormGroup {
    return this.fb.group({
      projetId:          ['', Validators.required],
      periode:           ['', Validators.required],
      evaluationGlobale: [5, [Validators.required, Validators.min(0), Validators.max(10)]],
      criteres: this.fb.group({
        integration:       [0, [Validators.min(0), Validators.max(5)]],
        competences:       [0, [Validators.min(0), Validators.max(5)]],
        initiative:        [0, [Validators.min(0), Validators.max(5)]],
        collaboration:     [0, [Validators.min(0), Validators.max(5)]],
        respectEngagement: [0, [Validators.min(0), Validators.max(5)]]
      }),
      commentaires:      ['', [Validators.required, Validators.minLength(50), Validators.maxLength(5000)]],
      urlDocumentAnnexe: [''],
      statut:            ['Brouillon']
    });
  }

  // ─── Chargement des projets clôturés ──────────────────────────────────────

  loadProjets(): void {
    const partenaireId = this.rapportService.getPartenaireIdFromStorage();
    if (!partenaireId) {
      this.errorMessage = 'Impossible d\'identifier le partenaire connecté.';
      return;
    }

    this.isLoadingProjets = true;

    this.rapportService.getProjetsEligibles(partenaireId).subscribe({
      next: (projets) => {
        this.projets = projets;

        if (projets.length === 0) {
          this.errorMessage =
            'Aucune mission clôturée disponible. Un rapport ne peut être soumis que pour une mission terminée.';
        }

        if (projets.length === 1) {
          this.rapportForm.patchValue({ projetId: projets[0].id });
        }

        this.isLoadingProjets = false;
      },
      error: (err) => {
        console.error('Erreur chargement projets:', err);
        this.errorMessage     = 'Erreur lors du chargement des missions.';
        this.isLoadingProjets = false;
      }
    });
  }

  // ─── Mode édition ─────────────────────────────────────────────────────────

  loadRapportForEdit(id: string): void {
    this.isLoading = true;
    const partenaireId = this.rapportService.getPartenaireIdFromStorage();

    forkJoin({
      rapport: this.rapportService.getRapport(id),
      projets: this.rapportService.getProjetsEligibles(partenaireId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ rapport, projets }) => {
        const r = rapport as any;
        this.projets = projets;

        if (r.urlDocumentAnnexe) {
          this.uploadedFileUrl = r.urlDocumentAnnexe;
        }

        this.rapportForm.patchValue({
          projetId:          r.projetId ?? '',
          periode:           rapport.periode,
          evaluationGlobale: rapport.evaluationGlobale,
          criteres: rapport.criteres ?? {
            integration: 0, competences: 0, initiative: 0,
            collaboration: 0, respectEngagement: 0
          },
          commentaires:      rapport.commentaires,
          urlDocumentAnnexe: r.urlDocumentAnnexe ?? '',
          statut:            rapport.statut
        });

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement rapport édition:', err);
        this.router.navigate(['/features/partenaires/rapports']);
      }
    });
  }

  // ─── Nom de la mission sélectionnée ───────────────────────────────────────

  getMissionSelectionnee(): string {
    const projetId = this.rapportForm.get('projetId')?.value;
    const projet   = this.projets.find(
      (p: any) => String(p.id) === String(projetId)
    );
    return projet ? (projet.titre ?? projet.title ?? '') : '';
  }

  // ─── Calcul auto de l'évaluation globale ─────────────────────────────────

  onCriteresChange(): void {
    const criteres = this.rapportForm.get('criteres')?.value;
    if (criteres) {
      const valeurs  = Object.values(criteres) as number[];
      const moyenne  = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
      this.rapportForm.patchValue({ evaluationGlobale: Math.round(moyenne * 2) });
    }
  }

  // ─── Upload fichier VERS LE BACKEND SPRING BOOT ───────────────────────────

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Validation taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Le fichier ne doit pas dépasser 5 MB';
      event.target.value = '';
      return;
    }

    // Validation extension
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.odt'];
    const ext     = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowed.includes(ext)) {
      this.errorMessage = 'Format non supporté. Utilisez PDF, DOC, DOCX, JPG, PNG ou ODT';
      event.target.value = '';
      return;
    }

    this.selectedFile = file;
    this.uploadFileToBackend();
  }

  /**
   * ✅ Upload du fichier vers le backend Spring Boot
   */
  uploadFileToBackend(): void {
    if (!this.selectedFile) return;
    
    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';
    
    this.uploadService.uploadFile(this.selectedFile).subscribe({
      next: (event) => {
        if (event.type === 'progress') {
          this.uploadProgress = event.progress;
          console.log(`📊 Progression upload: ${event.progress}%`);
        } else if (event.type === 'complete') {
          // ✅ Récupérer l'URL retournée par le backend
          this.uploadedFileUrl = event.data.url;
          this.rapportForm.patchValue({ urlDocumentAnnexe: this.uploadedFileUrl });
          
          this.isUploading = false;
          this.successMessage = `Fichier "${this.selectedFile?.name}" uploadé avec succès`;
          this.selectedFile = null;
          
          // Reset file input
          const fileInput = document.getElementById('fileInput') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          
          console.log('✅ Fichier uploadé:', this.uploadedFileUrl);
        }
      },
      error: (error) => {
        console.error('❌ Erreur upload:', error);
        this.errorMessage = 'Erreur lors de l\'upload du fichier. Veuillez réessayer.';
        this.isUploading = false;
        this.uploadProgress = 0;
      }
    });
  }

  /**
   * ✅ Supprimer le fichier attaché
   */
  removeFile(): void {
    this.uploadedFileUrl = null;
    this.rapportForm.patchValue({ urlDocumentAnnexe: '' });
    this.successMessage = 'Fichier supprimé';
  }

  // ─── Soumission ───────────────────────────────────────────────────────────

  onSubmit(): void {
    this.formSubmitted = true;

    if (this.rapportForm.invalid) {
      this.markFormGroupTouched(this.rapportForm);
      return;
    }

    this.isSubmitting = true;
    const formData = { ...this.rapportForm.value } as any;

    // Dénormaliser le nom de la mission
    formData.missionNom = this.getMissionSelectionnee();

    // Ajouter le partenaireId
    formData.partenaireId = this.rapportService.getPartenaireIdFromStorage();

    // Ajouter l'URL du fichier si uploadé
    if (this.uploadedFileUrl) {
      formData.urlDocumentAnnexe = this.uploadedFileUrl;
    }

    if (this.isEditMode && this.rapportId) {
      this.rapportService.updateRapport(this.rapportId, formData).subscribe({
        next:  () => this.handleSuccess('Rapport mis à jour avec succès'),
        error: (err: any) => this.handleError('Erreur lors de la mise à jour', err)
      });
    } else {
      // ✅ Utiliser createRapport (sans fichier car déjà uploadé)
      this.rapportService.createRapport(formData as NouveauRapport).subscribe({
        next:  () => this.handleSuccess('Rapport créé avec succès'),
        error: (err: any) => this.handleError('Erreur lors de la création', err)
      });
    }
  }

  onSoumettre(): void {
    if (confirm('Soumettre ce rapport ? Cette action est définitive.')) {
      this.rapportForm.patchValue({ statut: 'Soumis' });
      this.onSubmit();
    }
  }

  onSauvegarderBrouillon(): void {
    this.rapportForm.patchValue({ statut: 'Brouillon' });
    this.onSubmit();
  }

  // ─── Privés ───────────────────────────────────────────────────────────────

  private handleSuccess(message: string): void {
    this.successMessage = message;
    this.isSubmitting   = false;
    setTimeout(() => this.router.navigate(['/features/partenaires/rapports']), 2000);
  }

  private handleError(message: string, error: any): void {
    this.errorMessage = message;
    this.isSubmitting = false;
    console.error(error);
    setTimeout(() => { this.errorMessage = ''; }, 5000);
  }

  private markFormGroupTouched(fg: FormGroup): void {
    Object.values(fg.controls).forEach(c => {
      c.markAsTouched();
      if (c instanceof FormGroup) this.markFormGroupTouched(c);
    });
  }

  // ─── Affichage ───────────────────────────────────────────────────────────

  getStarIcons(score: number): string[] {
    const full  = Math.floor(score);
    const half  = score % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return [
      ...Array(full).fill('bi-star-fill'),
      ...(half ? ['bi-star-half'] : []),
      ...Array(Math.max(0, empty)).fill('bi-star')
    ];
  }

  getEvaluationLabel(score: number): string {
    if (score >= 9) return 'Excellent';
    if (score >= 8) return 'Très bon';
    if (score >= 7) return 'Bon';
    if (score >= 6) return 'Satisfaisant';
    if (score >= 5) return 'Moyen';
    return 'Insuffisant';
  }

  getEvaluationBadgeClass(score: number): string {
    if (score >= 8) return 'bg-success';
    if (score >= 6) return 'bg-warning';
    return 'bg-danger';
  }

  getEvaluationTextClass(score: number): string {
    if (score >= 8) return 'text-success';
    if (score >= 6) return 'text-warning';
    return 'text-danger';
  }

  getStatutAlertClass(statut: string): string {
    const map: Record<string, string> = {
      'Brouillon':   'alert-secondary',
      'Soumis':      'alert-primary',
      'Validé':      'alert-success',
      'Rejeté':      'alert-danger',
      'Lu par PNVB': 'alert-info'
    };
    return map[statut] || 'alert-light';
  }

  getStatutIcon(statut: string): string {
    const map: Record<string, string> = {
      'Brouillon':   'bi-pencil',
      'Soumis':      'bi-send',
      'Validé':      'bi-check-circle',
      'Rejeté':      'bi-x-circle',
      'Lu par PNVB': 'bi-eye'
    };
    return map[statut] || 'bi-file-text';
  }

  getFileSize(size: number | undefined): string {
    if (!size) return '0';
    return (size / 1024 / 1024).toFixed(1);
  }

  cancel(): void {
    if (confirm('Les modifications non enregistrées seront perdues. Continuer ?')) {
      this.router.navigate(['/features/partenaires/rapports']);
    }
  }
}