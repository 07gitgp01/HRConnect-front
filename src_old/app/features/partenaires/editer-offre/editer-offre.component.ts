import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Project, ProjectStatus, ProjectWorkflow } from '../../models/projects.model';
import { ProjectService } from '../../services/service_projects/projects.service';
import { AuthService } from '../../services/service_auth/auth.service';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-editer-offre',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './editer-offre.component.html',
  styleUrls: ['./editer-offre.component.scss']
})
export class EditerOffreComponent implements OnInit, OnDestroy {
  // Offre
  offre: Project | null = null;
  offreId: string | null = null;
  
  // Formulaire
  offreForm!: FormGroup;
  
  // États
  isLoading = true;
  isSubmitting = false;
  erreurChargement = '';
  
  // Utilisateur
  currentUser: any = null;
  peutEditer = false;
  
  // Options
  typesMission = [
    { value: 'Education', label: 'Éducation' },
    { value: 'Santé', label: 'Santé' },
    { value: 'Environnement', label: 'Environnement' },
    { value: 'Développement', label: 'Développement' },
    { value: 'Urgence', label: 'Urgence' },
    { value: 'Autre', label: 'Autre' }
  ];

  domaines = [
    'Éducation',
    'Santé',
    'Agriculture',
    'Environnement',
    'Développement Communautaire',
    'Technologie',
    'Gouvernance',
    'Culture',
    'Eau et Assainissement',
    'Énergie',
    'Autre'
  ];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private projectService: ProjectService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.chargerUtilisateur();
    this.route.paramMap.subscribe(params => {
      this.offreId = params.get('id');
      if (this.offreId) {
        this.chargerOffre();
      } else {
        this.router.navigate(['/features/partenaires/offres-mission']);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initForm(): void {
    this.offreForm = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(10)]],
      descriptionCourte: ['', [Validators.required, Validators.minLength(20)]],
      descriptionLongue: ['', [Validators.required, Validators.minLength(100)]],
      type_mission: ['Education', Validators.required],
      domaineActivite: ['', Validators.required],
      nombreVolontairesRequis: [1, [Validators.required, Validators.min(1)]],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      dateLimiteCandidature: ['', Validators.required],
      regionAffectation: ['', Validators.required],
      ville_commune: ['', Validators.required],
      competences_requises: [''],
      conditions_particulieres: [''],
      avantagesVolontaire: ['']
    });
  }

  private chargerUtilisateur(): void {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.erreurChargement = 'Vous devez être connecté pour accéder à cette page.';
      this.isLoading = false;
      return;
    }

    this.currentUser = user;
    
    // Vérifier les permissions
    const userRole = user.role?.toString().toLowerCase().trim() || '';
    const rolesAutorises = ['partenaire', 'admin']; // ✅ Supprimé super_admin
    this.peutEditer = rolesAutorises.some(role => userRole.includes(role.toLowerCase()));
  }

  private chargerOffre(): void {
    if (!this.offreId) return;

    this.isLoading = true;
    
    this.subscriptions.add(
      this.projectService.getProject(this.offreId).subscribe({
        next: (offre) => {
          this.offre = offre;
          
          // Vérifier si l'utilisateur peut éditer cette offre
          this.verifierPermissionEdition(offre);
          
          // Pré-remplir le formulaire
          this.remplirFormulaire(offre);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur chargement offre:', error);
          this.erreurChargement = 'Erreur lors du chargement de l\'offre.';
          this.isLoading = false;
        }
      })
    );
  }

  private verifierPermissionEdition(offre: Project): void {
    // ✅ CORRECTION : Vérifier les statuts qui permettent l'édition avec les nouveaux statuts
    const statutsEditables = ['en_attente']; // Seulement 'en_attente'
    
    if (!statutsEditables.includes(offre.statutProjet)) {
      this.peutEditer = false;
      this.erreurChargement = 'Cette offre ne peut plus être modifiée (seulement si statut "en attente").';
    }
    
    // Vérifier que l'utilisateur est le propriétaire ou admin
    const userId = this.currentUser?.id?.toString();
    const partenaireId = offre.partenaireId?.toString();
    
    if (this.currentUser?.role !== 'admin' && userId !== partenaireId) {
      this.peutEditer = false;
      this.erreurChargement = 'Vous n\'avez pas la permission de modifier cette offre.';
    }
  }

  private remplirFormulaire(offre: Project): void {
    this.offreForm.patchValue({
      titre: offre.titre,
      descriptionCourte: offre.descriptionCourte,
      descriptionLongue: offre.descriptionLongue,
      type_mission: offre.type_mission || 'Education',
      domaineActivite: offre.domaineActivite,
      nombreVolontairesRequis: offre.nombreVolontairesRequis,
      dateDebut: this.formatDateForInput(offre.dateDebut),
      dateFin: this.formatDateForInput(offre.dateFin),
      dateLimiteCandidature: this.formatDateForInput(offre.dateLimiteCandidature),
      regionAffectation: offre.regionAffectation,
      ville_commune: offre.ville_commune,
      competences_requises: offre.competences_requises || '',
      conditions_particulieres: offre.conditions_particulieres || '',
      avantagesVolontaire: offre.avantagesVolontaire || ''
    });
  }

  private formatDateForInput(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  // ===== ACTIONS =====
  sauvegarder(): void {
    if (this.offreForm.invalid) {
      this.marquerChampsCommeTouches();
      return;
    }

    if (!this.offreId || !this.offre) {
      this.afficherMessage('Offre non trouvée', 'error');
      return;
    }

    if (!this.peutEditer) {
      this.afficherMessage('Vous n\'avez pas la permission de modifier cette offre', 'error');
      return;
    }

    this.isSubmitting = true;
    
    const formValue = this.offreForm.value;
    
    const offreMiseAJour: Partial<Project> = {
      ...formValue,
      updated_at: new Date().toISOString()
    };

    this.subscriptions.add(
      this.projectService.updateProject(this.offreId, offreMiseAJour).subscribe({
        next: (offreMiseAJour) => {
          console.log('✅ Offre mise à jour:', offreMiseAJour);
          this.offre = offreMiseAJour;
          this.isSubmitting = false;
          this.afficherMessage('Offre mise à jour avec succès', 'success');
          
          // Rediriger après un court délai
          setTimeout(() => {
            this.router.navigate(['/features/partenaires/offres-mission', this.offreId]);
          }, 1500);
        },
        error: (error) => {
          console.error('❌ Erreur mise à jour offre:', error);
          this.isSubmitting = false;
          this.afficherMessage('Erreur lors de la mise à jour: ' + (error.message || 'Erreur serveur'), 'error');
        }
      })
    );
  }

  annuler(): void {
    const confirmation = confirm('Êtes-vous sûr de vouloir annuler les modifications ?');
    if (confirmation) {
      this.router.navigate(['/features/partenaires/offres-mission', this.offreId]);
    }
  }

  retourListe(): void {
    this.router.navigate(['/features/partenaires/offres-mission']);
  }

  // ===== MÉTHODES UTILITAIRES =====
  private marquerChampsCommeTouches(): void {
    Object.keys(this.offreForm.controls).forEach(key => {
      this.offreForm.get(key)?.markAsTouched();
    });
  }

  private afficherMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // ===== GETTERS POUR LE TEMPLATE =====
  getStatutText(statut: ProjectStatus): string {
    return ProjectWorkflow.getStatusLabel(statut);
  }

  getStatutBadgeClass(statut: ProjectStatus): string {
    return ProjectWorkflow.getStatusClass(statut);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'Non définie';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  }

  // ===== VALIDATIONS =====
  validateDates(): boolean {
    const dateDebut = this.offreForm.get('dateDebut')?.value;
    const dateFin = this.offreForm.get('dateFin')?.value;
    const dateLimite = this.offreForm.get('dateLimiteCandidature')?.value;

    if (!dateDebut || !dateFin || !dateLimite) return true;

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const limite = new Date(dateLimite);

    // La date limite doit être avant la date de début
    if (limite >= debut) {
      this.offreForm.get('dateLimiteCandidature')?.setErrors({ dateInvalide: true });
      return false;
    }

    // La date de fin doit être après la date de début
    if (fin <= debut) {
      this.offreForm.get('dateFin')?.setErrors({ dateInvalide: true });
      return false;
    }

    return true;
  }

  onSubmit(): void {
    if (this.offreForm.valid && this.validateDates()) {
      this.sauvegarder();
    }
  }
}