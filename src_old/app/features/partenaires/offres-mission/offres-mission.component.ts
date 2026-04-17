import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Project, ProjectStatus, ProjectWorkflow } from '../../models/projects.model';
import { AuthService } from '../../services/service_auth/auth.service';
import { Subscription } from 'rxjs';
import { ProjectService } from '../../services/service_projects/projects.service';

@Component({
  selector: 'app-offres-mission',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './offres-mission.component.html',
  styleUrls: ['./offres-mission.component.scss']
})
export class OffresMissionComponent implements OnInit, OnDestroy {
  // Liste des projets
  offres: Project[] = [];
  offresFiltrees: Project[] = [];
  
  // Formulaires
  offreForm!: FormGroup;
  
  // États
  isLoading = true;
  isSubmitting = false;
  erreurChargement = '';
  
  // Utilisateur
  currentUserId: string | null = null;
  currentUser: any = null;
  
  private subscriptions: Subscription = new Subscription();

  // Filtres
  filtres = {
    statut: 'tous' as ProjectStatus | 'tous',
    domaine: 'tous',
    recherche: ''
  };

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

  // Gestion modals
  showModalOffre = false;
  showModalSuppression = false;
  modeEdition = false;
  offreEnEdition?: Project;
  offreASupprimer?: Project;

  // Statistiques
  statistiques = {
    total: 0,
    en_attente: 0,
    actifs: 0,
    clotures: 0,
    postesVacants: 0,
    candidaturesTotal: 0
  };

  // Permissions
  peutCreerOffres = false;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private authService: AuthService,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    console.log('🚀 OffresMissionComponent initialisé');
    this.chargerUtilisateur();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private chargerUtilisateur(): void {
    console.log('🔍 Début chargement utilisateur...');
    
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      console.error('❌ Aucun utilisateur connecté');
      this.erreurChargement = 'Vous devez être connecté pour accéder à cette page.';
      this.isLoading = false;
      return;
    }

    console.log('✅ Utilisateur trouvé:', user);
    console.log('🔑 ID:', user.id);
    console.log('🎭 Rôle:', user.role);
    
    this.currentUser = user;
    
    const userId = this.getValidUserId(user.id);
    
    if (userId !== null) {
      this.currentUserId = userId;
      console.log(`✅ currentUserId défini: "${this.currentUserId}"`);
      
      this.verifierPermissions(user);
      
      this.chargerOffres();
    } else {
      console.error('❌ ID utilisateur invalide:', user.id);
      this.erreurChargement = 'ID utilisateur invalide.';
      this.isLoading = false;
    }
  }

  private getValidUserId(id: any): string | null {
    console.log('🔄 Validation ID:', id, 'type:', typeof id);
    
    if (id === undefined || id === null) {
      console.error('❌ ID est undefined/null');
      return null;
    }
    
    const idString = String(id).trim();
    
    if (idString.length === 0) {
      console.error('❌ ID est une chaîne vide');
      return null;
    }
    
    console.log(`✅ ID validé: "${idString}"`);
    return idString;
  }

  private verifierPermissions(user: any): void {
    console.log('🔐 Vérification des permissions...');
    
    if (!user.role) {
      console.error('❌ Rôle utilisateur non défini');
      this.peutCreerOffres = false;
      return;
    }
    
    const userRole = user.role.toString().toLowerCase().trim();
    console.log(`🔐 Rôle normalisé: "${userRole}"`);
    
    const rolesAutorises = [
      'partenaire',
      'admin'
    ];
    
    const estAutorise = rolesAutorises.some(role => 
      userRole.includes(role.toLowerCase())
    );
    
    console.log(`🔐 Rôle autorisé à créer des offres: ${estAutorise}`);
    
    this.peutCreerOffres = estAutorise;
    
    if (!this.peutCreerOffres) {
      console.warn('⚠️ Utilisateur non autorisé. Rôle actuel:', userRole);
    }
  }

  private initForm(): void {
    this.offreForm = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(10)]],
      descriptionCourte: ['', [Validators.required, Validators.minLength(20)]],
      descriptionLongue: ['', [Validators.required, Validators.minLength(100)]],
      type_mission: ['Education', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      dateLimiteCandidature: ['', Validators.required],
      nombreVolontairesRequis: [1, [Validators.required, Validators.min(1)]],
      regionAffectation: ['', Validators.required],
      ville_commune: ['', Validators.required],
      domaineActivite: ['', Validators.required],
      competences_requises: [''],
      conditions_particulieres: [''],
      avantagesVolontaire: ['']
    });
  }

  chargerOffres(): void {
    this.isLoading = true;
    this.erreurChargement = '';
    
    if (this.currentUserId === null) {
      console.error('❌ currentUserId est null');
      this.erreurChargement = 'ID utilisateur manquant';
      this.isLoading = false;
      return;
    }
    
    console.log(`📡 Chargement offres pour partenaire ID: "${this.currentUserId}"`);
    
    this.subscriptions.add(
      this.projectService.getProjetsByPartenaire(this.currentUserId).subscribe({
        next: (projets) => {
          console.log(`✅ ${projets.length} offres chargées`);
          this.offres = projets;
          this.appliquerFiltres();
          this.calculerStatistiques();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur chargement offres:', error);
          this.erreurChargement = 'Erreur lors du chargement des offres.';
          this.isLoading = false;
          this.offres = [];
        }
      })
    );
  }

  appliquerFiltres(): void {
    this.offresFiltrees = this.offres.filter(offre => {
      if (this.filtres.statut !== 'tous' && offre.statutProjet !== this.filtres.statut) {
        return false;
      }
      
      if (this.filtres.domaine !== 'tous' && offre.domaineActivite !== this.filtres.domaine) {
        return false;
      }
      
      if (this.filtres.recherche) {
        const recherche = this.filtres.recherche.toLowerCase();
        const matchesTitre = offre.titre.toLowerCase().includes(recherche);
        const matchesDescription = offre.descriptionLongue.toLowerCase().includes(recherche);
        const matchesRegion = offre.regionAffectation.toLowerCase().includes(recherche);
        
        if (!matchesTitre && !matchesDescription && !matchesRegion) {
          return false;
        }
      }
      
      return true;
    });
  }

  calculerStatistiques(): void {
    this.statistiques = {
      total: this.offres.length,
      en_attente: this.offres.filter(o => o.statutProjet === 'en_attente').length,
      actifs: this.offres.filter(o => o.statutProjet === 'actif').length,
      clotures: this.offres.filter(o => o.statutProjet === 'cloture').length,
      postesVacants: this.offres.reduce((total, offre) => {
        if (offre.statutProjet === 'actif') {
          const restants = offre.nombreVolontairesRequis - (offre.nombreVolontairesActuels || 0);
          return total + Math.max(0, restants);
        }
        return total;
      }, 0),
      candidaturesTotal: 0
    };
  }

  // ===== GESTION DES MODALS =====
  ouvrirModalNouvelleOffre(): void {
    console.log('📝 Ouverture modal nouvelle offre...');
    console.log('🔐 peutCreerOffres:', this.peutCreerOffres);
    
    if (!this.peutCreerOffres) {
      console.error('❌ Permission refusée - peutCreerOffres est false');
      console.error('❌ Rôle utilisateur:', this.currentUser?.role);
      this.afficherMessage('Vous n\'avez pas la permission de créer des offres. Seuls les partenaires et administrateurs peuvent créer des offres.', 'error');
      return;
    }

    if (this.currentUserId === null) {
      console.error('❌ currentUserId est null');
      this.afficherMessage('ID utilisateur invalide. Veuillez vous reconnecter.', 'error');
      return;
    }

    console.log(`✅ Vérification limite projets pour ID: "${this.currentUserId}"`);
    
    this.subscriptions.add(
      this.projectService.peutCreerProjet(this.currentUserId).subscribe({
        next: (peutCreer) => {
          console.log(`✅ Résultat vérification limite: ${peutCreer}`);
          if (!peutCreer) {
            this.afficherMessage('Vous avez atteint la limite de projets actifs (10 maximum).', 'error');
            return;
          }

          this.modeEdition = false;
          this.offreEnEdition = undefined;
          this.offreForm.reset({
            type_mission: 'Education',
            nombreVolontairesRequis: 1
          });
          this.showModalOffre = true;
          console.log('✅ Modal ouverte avec succès');
        },
        error: (error) => {
          console.error('❌ Erreur vérification limite:', error);
          this.afficherMessage('Erreur lors de la vérification des permissions.', 'error');
        }
      })
    );
  }

  ouvrirModalEdition(offre: Project): void {
    if (!this.peutModifier(offre)) {
      this.afficherMessage('Cette offre ne peut pas être modifiée.', 'error');
      return;
    }

    this.modeEdition = true;
    this.offreEnEdition = offre;
    
    console.log('🔄 Données offre à éditer:', offre);
    
    this.offreForm.patchValue({
      titre: offre.titre,
      descriptionCourte: offre.descriptionCourte,
      descriptionLongue: offre.descriptionLongue,
      type_mission: offre.type_mission || 'Education',
      dateDebut: this.formatDateForInput(offre.dateDebut),
      dateFin: this.formatDateForInput(offre.dateFin),
      dateLimiteCandidature: this.formatDateForInput(offre.dateLimiteCandidature),
      nombreVolontairesRequis: offre.nombreVolontairesRequis,
      regionAffectation: offre.regionAffectation,
      ville_commune: offre.ville_commune,
      domaineActivite: offre.domaineActivite,
      competences_requises: offre.competences_requises || '',
      conditions_particulieres: offre.conditions_particulieres || '',
      avantagesVolontaire: offre.avantagesVolontaire || ''
    });
    
    this.showModalOffre = true;
  }

  private formatDateForInput(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  fermerModalOffre(): void {
    this.showModalOffre = false;
    this.offreForm.reset();
    this.offreEnEdition = undefined;
  }

  ouvrirModalSuppression(offre: Project): void {
    if (!this.peutSupprimer(offre)) {
      this.afficherMessage('Cette offre ne peut pas être supprimée.', 'error');
      return;
    }

    this.offreASupprimer = offre;
    this.showModalSuppression = true;
  }

  fermerModalSuppression(): void {
    this.showModalSuppression = false;
    this.offreASupprimer = undefined;
  }

  // ===== ACTIONS SUR LES OFFRES =====
  sauvegarderOffre(): void {
    if (this.offreForm.invalid) {
      this.marquerChampsCommeTouches();
      return;
    }

    if (this.currentUserId === null) {
      console.error('❌ currentUserId est null');
      this.afficherMessage('ID utilisateur invalide. Veuillez vous reconnecter.', 'error');
      return;
    }

    this.isSubmitting = true;
    
    const formValue = this.offreForm.value;
    
    console.log('📋 Données formulaire originales:', formValue);
    
    // 🔥 CORRECTION : Utiliser les noms de champs corrects
    const nouvelleOffre: any = {
      // Champs principaux
      titre: formValue.titre,
      descriptionCourte: formValue.descriptionCourte,
      descriptionLongue: formValue.descriptionLongue,
      type_mission: formValue.type_mission,
      dateDebut: formValue.dateDebut,
      dateFin: formValue.dateFin,
      dateLimiteCandidature: formValue.dateLimiteCandidature,
      nombreVolontairesRequis: formValue.nombreVolontairesRequis,
      regionAffectation: formValue.regionAffectation,
      ville_commune: formValue.ville_commune,
      domaineActivite: formValue.domaineActivite,
      competences_requises: formValue.competences_requises,
      conditions_particulieres: formValue.conditions_particulieres,
      avantagesVolontaire: formValue.avantagesVolontaire,
      
      // Champs système
      partenaireId: this.currentUserId,
      statutProjet: 'en_attente', // ✅ CHANGÉ: 'soumis' → 'en_attente'
      nombreVolontairesActuels: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📦 Données envoyées au serveur:', nouvelleOffre);

    if (this.modeEdition && this.offreEnEdition?.id) {
      this.subscriptions.add(
        this.projectService.updateProject(this.offreEnEdition.id, nouvelleOffre).subscribe({
          next: (offreMiseAJour) => {
            console.log('✅ Offre mise à jour:', offreMiseAJour);
            const index = this.offres.findIndex(o => o.id === this.offreEnEdition?.id);
            if (index !== -1) {
              this.offres[index] = offreMiseAJour;
            }
            this.appliquerFiltres();
            this.calculerStatistiques();
            this.isSubmitting = false;
            this.fermerModalOffre();
            this.afficherMessage('Offre mise à jour avec succès', 'success');
          },
          error: (error) => {
            console.error('❌ Erreur mise à jour offre:', error);
            this.isSubmitting = false;
            this.afficherMessage('Erreur lors de la mise à jour', 'error');
          }
        })
      );
    } else {
      this.subscriptions.add(
        this.projectService.createProject(nouvelleOffre).subscribe({
          next: (offreCree) => {
            console.log('✅ Offre créée:', offreCree);
            this.offres.unshift(offreCree);
            this.appliquerFiltres();
            this.calculerStatistiques();
            this.isSubmitting = false;
            this.fermerModalOffre();
            this.afficherMessage('Offre créée avec succès', 'success');
          },
          error: (error) => {
            console.error('❌ Erreur création offre:', error);
            console.error('Détails erreur:', error.error);
            this.isSubmitting = false;
            this.afficherMessage('Erreur lors de la création: ' + (error.message || 'Erreur serveur'), 'error');
          }
        })
      );
    }
  }

  soumettrePourValidation(offre: Project): void {
    if (!offre.id || !this.peutSoumettre(offre)) {
      this.afficherMessage('Cette offre ne peut pas être soumise.', 'error');
      return;
    }

    // Le statut est déjà 'en_attente' à la création
    // Cette méthode n'est plus nécessaire avec les nouveaux statuts
    this.afficherMessage('L\'offre est déjà en attente de validation', 'info');
  }

  validerOffre(offre: Project): void {
    if (!offre.id || !this.peutValider(offre)) {
      this.afficherMessage('Cette offre ne peut pas être validée.', 'error');
      return;
    }

    this.subscriptions.add(
      this.projectService.validerProjet(offre.id).subscribe({
        next: (offreMiseAJour) => {
          const index = this.offres.findIndex(o => o.id === offre.id);
          if (index !== -1) {
            this.offres[index] = offreMiseAJour;
          }
          this.appliquerFiltres();
          this.calculerStatistiques();
          this.afficherMessage('Offre validée et publiée', 'success');
        },
        error: (error) => {
          console.error('Erreur validation offre:', error);
          this.afficherMessage('Erreur lors de la validation', 'error');
        }
      })
    );
  }

  annulerOffre(offre: Project): void {
    if (!offre.id || !this.peutAnnuler(offre)) {
      this.afficherMessage('Cette offre ne peut pas être annulée.', 'error');
      return;
    }

    const confirmation = confirm('Êtes-vous sûr de vouloir annuler cette offre ?');
    if (!confirmation) return;

    this.subscriptions.add(
      this.projectService.cloturerProjet(offre.id).subscribe({
        next: (offreMiseAJour) => {
          const index = this.offres.findIndex(o => o.id === offre.id);
          if (index !== -1) {
            this.offres[index] = offreMiseAJour;
          }
          this.appliquerFiltres();
          this.calculerStatistiques();
          this.afficherMessage('Offre clôturée', 'success');
        },
        error: (error) => {
          console.error('Erreur clôture offre:', error);
          this.afficherMessage('Erreur lors de la clôture', 'error');
        }
      })
    );
  }

  confirmerSuppression(): void {
    if (!this.offreASupprimer?.id) return;

    this.subscriptions.add(
      this.projectService.deleteProject(this.offreASupprimer.id).subscribe({
        next: () => {
          this.offres = this.offres.filter(o => o.id !== this.offreASupprimer?.id);
          this.appliquerFiltres();
          this.calculerStatistiques();
          this.fermerModalSuppression();
          this.afficherMessage('Offre supprimée', 'success');
        },
        error: (error) => {
          console.error('Erreur suppression offre:', error);
          this.fermerModalSuppression();
          this.afficherMessage('Erreur lors de la suppression', 'error');
        }
      })
    );
  }

  // ===== MÉTHODES UTILITAIRES =====
  private marquerChampsCommeTouches(): void {
    Object.keys(this.offreForm.controls).forEach(key => {
      this.offreForm.get(key)?.markAsTouched();
    });
  }

  private afficherMessage(message: string, type: 'success' | 'error' | 'info'): void {
    alert(`${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message}`);
  }

  // ===== GETTERS POUR LE TEMPLATE =====
  getStatutBadgeClass(statut: ProjectStatus): string {
    return ProjectWorkflow.getStatusClass(statut);
  }

  getStatutText(statut: ProjectStatus): string {
    return ProjectWorkflow.getStatusLabel(statut);
  }

  getDomaineIcon(domaine: string): string {
    const icons: { [key: string]: string } = {
      'Éducation': 'fa-graduation-cap',
      'Santé': 'fa-heart-pulse',
      'Agriculture': 'fa-tractor',
      'Environnement': 'fa-leaf',
      'Développement Communautaire': 'fa-hands-helping',
      'Technologie': 'fa-laptop-code',
      'Gouvernance': 'fa-landmark',
      'Culture': 'fa-theater-masks',
      'Eau et Assainissement': 'fa-faucet-drip',
      'Énergie': 'fa-bolt',
      'Autre': 'fa-ellipsis-h'
    };
    return icons[domaine] || 'fa-briefcase';
  }

  getProgressionOffre(offre: Project): number {
    // Progression simplifiée avec 3 statuts
    const steps: Record<ProjectStatus, number> = {
      'en_attente': 33,
      'actif': 66,
      'cloture': 100
    };
    return steps[offre.statutProjet] || 0;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'Non définie';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  }

  getNombrePostesRestants(offre: Project): number {
    return Math.max(0, offre.nombreVolontairesRequis - (offre.nombreVolontairesActuels || 0));
  }

  // ===== PERMISSIONS =====
  peutModifier(offre: Project): boolean {
    return ProjectWorkflow.canBeEdited(offre.statutProjet) && this.peutCreerOffres;
  }

  peutSupprimer(offre: Project): boolean {
    return offre.statutProjet === 'en_attente' && this.peutCreerOffres;
  }

  peutSoumettre(offre: Project): boolean {
    // Plus nécessaire avec les nouveaux statuts
    return false;
  }

  peutValider(offre: Project): boolean {
    return offre.statutProjet === 'en_attente' && this.peutCreerOffres;
  }

  peutAnnuler(offre: Project): boolean {
    // On peut clôturer si le projet est en_attente ou actif
    return (offre.statutProjet === 'en_attente' || offre.statutProjet === 'actif') && this.peutCreerOffres;
  }

  // ===== MÉTHODE POUR VUE DÉTAILLÉE =====
  voirDetails(offre: Project): void {
    console.log('Voir détails offre:', offre.id);
    
    if (!offre.id) {
      console.error('❌ Offre sans ID');
      this.afficherMessage('Impossible d\'accéder aux détails: offre sans ID', 'error');
      return;
    }
    
    this.router.navigate(['/partenaires/offres-mission', offre.id]);
  }

  // ===== MÉTHODE DE DÉBOGAGE =====
  debugUserInfo(): void {
    console.log('=== 🔍 DÉBOGAGE UTILISATEUR ===');
    console.log('currentUser:', this.currentUser);
    console.log('currentUserId:', this.currentUserId, 'type:', typeof this.currentUserId);
    console.log('peutCreerOffres:', this.peutCreerOffres);
    console.log('Rôle utilisateur:', this.currentUser?.role);
    console.log('localStorage userData:', localStorage.getItem('userData'));
    console.log('localStorage userRole:', localStorage.getItem('userRole'));
    console.log('AuthService.getCurrentUser():', this.authService.getCurrentUser());
    console.log('===========================');
  }

  debugFormData(): void {
    console.log('=== 🔍 DÉBOGAGE FORMULAIRE ===');
    console.log('Valeurs formulaire:', this.offreForm.value);
    console.log('Statut formulaire:', this.offreForm.status);
    console.log('Champs invalides:', 
      Object.keys(this.offreForm.controls)
        .filter(key => this.offreForm.get(key)?.invalid)
        .map(key => ({ champ: key, erreurs: this.offreForm.get(key)?.errors }))
    );
    console.log('===========================');
  }

  // ===== FILTRES STATUT =====
  getStatusOptions(): Array<{ value: ProjectStatus | 'tous', label: string }> {
    return [
      { value: 'tous', label: 'Tous les statuts' },
      { value: 'en_attente', label: 'En attente' },
      { value: 'actif', label: 'Actif' },
      { value: 'cloture', label: 'Clôturé' }
    ];
  }
}