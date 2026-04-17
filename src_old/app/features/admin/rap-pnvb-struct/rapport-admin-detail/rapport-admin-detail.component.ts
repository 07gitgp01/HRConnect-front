import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PnvbAdminService, RapportAdmin } from '../../../services/rap-pnvb/pnvb-admin.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-rapport-admin-detail',
  templateUrl: './rapport-admin-detail.component.html',
  styleUrls: ['./rapport-admin-detail.component.css']
})
export class RapportAdminDetailComponent implements OnInit {
  rapport: RapportAdmin | null = null;
  isLoading = true;
  error = '';
  
  // Formulaire pour feedback PNVB
  feedbackForm: FormGroup;
  showFeedbackForm = false;
  isSubmitting = false;
  
  // Historique des modifications
  historique: any[] = [];
  showHistorique = false;
  
  // Données calculées
  moyenneCriteres = 0;
  evaluationLabel = '';
  
  // Alertes
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: PnvbAdminService,
    private fb: FormBuilder
  ) {
    this.feedbackForm = this.fb.group({
      commentaire: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      action: ['validation', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadRapport();
  }

  loadRapport(): void {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (!id) {
      this.error = 'ID du rapport non spécifié';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    console.log('🔍 Chargement du rapport', id);
    
    this.adminService.getRapportAdmin(id).subscribe({
      next: (data: RapportAdmin) => {
        console.log('✅ Rapport chargé:', data);
        this.rapport = data;
        this.calculateMetrics();
        this.loadHistorique(id);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement rapport:', error);
        this.error = 'Impossible de charger le rapport';
        this.isLoading = false;
      }
    });
  }

  loadHistorique(id: string): void {
    this.adminService.getHistorique(id).subscribe({
      next: (data) => {
        console.log('📜 Historique chargé:', data);
        this.historique = data;
      },
      error: (error) => {
        console.warn('⚠️ Erreur chargement historique:', error);
        this.historique = [];
      }
    });
  }

  calculateMetrics(): void {
    if (!this.rapport) return;
    
    // Calcul de la moyenne des critères avec typage explicite
    if (this.rapport.criteres && typeof this.rapport.criteres === 'object') {
      const valeurs: number[] = Object.values(this.rapport.criteres)
        .filter((v: unknown) => typeof v === 'number') as number[];
      
      if (valeurs.length > 0) {
        const somme = valeurs.reduce((a: number, b: number) => a + b, 0);
        this.moyenneCriteres = somme / valeurs.length;
      } else {
        this.moyenneCriteres = 0;
      }
    }
    
    // Label d'évaluation
    const score = this.rapport.evaluationGlobale;
    if (score >= 9) this.evaluationLabel = 'Excellent';
    else if (score >= 8) this.evaluationLabel = 'Très bon';
    else if (score >= 7) this.evaluationLabel = 'Bon';
    else if (score >= 6) this.evaluationLabel = 'Satisfaisant';
    else if (score >= 5) this.evaluationLabel = 'Moyen';
    else this.evaluationLabel = 'Insuffisant';
  }

  // Actions d'administration
  validerRapport(): void {
    if (!this.rapport?.id) return;
    
    const feedback = prompt('Ajoutez un feedback optionnel pour le partenaire :', 
                          this.rapport.feedbackPNVB || 'Rapport conforme aux attentes.');
    
    if (feedback !== null) {
      this.isSubmitting = true;
      console.log('✅ Validation du rapport', this.rapport.id);
      
      this.adminService.validerRapport(this.rapport.id, feedback).subscribe({
        next: (result) => {
          console.log('✅ Rapport validé:', result);
          this.successMessage = 'Rapport validé avec succès';
          this.isSubmitting = false;
          setTimeout(() => this.loadRapport(), 500);
        },
        error: (error) => {
          console.error('❌ Erreur validation:', error);
          this.errorMessage = 'Erreur lors de la validation';
          this.isSubmitting = false;
        }
      });
    }
  }

  rejeterRapport(): void {
    if (!this.rapport?.id) return;
    
    const raison = prompt('Veuillez indiquer la raison du rejet :', 
                         'Veuillez fournir plus de détails sur les points d\'amélioration.');
    
    if (raison && raison.trim()) {
      this.isSubmitting = true;
      console.log('❌ Rejet du rapport', this.rapport.id);
      
      this.adminService.rejeterRapport(this.rapport.id, raison).subscribe({
        next: (result) => {
          console.log('✅ Rapport rejeté:', result);
          this.successMessage = 'Rapport rejeté avec succès';
          this.isSubmitting = false;
          setTimeout(() => this.loadRapport(), 500);
        },
        error: (error) => {
          console.error('❌ Erreur rejet:', error);
          this.errorMessage = 'Erreur lors du rejet';
          this.isSubmitting = false;
        }
      });
    }
  }

  marquerCommeLu(): void {
    if (!this.rapport?.id) return;
    
    console.log('👁️ Marquage comme lu du rapport', this.rapport.id);
    
    this.adminService.marquerCommeLu(this.rapport.id).subscribe({
      next: (result) => {
        console.log('✅ Rapport marqué comme lu:', result);
        if (this.rapport) {
          this.rapport.statut = 'Lu par PNVB';
          this.successMessage = 'Rapport marqué comme lu';
        }
      },
      error: (error) => {
        console.error('❌ Erreur marquage:', error);
        this.errorMessage = 'Erreur lors du marquage';
      }
    });
  }

  soumettreFeedback(): void {
    if (this.feedbackForm.invalid || !this.rapport?.id) return;
    
    this.isSubmitting = true;
    const formData = this.feedbackForm.value;
    
    const action = formData.action;
    const commentaire = formData.commentaire;
    
    console.log('💬 Soumission feedback:', { action, commentaire });
    
    if (action === 'validation') {
      this.adminService.validerRapport(this.rapport.id, commentaire).subscribe({
        next: () => {
          this.handleFeedbackSuccess('Rapport validé avec feedback');
        },
        error: (error) => {
          this.handleFeedbackError('Erreur lors de la validation', error);
        }
      });
    } else if (action === 'rejet') {
      this.adminService.rejeterRapport(this.rapport.id, commentaire).subscribe({
        next: () => {
          this.handleFeedbackSuccess('Rapport rejeté avec explication');
        },
        error: (error) => {
          this.handleFeedbackError('Erreur lors du rejet', error);
        }
      });
    } else {
      this.adminService.ajouterCommentaire(this.rapport.id, commentaire).subscribe({
        next: () => {
          this.handleFeedbackSuccess('Commentaire ajouté');
        },
        error: (error) => {
          this.handleFeedbackError('Erreur lors de l\'ajout du commentaire', error);
        }
      });
    }
  }

  private handleFeedbackSuccess(message: string): void {
    this.successMessage = message;
    this.isSubmitting = false;
    this.showFeedbackForm = false;
    this.feedbackForm.reset({ action: 'validation' });
    
    setTimeout(() => {
      this.loadRapport();
      this.successMessage = '';
    }, 1000);
  }

  private handleFeedbackError(message: string, error: any): void {
    this.errorMessage = message;
    this.isSubmitting = false;
    console.error(error);
    
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  downloadDocument(): void {
    if (this.rapport?.urlDocumentAnnexe) {
      window.open(this.rapport.urlDocumentAnnexe, '_blank');
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/rapports']);
  }

  goToPartenaire(): void {
    if (this.rapport?.partenaireId) {
      this.router.navigate(['/admin/partenaires', this.rapport.partenaireId]);
    }
  }

  goToVolontaire(): void {
    if (this.rapport?.volontaireId) {
      this.router.navigate(['/admin/volontaires', this.rapport.volontaireId]);
    }
  }

  getStatutClass(statut: string): string {
    switch(statut) {
      case 'Validé': return 'badge-success';
      case 'Soumis': 
      case 'En attente': 
        return 'badge-primary';
      case 'Brouillon': return 'badge-secondary';
      case 'Rejeté': return 'badge-danger';
      case 'Lu par PNVB': return 'badge-info';
      default: return 'badge-light';
    }
  }

  getStatutIcon(statut: string): string {
    switch(statut) {
      case 'Validé': return 'check-circle';
      case 'Soumis': 
      case 'En attente': 
        return 'clock';
      case 'Brouillon': return 'edit';
      case 'Rejeté': return 'x-circle';
      case 'Lu par PNVB': return 'eye';
      default: return 'file-text';
    }
  }

  getEvaluationColor(score: number): string {
    if (score >= 8) return 'text-success fw-bold';
    if (score >= 6) return 'text-warning';
    return 'text-danger';
  }

  getStarIcons(score: number, max: number = 5): string[] {
    const fullStars = Math.floor(score);
    const halfStar = score % 1 >= 0.5;
    const emptyStars = max - fullStars - (halfStar ? 1 : 0);
    
    return [
      ...Array(fullStars).fill('bi-star-fill'),
      ...(halfStar ? ['bi-star-half'] : []),
      ...Array(emptyStars).fill('bi-star')
    ];
  }

  getActionIcon(action: string): string {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('création')) return 'plus-circle';
    if (actionLower.includes('soumission')) return 'send';
    if (actionLower.includes('validation')) return 'check-circle';
    if (actionLower.includes('rejet')) return 'x-circle';
    if (actionLower.includes('modification')) return 'pencil';
    
    return 'circle';
  }

  getActionColor(action: string): string {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('création')) return 'secondary';
    if (actionLower.includes('soumission')) return 'primary';
    if (actionLower.includes('validation')) return 'success';
    if (actionLower.includes('rejet')) return 'danger';
    if (actionLower.includes('modification')) return 'info';
    
    return 'secondary';
  }

  getCriteresList(): any[] {
    if (!this.rapport?.criteres || typeof this.rapport.criteres !== 'object') return [];
    
    const criteres = this.rapport.criteres;
    
    return [
      { 
        code: 'integration', 
        label: 'Intégration', 
        description: 'Capacité à s\'intégrer dans l\'équipe et la structure',
        score: typeof criteres.integration === 'number' ? criteres.integration : 0,
        stars: this.getStarIcons(typeof criteres.integration === 'number' ? criteres.integration : 0)
      },
      { 
        code: 'competences', 
        label: 'Compétences', 
        description: 'Maîtrise des compétences requises pour la mission',
        score: typeof criteres.competences === 'number' ? criteres.competences : 0,
        stars: this.getStarIcons(typeof criteres.competences === 'number' ? criteres.competences : 0)
      },
      { 
        code: 'initiative', 
        label: 'Initiative', 
        description: 'Prise d\'initiative et autonomie',
        score: typeof criteres.initiative === 'number' ? criteres.initiative : 0,
        stars: this.getStarIcons(typeof criteres.initiative === 'number' ? criteres.initiative : 0)
      },
      { 
        code: 'collaboration', 
        label: 'Collaboration', 
        description: 'Travail en équipe et communication',
        score: typeof criteres.collaboration === 'number' ? criteres.collaboration : 0,
        stars: this.getStarIcons(typeof criteres.collaboration === 'number' ? criteres.collaboration : 0)
      },
      { 
        code: 'respectEngagement', 
        label: 'Respect des engagements', 
        description: 'Ponctualité et respect des délais',
        score: typeof criteres.respectEngagement === 'number' ? criteres.respectEngagement : 0,
        stars: this.getStarIcons(typeof criteres.respectEngagement === 'number' ? criteres.respectEngagement : 0)
      }
    ];
  }

  getProgressBarClass(score: number): string {
    if (score >= 4.5) return 'bg-success';
    if (score >= 4) return 'bg-info';
    if (score >= 3) return 'bg-warning';
    if (score >= 2) return 'bg-orange';
    return 'bg-danger';
  }

  getProgressBarWidth(score: number): number {
    return (score / 5) * 100;
  }

  formatDate(dateString: string | Date | undefined): string {
    if (!dateString) return 'Non disponible';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  }

  toggleFeedbackForm(): void {
    this.showFeedbackForm = !this.showFeedbackForm;
    if (this.showFeedbackForm && this.rapport) {
      this.feedbackForm.patchValue({
        commentaire: this.rapport.feedbackPNVB || ''
      });
    }
  }

  toggleHistorique(): void {
    this.showHistorique = !this.showHistorique;
  }

  getCurrentUser(): string {
    return 'Admin PNVB';
  }

  copyRapportId(): void {
    if (this.rapport?.id) {
      navigator.clipboard.writeText(this.rapport.id.toString()).then(() => {
        this.successMessage = 'ID copié dans le presse-papier';
        setTimeout(() => {
          this.successMessage = '';
        }, 2000);
      }).catch(err => {
        console.error('Erreur copie:', err);
      });
    }
  }
}