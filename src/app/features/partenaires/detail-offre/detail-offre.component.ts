// src/app/features/partenaires/detail-offre/detail-offre.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Project, ProjectStatus, ProjectWorkflow } from '../../models/projects.model';
import { ProjectService } from '../../services/service_projects/projects.service';
import { AuthService } from '../../services/service_auth/auth.service';
import { Subscription } from 'rxjs';
import { Volontaire } from '../../models/volontaire.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-detail-offre',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './detail-offre.component.html',
  styleUrls: ['./detail-offre.component.scss']
})
export class DetailOffreComponent implements OnInit, OnDestroy {
  // Offre/projet
  offre: Project | null = null;
  offreId: string | null = null;
  
  // États
  isLoading = true;
  isSubmitting = false;
  erreurChargement = '';
  
  // Utilisateur
  currentUserId: string | null = null;
  currentUser: any = null;
  peutCreerOffres = false;
  estAdmin = false;
  
  // Données associées
  volontairesAffectes: any[] = [];
  candidatures: any[] = [];
  volontairesDisponibles: Volontaire[] = [];
  
  // Modal d'affectation
  showModalAffectation = false;
  showModalCandidatures = false;
  selectedVolontaireId: string | null = null;
  
  // Formulaires
  commentaireForm!: FormGroup;
  affectationForm!: FormGroup;
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private projectService: ProjectService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.chargerUtilisateur();
    this.route.paramMap.subscribe(params => {
      this.offreId = params.get('id');
      if (this.offreId) {
        this.chargerOffre();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initForms(): void {
    this.commentaireForm = this.fb.group({
      commentaire: ['', [Validators.required, Validators.minLength(10)]]
    });

    this.affectationForm = this.fb.group({
      volontaireId: ['', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: [''],
      commentaire: ['']
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
    this.currentUserId = user.id?.toString() || null;
    
    // Vérifier les permissions
    this.estAdmin = this.authService.isAdmin();
    const userRole = user.role?.toString().toLowerCase().trim() || '';
    this.peutCreerOffres = ['partenaire', 'admin'].some(role => userRole.includes(role));
  }

  chargerOffre(): void {
    if (!this.offreId) return;

    this.isLoading = true;
    
    this.subscriptions.add(
      this.projectService.getProject(this.offreId).subscribe({
        next: (offre) => {
          this.offre = offre;
          this.chargerDonneesAssociees();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement offre:', error);
          this.erreurChargement = 'Erreur lors du chargement de l\'offre.';
          this.isLoading = false;
        }
      })
    );
  }

  private chargerDonneesAssociees(): void {
    if (!this.offreId) return;

    // Charger les volontaires affectés (accessible à tous)
    this.subscriptions.add(
      this.projectService.getVolontairesByProject(this.offreId).subscribe({
        next: (volontaires) => {
          this.volontairesAffectes = volontaires;
        },
        error: (error) => {
          console.error('Erreur chargement volontaires:', error);
        }
      })
    );

    // Charger les candidatures (POUR ADMIN SEULEMENT)
    if (this.estAdmin) {
      this.subscriptions.add(
        this.projectService.getCandidaturesByProject(this.offreId).subscribe({
          next: (candidatures) => {
            this.candidatures = candidatures;
          },
          error: (error) => {
            console.error('Erreur chargement candidatures:', error);
          }
        })
      );
    }

    // Charger les volontaires disponibles (POUR ADMIN SEULEMENT)
    if (this.estAdmin) {
      this.subscriptions.add(
        this.projectService.getVolontairesDisponibles().subscribe({
          next: (volontaires) => {
            this.volontairesDisponibles = volontaires;
          },
          error: (error) => {
            console.error('Erreur chargement volontaires disponibles:', error);
          }
        })
      );
    }
  }

  // ===== ACTIONS SUR L'OFFRE =====
  soumettrePourValidation(): void {
    if (!this.offre?.id) return;

    // Avec les nouveaux statuts, les offres sont automatiquement "en_attente"
    this.afficherMessage('L\'offre est déjà en attente de validation', 'info');
  }

  validerOffre(): void {
    if (!this.offre?.id || !this.estAdmin) return;

    this.subscriptions.add(
      this.projectService.validerProjet(this.offre.id).subscribe({
        next: (offreMiseAJour) => {
          this.offre = offreMiseAJour;
          this.afficherMessage('Offre validée et publiée', 'success');
        },
        error: (error) => {
          console.error('Erreur validation:', error);
          this.afficherMessage('Erreur lors de la validation', 'error');
        }
      })
    );
  }

  mettreEnCours(): void {
    if (!this.offre?.id) return;

    // Avec les nouveaux statuts, pas de séparation "mettre en cours"
    this.afficherMessage('Le projet est déjà actif', 'info');
  }

  cloturerOffre(): void {
    if (!this.offre?.id || !this.estAdmin) return;

    const confirmation = confirm('Êtes-vous sûr de vouloir clôturer cette offre ?');
    if (!confirmation) return;

    this.subscriptions.add(
      this.projectService.cloturerProjet(this.offre.id).subscribe({
        next: (offreMiseAJour) => {
          this.offre = offreMiseAJour;
          this.afficherMessage('Offre clôturée', 'success');
        },
        error: (error) => {
          console.error('Erreur clôture:', error);
          this.afficherMessage('Erreur lors de la clôture', 'error');
        }
      })
    );
  }

  annulerOffre(): void {
    if (!this.offre?.id || !this.peutCreerOffres) return;

    const confirmation = confirm('Êtes-vous sûr de vouloir annuler cette offre ?');
    if (!confirmation) return;

    this.subscriptions.add(
      this.projectService.cloturerProjet(this.offre.id).subscribe({
        next: (offreMiseAJour) => {
          this.offre = offreMiseAJour;
          this.afficherMessage('Offre annulée', 'success');
        },
        error: (error) => {
          console.error('Erreur annulation:', error);
          this.afficherMessage('Erreur lors de l\'annulation', 'error');
        }
      })
    );
  }

  // ===== GESTION DES VOLONTAIRES =====
  ouvrirModalAffectation(): void {
    if (!this.estAdmin) {
      this.afficherMessage('Seuls les administrateurs peuvent affecter des volontaires.', 'error');
      return;
    }

    if (this.offre?.statutProjet !== 'actif') {
      this.afficherMessage('Les volontaires ne peuvent être affectés qu\'aux offres publiées.', 'error');
      return;
    }

    this.showModalAffectation = true;
    this.affectationForm.reset({
      dateDebut: new Date().toISOString().split('T')[0]
    });
  }

  fermerModalAffectation(): void {
    this.showModalAffectation = false;
    this.selectedVolontaireId = null;
    this.affectationForm.reset();
  }

  affecterVolontaire(): void {
    if (!this.offreId || !this.selectedVolontaireId || this.affectationForm.invalid) return;

    this.isSubmitting = true;
    
    this.subscriptions.add(
      this.projectService.affecterVolontaire(this.offreId, this.selectedVolontaireId).subscribe({
        next: (resultat) => {
          console.log('Volontaire affecté:', resultat);
          this.chargerDonneesAssociees();
          this.chargerOffre();
          this.fermerModalAffectation();
          this.isSubmitting = false;
          this.afficherMessage('Volontaire affecté avec succès', 'success');
        },
        error: (error) => {
          console.error('Erreur affectation:', error);
          this.isSubmitting = false;
          this.afficherMessage('Erreur lors de l\'affectation', 'error');
        }
      })
    );
  }

  retirerVolontaire(affectationId: string): void {
    if (!this.offreId || !this.estAdmin) {
      this.afficherMessage('Action non autorisée', 'error');
      return;
    }

    const confirmation = confirm('Êtes-vous sûr de vouloir retirer ce volontaire ?');
    if (!confirmation) return;

    this.subscriptions.add(
      this.projectService.retirerVolontaire(this.offreId, affectationId).subscribe({
        next: () => {
          this.chargerDonneesAssociees();
          this.chargerOffre();
          this.afficherMessage('Volontaire retiré avec succès', 'success');
        },
        error: (error) => {
          console.error('Erreur retrait:', error);
          this.afficherMessage('Erreur lors du retrait', 'error');
        }
      })
    );
  }

  // ===== GESTION DES CANDIDATURES =====
  ouvrirModalCandidatures(): void {
    this.showModalCandidatures = true;
  }

  fermerModalCandidatures(): void {
    this.showModalCandidatures = false;
  }

  traiterCandidature(candidatureId: string, action: 'accepter' | 'refuser'): void {
    // SEUL L'ADMIN PEUT TRAITER LES CANDIDATURES
    if (!this.estAdmin) {
      this.afficherMessage('Seuls les administrateurs peuvent traiter les candidatures.', 'error');
      return;
    }

    const confirmation = confirm(`Êtes-vous sûr de vouloir ${action === 'accepter' ? 'accepter' : 'refuser'} cette candidature ?`);
    if (!confirmation) return;

    // Ici, vous devriez appeler un service pour traiter la candidature
    console.log(`Traiter candidature ${candidatureId}: ${action}`);
    this.afficherMessage(`Candidature ${action === 'accepter' ? 'acceptée' : 'refusée'}`, 'success');
    
    // Après traitement, recharger les données
    this.chargerDonneesAssociees();
  }

  // ===== MÉTHODES UTILITAIRES =====
  private afficherMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: type === 'success' ? ['success-snackbar'] : 
                  type === 'error' ? ['error-snackbar'] : ['info-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
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

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'Non définie';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  }

  formatDateTime(dateStr?: string): string {
    if (!dateStr) return 'Non définie';
    try {
      return new Date(dateStr).toLocaleString('fr-FR');
    } catch {
      return dateStr;
    }
  }

  getNombrePostesRestants(): number {
    if (!this.offre) return 0;
    return Math.max(0, this.offre.nombreVolontairesRequis - (this.offre.nombreVolontairesActuels || 0));
  }

  getProgressionOffre(): number {
    if (!this.offre) return 0;
    // Progression simplifiée avec 3 statuts
    const steps: Record<ProjectStatus, number> = {
      'en_attente': 33,
      'actif': 66,
      'cloture': 100
    };
    return steps[this.offre.statutProjet] || 0;
  }

  // ===== PERMISSIONS =====
  peutModifier(): boolean {
    if (!this.offre) return false;
    return this.offre.statutProjet === 'en_attente' && this.peutCreerOffres;
  }

  peutSoumettre(): boolean {
    // Plus nécessaire avec les nouveaux statuts
    return false;
  }

  peutAnnuler(): boolean {
    if (!this.offre) return false;
    // Le partenaire peut demander l'annulation si l'offre est en_attente ou actif
    return (this.offre.statutProjet === 'en_attente' || this.offre.statutProjet === 'actif') && this.peutCreerOffres;
  }

  peutValider(): boolean {
    if (!this.offre) return false;
    return this.offre.statutProjet === 'en_attente' && this.estAdmin;
  }

  peutMettreEnCours(): boolean {
    // Avec les nouveaux statuts, pas de séparation "mettre en cours"
    return false;
  }

  peutCloturer(): boolean {
    if (!this.offre) return false;
    // Seul l'admin peut clôturer (le partenaire peut seulement demander l'annulation)
    return this.estAdmin && (this.offre.statutProjet === 'en_attente' || this.offre.statutProjet === 'actif');
  }

  // ===== NAVIGATION =====
  retourListe(): void {
    this.router.navigate(['/features/partenaires/offres-mission']);
  }

  modifierOffre(): void {
    if (this.offre?.id) {
      this.router.navigate(['/features/partenaires/offres-mission/editer', this.offre.id]);
    }
  }

  // Méthodes pour parser les listes
  getCompetencesList(competencesString: string): string[] {
    if (!competencesString) return [];
    return competencesString.split(/[,;\n]/)
      .map(c => c.trim())
      .filter(c => c.length > 0);
  }

  getAvantagesList(avantagesString: string): string[] {
    if (!avantagesString) return [];
    return avantagesString.split(/[,;\n]/)
      .map(a => a.trim())
      .filter(a => a.length > 0);
  }
}