// src/app/features/partenaires/edition-rapport/edition-rapport.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/service_auth/auth.service';
import { Rapport, TypeRapport, PieceJointe } from '../../models/rapport.model';
import { RapportService } from '../../services/rap_parten/rapport.service';

@Component({
  selector: 'app-edition-rapport',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './edition-rapport.component.html',
  styleUrls: ['./edition-rapport.component.scss']
})
export class EditionRapportComponent implements OnInit {
  rapport!: Rapport;
  typeRapport!: TypeRapport;
  formulaireRapport!: FormGroup;
  piecesJointes: PieceJointe[] = [];
  fichiersSelectionnes: File[] = [];
  
  isLoading = true;
  isSubmitting = false;
  isPreviewMode = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rapportService: RapportService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.chargerRapport();
  }

  chargerRapport(): void {
    const rapportId = this.route.snapshot.params['id'];
    
    this.rapportService.getRapport(parseInt(rapportId)).subscribe({
      next: (rapport) => {
        this.rapport = rapport;
        this.piecesJointes = rapport.piecesJointes || [];
        this.initialiserFormulaire();
        
        // Charger le type de rapport
        this.rapportService.getTypesRapport().subscribe(types => {
          this.typeRapport = types.find(t => t.id === rapport.typeRapportId)!;
          this.isLoading = false;
        });
      },
      error: () => {
        this.router.navigate(['/features/partenaires/gestion-rapports']);
      }
    });
  }

  initialiserFormulaire(): void {
    this.formulaireRapport = this.fb.group({
      titre: [this.rapport.titre || '', [Validators.required, Validators.minLength(10)]],
      description: [this.rapport.description || '', [Validators.required, Validators.minLength(50)]],
      contenu: [this.rapport.contenu || this.initialiserContenu()]
    });
  }

  initialiserContenu(): any {
    if (this.typeRapport?.template?.sections) {
      const contenu: any = {};
      this.typeRapport.template.sections.forEach((section: any) => {
        if (section.type === 'textarea') {
          contenu[section.titre] = '';
        } else if (section.type === 'table') {
          contenu[section.titre] = section.lignes || [];
        }
      });
      return contenu;
    }
    return {};
  }

  // ==================== GESTION DES FICHIERS ====================

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      this.fichiersSelectionnes.push(files[i]);
    }
  }

  ajouterPieceJointe(): void {
    if (this.fichiersSelectionnes.length === 0) return;

    this.fichiersSelectionnes.forEach(fichier => {
      this.rapportService.ajouterPieceJointe(this.rapport.id, fichier).subscribe({
        next: (pieceJointe) => {
          this.piecesJointes.push(pieceJointe);
          this.fichiersSelectionnes = this.fichiersSelectionnes.filter(f => f !== fichier);
        },
        error: () => {
          alert(`Erreur lors de l'upload de ${fichier.name}`);
        }
      });
    });
  }

  supprimerPieceJointe(pieceJointeId: number): void {
    if (confirm('Supprimer cette pièce jointe ?')) {
      this.rapportService.supprimerPieceJointe(this.rapport.id, pieceJointeId).subscribe({
        next: () => {
          this.piecesJointes = this.piecesJointes.filter(p => p.id !== pieceJointeId);
        },
        error: () => {
          alert('Erreur lors de la suppression');
        }
      });
    }
  }

  // ==================== GESTION DU FORMULAIRE ====================

  sauvegarderBrouillon(): void {
    if (this.formulaireRapport.invalid) {
      this.marquerChampsCommeTouches();
      return;
    }

    this.isSubmitting = true;
    
    const rapportMaj = {
      ...this.rapport,
      ...this.formulaireRapport.value
    };

    this.rapportService.mettreAJourRapport(this.rapport.id, rapportMaj).subscribe({
      next: (rapport) => {
        this.rapport = rapport;
        this.isSubmitting = false;
        alert('Rapport sauvegardé en brouillon');
      },
      error: () => {
        this.isSubmitting = false;
        alert('Erreur lors de la sauvegarde');
      }
    });
  }

  soumettreRapport(): void {
    if (this.formulaireRapport.invalid) {
      this.marquerChampsCommeTouches();
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir soumettre ce rapport ?')) {
      return;
    }

    this.isSubmitting = true;
    
    const rapportMaj = {
      ...this.rapport,
      ...this.formulaireRapport.value,
      statut: 'soumis',
      dateSoumission: new Date().toISOString()
    };

    this.rapportService.mettreAJourRapport(this.rapport.id, rapportMaj).subscribe({
      next: (rapport) => {
        this.rapport = rapport;
        this.isSubmitting = false;
        alert('Rapport soumis avec succès');
        this.router.navigate(['/features/partenaires/gestion-rapports']);
      },
      error: () => {
        this.isSubmitting = false;
        alert('Erreur lors de la soumission');
      }
    });
  }

  private marquerChampsCommeTouches(): void {
    Object.keys(this.formulaireRapport.controls).forEach(key => {
      const control = this.formulaireRapport.get(key);
      control?.markAsTouched();
    });
  }

  // ==================== PRÉVISUALISATION ====================

  basculerPreview(): void {
    this.isPreviewMode = !this.isPreviewMode;
  }

  // ==================== UTILITAIRES ====================

  formaterTailleFichier(taille: number): string {
    if (taille < 1024) return taille + ' B';
    if (taille < 1024 * 1024) return (taille / 1024).toFixed(1) + ' KB';
    return (taille / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getIconeFichier(type: string): string {
    const icones: {[key: string]: string} = {
      'pdf': 'fa-file-pdf',
      'doc': 'fa-file-word',
      'docx': 'fa-file-word',
      'xls': 'fa-file-excel',
      'xlsx': 'fa-file-excel',
      'jpg': 'fa-file-image',
      'jpeg': 'fa-file-image',
      'png': 'fa-file-image',
      'default': 'fa-file'
    };
    
    const extension = type.split('/').pop()?.toLowerCase();
    return icones[extension || ''] || icones['default'];
  }

  getEcheanceInfo(): { texte: string; classe: string } {
    return this.rapportService.formaterDateEcheance(this.rapport.dateEcheance);
  }
}