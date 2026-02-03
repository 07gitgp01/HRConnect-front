// src/app/features/partenaires/edit-projet/edit-projet.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PartenaireService } from '../../services/service_parten/partenaire.service';
import { AuthService } from '../../services/service_auth/auth.service';

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-edit-projet',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule // AJOUTEZ CET IMPORT

  ],
  templateUrl: './edit-projet.component.html',
  styleUrls: ['./edit-projet.component.scss']
})
export class EditProjetComponent implements OnInit {
  editForm!: FormGroup;
  projet: any = null;
  isLoading = true;
  isSaving = false;
  erreurChargement = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private partenaireService: PartenaireService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadProjet();
  }

  private initForm(): void {
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      region: ['', Validators.required],
      type: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      neededVolunteers: ['', [Validators.required, Validators.min(1)]],
      competences_requises: [''],
      equipement_necessaire: [''],
      conditions_particulieres: [''],
      contact_responsable: [''],
      email_contact: ['', Validators.email],
      budget: [''],
      objectifs: ['']
    });
  }

  loadProjet(): void {
    this.isLoading = true;
    this.erreurChargement = '';

    const projetId = this.route.snapshot.paramMap.get('id');
    console.log('🔄 Chargement projet pour édition ID:', projetId);
    
    if (!projetId) {
      this.erreurChargement = 'ID du projet non spécifié';
      this.isLoading = false;
      return;
    }

    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user && user.id) {
          const partenaireId = user.id;
          
          this.partenaireService.getProjetsAvecCandidatures(partenaireId).subscribe({
            next: (projets) => {
              console.log('📋 Projets chargés:', projets.length);
              
              const projetTrouve = projets.find((p: any) => 
                p.id?.toString() === projetId.toString()
              );

              if (projetTrouve) {
                console.log('✅ Projet trouvé pour édition:', projetTrouve);
                this.projet = projetTrouve;
                
                // Vérifier si le projet peut être édité
                if (!this.canEdit(this.projet)) {
                  this.erreurChargement = 'Ce projet ne peut pas être modifié (déjà en cours ou clôturé)';
                  this.isLoading = false;
                  return;
                }

                // Remplir le formulaire avec les données existantes
                this.editForm.patchValue({
                  title: this.projet.title || '',
                  description: this.projet.description || '',
                  region: this.projet.region || '',
                  type: this.projet.type || '',
                  startDate: this.projet.startDate || '',
                  endDate: this.projet.endDate || '',
                  neededVolunteers: this.projet.neededVolunteers || 0,
                  competences_requises: this.projet.competences_requises || '',
                  equipement_necessaire: this.projet.equipement_necessaire || '',
                  conditions_particulieres: this.projet.conditions_particulieres || '',
                  contact_responsable: this.projet.contact_responsable || '',
                  email_contact: this.projet.email_contact || '',
                  budget: this.projet.budget || '',
                  objectifs: this.projet.objectifs || ''
                });

                this.isLoading = false;
              } else {
                console.warn('❌ Projet non trouvé');
                this.erreurChargement = 'Projet non trouvé';
                this.isLoading = false;
              }
            },
            error: (err) => {
              console.error('❌ Erreur chargement projet:', err);
              this.erreurChargement = 'Erreur lors du chargement des données';
              this.isLoading = false;
            }
          });
        } else {
          this.erreurChargement = 'Utilisateur non connecté';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('❌ Erreur authentification:', err);
        this.erreurChargement = 'Erreur d\'authentification';
        this.isLoading = false;
      }
    });
  }

  canEdit(projet: any): boolean {
  if (!projet) return false;
  
  // Récupérer le statut (peut être dans 'status' ou 'statut')
  const statut = projet.status || projet.statut || '';
  console.log('🔍 Vérification édition - Statut brut:', statut, 'Projet:', {
    id: projet.id,
    title: projet.title,
    status: projet.status,
    statut: projet.statut
  });
  
  // Normaliser le statut pour la comparaison
  const statutNormalise = this.normaliserStatut(statut);
  console.log('📝 Statut normalisé:', statutNormalise);
  
  // Les projets modifiables sont ceux avec statut "soumis" ou "planifié"
  const peutEditer = statutNormalise === 'soumis' || statutNormalise === 'planifié';
  console.log('✅ Peut éditer:', peutEditer);
  
  return peutEditer;
}

/**
 * Normalise les statuts pour une cohérence
 */
private normaliserStatut(statut: string): string {
  if (!statut) return 'soumis';
  
  const statutsNormalises: { [key: string]: string } = {
    'submitted': 'soumis',
    'pending': 'soumis',
    'planned': 'planifié',
    'scheduled': 'planifié',
    'active': 'en cours',
    'in_progress': 'en cours',
    'completed': 'clôturé',
    'finished': 'clôturé',
    'closed': 'clôturé',
    'overdue': 'en retard',
    'late': 'en retard',
    'clôturé': 'clôturé',
    'soumis': 'soumis',
    'planifié': 'planifié',
    'en cours': 'en cours',
    'en_attente': 'soumis',
    'under_review': 'soumis',
    'draft': 'soumis',
    'brouillon': 'soumis'
  };

  const statutLower = statut.toLowerCase().trim();
  return statutsNormalises[statutLower] || statut;
}

  onSubmit(): void {
    console.log('🔄 Tentative de soumission du formulaire');
    
    // Marquer tous les champs comme touchés pour afficher les erreurs
    this.markFormGroupTouched(this.editForm);
    
    if (this.editForm.valid && this.projet) {
      this.isSaving = true;
      console.log('✅ Formulaire valide, préparation des données...');

      // Préparer les données pour l'API
      const formData = {
        ...this.editForm.value,
        // S'assurer que les champs critiques sont présents
        id: this.projet.id,
        partenaireId: this.projet.partenaireId,
        statut: this.projet.statut || this.projet.status, // Garder le statut original
        mis_a_jour_le: new Date().toISOString()
      };

      // Convertir les dates en format ISO si nécessaire
      if (formData.startDate) {
        formData.startDate = new Date(formData.startDate).toISOString();
      }
      if (formData.endDate) {
        formData.endDate = new Date(formData.endDate).toISOString();
      }

      console.log('📤 Données à envoyer:', formData);

      // Utiliser la méthode updateProjet
      this.partenaireService.updateProjet(this.projet.id, formData).subscribe({
        next: (updatedProjet) => {
          console.log('✅ Projet modifié avec succès:', updatedProjet);
          this.snackBar.open('Projet modifié avec succès', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          // Rediriger vers la page de détail après un court délai
          setTimeout(() => {
            this.router.navigate(['/features/partenaires/projets', this.projet.id]);
          }, 1000);
        },
        error: (err) => {
          console.error('❌ Erreur modification projet:', err);
          let errorMessage = 'Erreur lors de la modification du projet';
          
          if (err.status === 404) {
            errorMessage = 'Projet non trouvé sur le serveur';
          } else if (err.status === 400) {
            errorMessage = 'Données invalides';
          } else if (err.status === 403) {
            errorMessage = 'Vous n\'avez pas les droits pour modifier ce projet';
          }
          
          this.snackBar.open(errorMessage, 'Fermer', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isSaving = false;
        }
      });
    } else {
      console.warn('❌ Formulaire invalide');
      this.snackBar.open('Veuillez corriger les erreurs dans le formulaire', 'Fermer', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  // Méthode pour marquer tous les champs comme touchés
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/features/partenaires/projets', this.projet.id]);
  }

  formatDate(date: string): string {
    if (!date) return 'Non définie';
    try {
      return new Date(date).toLocaleDateString('fr-FR');
    } catch {
      return 'Date invalide';
    }
  }

  // Méthodes pour afficher les erreurs dans le template
  getFieldError(fieldName: string): string {
    const field = this.editForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'Ce champ est obligatoire';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['min']) return `Minimum ${field.errors['min'].min}`;
      if (field.errors['email']) return 'Format d\'email invalide';
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field?.invalid && field.touched);
  }
}