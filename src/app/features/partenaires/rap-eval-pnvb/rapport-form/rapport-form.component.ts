import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RapportService } from '../../../services/rap-eval/rapport.service';
import { Volontaire } from '../../../models/volontaire.model';
import { NouveauRapport, RapportEvaluation } from '../../../models/rapport-evaluation.model';

@Component({
  selector: 'app-rapport-form',
  templateUrl: './rapport-form.component.html',
  styleUrls: ['./rapport-form.component.css']
})
export class RapportFormComponent implements OnInit {
  rapportForm: FormGroup;
  isEditMode = false;
  rapportId: string | null = null;
  isLoading = false;
  isSubmitting = false;
  
  volontaires: Volontaire[] = [];
  periodes: string[] = [];
  criteres: any[] = [];
  
  selectedFile: File | null = null;
  uploadProgress = 0;
  isUploading = false;
  
  // État du formulaire
  formSubmitted = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private rapportService: RapportService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.rapportForm = this.createForm();
  }

  ngOnInit(): void {
    this.periodes = this.rapportService.getPeriodesDisponibles();
    this.criteres = this.rapportService.getCriteresEvaluation();
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.rapportId = params['id'];
        // Vérifier que rapportId n'est pas null avant de l'utiliser
        if (this.rapportId) {
          this.loadRapport(this.rapportId);
        }
      } else {
        this.loadVolontaires();
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      volontaireId: ['', Validators.required],
      periode: ['', Validators.required],
      evaluationGlobale: [0, [
        Validators.required,
        Validators.min(0),
        Validators.max(10)
      ]],
      criteres: this.fb.group({
        integration: [0, [Validators.min(0), Validators.max(5)]],
        competences: [0, [Validators.min(0), Validators.max(5)]],
        initiative: [0, [Validators.min(0), Validators.max(5)]],
        collaboration: [0, [Validators.min(0), Validators.max(5)]],
        respectEngagement: [0, [Validators.min(0), Validators.max(5)]]
      }),
      commentaires: ['', [
        Validators.required,
        Validators.minLength(50),
        Validators.maxLength(5000)
      ]],
      urlDocumentAnnexe: [''],
      statut: ['Brouillon']
    });
  }

  loadVolontaires(): void {
    const partenaireId = this.getPartenaireId();
    this.isLoading = true;
    
    this.rapportService.getVolontairesAEvaluer(partenaireId).subscribe({
      next: (data: Volontaire[]) => {
        this.volontaires = data;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erreur:', error);
        this.isLoading = false;
      }
    });
  }

  loadRapport(id: string): void {
    this.isLoading = true;
    
    this.rapportService.getRapport(id).subscribe({
      next: (rapport: RapportEvaluation) => {
        this.rapportForm.patchValue({
          volontaireId: rapport.volontaireId,
          periode: rapport.periode,
          evaluationGlobale: rapport.evaluationGlobale,
          criteres: rapport.criteres || {
            integration: 0,
            competences: 0,
            initiative: 0,
            collaboration: 0,
            respectEngagement: 0
          },
          commentaires: rapport.commentaires,
          urlDocumentAnnexe: rapport.urlDocumentAnnexe,
          statut: rapport.statut
        });
        
        // En mode édition, charger aussi les volontaires
        this.loadVolontaires();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erreur:', error);
        this.router.navigate(['/rapports']);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Vérifier la taille du fichier (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Le fichier ne doit pas dépasser 5MB';
        return;
      }
      
      // Vérifier l'extension
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        this.errorMessage = 'Format de fichier non supporté. Utilisez PDF, DOC, JPG ou PNG';
        return;
      }
      
      this.selectedFile = file;
      this.uploadFile();
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) return;
    
    this.isUploading = true;
    this.uploadProgress = 0;
    
    // Simuler une progression d'upload
    const interval = setInterval(() => {
      this.uploadProgress += 10;
      if (this.uploadProgress >= 100) {
        clearInterval(interval);
        this.isUploading = false;
        
        // Simuler une URL d'upload
        const fakeUrl = `/uploads/rapport_${Date.now()}_${this.selectedFile?.name}`;
        this.rapportForm.patchValue({
          urlDocumentAnnexe: fakeUrl
        });
        
        this.successMessage = 'Fichier uploadé avec succès';
      }
    }, 200);
  }

  onCriteresChange(): void {
    const criteres = this.rapportForm.get('criteres')?.value;
    if (criteres) {
      const valeurs = Object.values(criteres) as number[];
      const moyenne = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
      
      // Mettre à jour l'évaluation globale basée sur la moyenne des critères
      this.rapportForm.patchValue({
        evaluationGlobale: Math.round(moyenne * 2) // Convertir 0-5 en 0-10
      });
    }
  }

  onSubmit(): void {
    this.formSubmitted = true;
    
    if (this.rapportForm.invalid) {
      this.markFormGroupTouched(this.rapportForm);
      return;
    }
    
    this.isSubmitting = true;
    const formData = this.rapportForm.value as NouveauRapport;
    
    if (this.isEditMode && this.rapportId) {
      // Mode édition
      this.rapportService.updateRapport(this.rapportId, formData).subscribe({
        next: (rapport: RapportEvaluation) => {
          this.handleSuccess('Rapport mis à jour avec succès');
        },
        error: (error: any) => {
          this.handleError('Erreur lors de la mise à jour du rapport', error);
        }
      });
    } else {
      // Mode création
      this.rapportService.createRapport(formData).subscribe({
        next: (rapport: RapportEvaluation) => {
          this.handleSuccess('Rapport créé avec succès');
        },
        error: (error: any) => {
          this.handleError('Erreur lors de la création du rapport', error);
        }
      });
    }
  }

  onSoumettre(): void {
    if (confirm('Souhaitez-vous soumettre ce rapport ? Cette action est définitive.')) {
      this.rapportForm.patchValue({ statut: 'Soumis' });
      this.onSubmit();
    }
  }

  onSauvegarderBrouillon(): void {
    this.rapportForm.patchValue({ statut: 'Brouillon' });
    this.onSubmit();
  }

  private handleSuccess(message: string): void {
    this.successMessage = message;
    this.isSubmitting = false;
    
    // Redirection après 2 secondes
    setTimeout(() => {
      this.router.navigate(['/rapports']);
    }, 2000);
  }

  private handleError(message: string, error: any): void {
    this.errorMessage = message;
    this.isSubmitting = false;
    console.error(error);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private getPartenaireId(): number {
    // À remplacer par l'ID réel du partenaire connecté
    return 201;
  }

  // Utilitaires d'affichage
  getVolontaireNom(id: number | string): string {
    const volontaire = this.volontaires.find(v => v.id?.toString() === id.toString());
    return volontaire ? `${volontaire.prenom} ${volontaire.nom}` : '';
  }

  getStarIcons(score: number): string[] {
    const fullStars = Math.floor(score);
    const halfStar = score % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return [
      ...Array(fullStars).fill('bi-star-fill'),
      ...(halfStar ? ['bi-star-half'] : []),
      ...Array(emptyStars).fill('bi-star')
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

  // Navigation
  cancel(): void {
    if (confirm('Les modifications non enregistrées seront perdues. Continuer ?')) {
      this.router.navigate(['/features/partenaires/rapports']);
    }
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
  switch(statut) {
    case 'Brouillon': return 'alert-secondary';
    case 'Soumis': return 'alert-primary';
    case 'Validé': return 'alert-success';
    case 'Rejeté': return 'alert-danger';
    case 'Lu par PNVB': return 'alert-info';
    default: return 'alert-light';
  }
}

getStatutIcon(statut: string): string {
  switch(statut) {
    case 'Brouillon': return 'bi-pencil';
    case 'Soumis': return 'bi-send';
    case 'Validé': return 'bi-check-circle';
    case 'Rejeté': return 'bi-x-circle';
    case 'Lu par PNVB': return 'bi-eye';
    default: return 'bi-file-text';
  }
}
// Ajoutez cette méthode dans votre RapportFormComponent
getFileSize(size: number | undefined): string {
  if (!size) return '0';
  const sizeInMB = size / 1024 / 1024;
  return sizeInMB.toFixed(1); // Format à 1 décimale
}

}