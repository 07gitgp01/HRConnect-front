import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RapportService } from '../../../services/rap-eval/rapport.service';
import { RapportEvaluation } from '../../../models/rapport-evaluation.model';
import { Partenaire } from '../../../models/partenaire.model';
import { Volontaire } from '../../../models/volontaire.model';

@Component({
  selector: 'app-rapport-detail',
  templateUrl: './rapport-detail.component.html',
  styleUrls: ['./rapport-detail.component.css']
})
export class RapportDetailComponent implements OnInit {
  rapport: RapportEvaluation | null = null; // Initialiser à null
  volontaire: Volontaire | null = null;
  partenaire: Partenaire | null = null;
  
  isLoading = true;
  error = '';
  
  // Calculs pour l'affichage
  moyenneCriteres = 0;
  evaluationLabel = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rapportService: RapportService
  ) {}

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

    this.rapportService.getRapport(id).subscribe({
      next: (data: RapportEvaluation) => {
        this.rapport = data;
        
        // Charger les données liées si disponibles
        if (data.volontaire) {
          this.volontaire = data.volontaire;
        }
        if (data.partenaire) {
          this.partenaire = data.partenaire;
        }
        
        this.calculateMetrics();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erreur:', error);
        this.error = 'Impossible de charger le rapport';
        this.isLoading = false;
      }
    });
  }

  calculateMetrics(): void {
    if (!this.rapport) return;
    
    // Calcul de la moyenne des critères
    if (this.rapport.criteres) {
      const valeurs = Object.values(this.rapport.criteres);
      this.moyenneCriteres = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
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

  // Utilitaires d'affichage
  getStatutClass(statut: string): string {
    switch(statut) {
      case 'Validé': return 'badge-success';
      case 'Soumis': return 'badge-primary';
      case 'Brouillon': return 'badge-secondary';
      case 'Rejeté': return 'badge-danger';
      case 'Lu par PNVB': return 'badge-info';
      default: return 'badge-light';
    }
  }

  getStatutIcon(statut: string): string {
    switch(statut) {
      case 'Validé': return 'check-circle';
      case 'Soumis': return 'send';
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

  // Méthode pour récupérer la liste des critères
  getCriteresList(): any[] {
    if (!this.rapport?.criteres) return [];
    
    return [
      { 
        code: 'integration', 
        label: 'Intégration', 
        description: 'Capacité à s\'intégrer dans l\'équipe et la structure',
        score: this.rapport.criteres.integration,
        stars: this.getStarIcons(this.rapport.criteres.integration)
      },
      { 
        code: 'competences', 
        label: 'Compétences', 
        description: 'Maîtrise des compétences requises pour la mission',
        score: this.rapport.criteres.competences,
        stars: this.getStarIcons(this.rapport.criteres.competences)
      },
      { 
        code: 'initiative', 
        label: 'Initiative', 
        description: 'Prise d\'initiative et autonomie',
        score: this.rapport.criteres.initiative,
        stars: this.getStarIcons(this.rapport.criteres.initiative)
      },
      { 
        code: 'collaboration', 
        label: 'Collaboration', 
        description: 'Travail en équipe et communication',
        score: this.rapport.criteres.collaboration,
        stars: this.getStarIcons(this.rapport.criteres.collaboration)
      },
      { 
        code: 'respectEngagement', 
        label: 'Respect des engagements', 
        description: 'Ponctualité et respect des délais',
        score: this.rapport.criteres.respectEngagement,
        stars: this.getStarIcons(this.rapport.criteres.respectEngagement)
      }
    ];
  }

  getProgressBarClass(score: number): string {
    if (score >= 4.5) return 'excellent';
    if (score >= 4) return 'good';
    if (score >= 3) return 'average';
    if (score >= 2) return 'poor';
    return 'weak';
  }

  // Actions avec vérifications de null
  editRapport(): void {
    if (this.rapport?.id) {
      this.router.navigate(['/rapports', this.rapport.id, 'edit']);
    }
  }

  deleteRapport(): void {
    if (!this.rapport?.id) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
      this.rapportService.deleteRapport(this.rapport.id).subscribe({
        next: () => {
          this.router.navigate(['/rapports']);
        },
        error: (error: any) => {
          console.error('Erreur:', error);
          alert('Erreur lors de la suppression');
        }
      });
    }
  }

  soumettreRapport(): void {
    if (!this.rapport?.id) return;
    
    this.rapportService.soumettreRapport(this.rapport.id).subscribe({
      next: () => {
        this.loadRapport();
        alert('Rapport soumis avec succès');
      },
      error: (error: any) => {
        console.error('Erreur:', error);
        alert('Erreur lors de la soumission');
      }
    });
  }

  downloadDocument(): void {
    if (this.rapport?.urlDocumentAnnexe) {
      window.open(this.rapport.urlDocumentAnnexe, '_blank');
    }
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/rapports']);
  }
}