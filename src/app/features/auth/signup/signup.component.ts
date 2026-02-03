import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/service_auth/auth.service';
import { VolontaireService } from '../../services/service_volont/volontaire.service';
import { User } from '../../models/user.model';
import { Volontaire } from '../../models/volontaire.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-signup',
  standalone: true,
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  imports: [ReactiveFormsModule, CommonModule, RouterModule]
})
export class SignupComponent implements OnInit, OnDestroy {
  signupForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  private subscriptions: Subscription = new Subscription();

  // Pour la validation de l'âge (18 ans minimum)
  private readonly MIN_AGE = 18;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private volontaireService: VolontaireService,
    private router: Router
  ) {
    this.signupForm = this.createSignupForm();
  }

  ngOnInit(): void {
    // Vérifier si l'utilisateur est déjà connecté
    if (this.authService.isLoggedIn()) {
      const role = this.authService.getUserRole();
      this.redirectByRole(role);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private createSignupForm(): FormGroup {
    return this.fb.group({
      // Informations personnelles
      nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      prenom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      dateNaissance: ['', [Validators.required, this.ageValidator.bind(this)]],
      sexe: ['', [Validators.required]],
      nationalite: ['Burkinabè', [Validators.required]],
      
      // Compte
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmerMotDePasse: ['', [Validators.required]],
      consentementPolitique: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmerMotDePasse');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    }
    return null;
  }

  private ageValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) return null;

    const birthDate = new Date(control.value);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= this.MIN_AGE ? null : { tooYoung: true };
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.markFormGroupTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = this.signupForm.value;

    // 1️⃣ Créer le User CANDIDAT
    const userData: User = {
      username: formData.username.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: 'candidat',
      prenom: formData.prenom.trim(),
      nom: formData.nom.trim(),
      telephone: formData.telephone,
      profilComplete: false,
      date_inscription: new Date().toISOString()
    };

    console.log('📝 Tentative d\'inscription User:', userData);

    const signupSubscription = this.authService.signup(userData).subscribe({
      next: (user) => {
        console.log('✅ User créé:', user);
        
        // 2️⃣ Créer le profil Volontaire lié
        this.createVolontaireProfile(formData, user.id!);
      },
      error: (error) => {
        this.handleSignupError(error);
      }
    });

    this.subscriptions.add(signupSubscription);
  }

  private createVolontaireProfile(formData: any, userId: string | number): void {
    const volontaireData: Volontaire = {
      nom: formData.nom,
      prenom: formData.prenom,
      email: formData.email.toLowerCase(),
      telephone: formData.telephone,
      dateNaissance: formData.dateNaissance,
      sexe: formData.sexe,
      nationalite: formData.nationalite,
      statut: 'Candidat',
      dateInscription: new Date().toISOString(),
      userId: userId,
      competences: [],
      regionGeographique: '',
      motivation: '',
      disponibilite: 'Temps plein'
      // typePiece et numeroPiece seront complétés plus tard
    };

    console.log('📋 Création profil Volontaire:', volontaireData);

    const volontaireSubscription = this.volontaireService.createVolontaire(volontaireData).subscribe({
      next: (volontaire) => {
        console.log('✅ Volontaire créé:', volontaire);
        
        // 3️⃣ Mettre à jour le User avec le volontaireId
        this.updateUserWithVolontaireId(userId, volontaire.id!);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Erreur création volontaire:', error);
        this.errorMessage = 'Erreur lors de la création du profil volontaire. Veuillez contacter l\'administrateur.';
        
        // ⚠️ Supprimer le User créé si le Volontaire échoue
        this.authService.deleteUser(userId).subscribe();
      }
    });

    this.subscriptions.add(volontaireSubscription);
  }

  private updateUserWithVolontaireId(userId: string | number, volontaireId: string | number): void {
    const updateSubscription = this.authService.updateUserVolontaireId(userId, volontaireId).subscribe({
      next: (updatedUser) => {
        this.isLoading = false;
        console.log('✅ User mis à jour avec volontaireId:', updatedUser);
        
        this.successMessage = '✅ Inscription réussie ! Vous pouvez maintenant vous connecter et compléter votre profil.';
        
        // Redirection après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { 
              message: 'inscription_reussie',
              email: updatedUser.email 
            }
          });
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Erreur mise à jour user:', error);
        this.successMessage = 'Inscription partiellement réussie. Veuillez vous connecter et compléter votre profil.';
        
        // Redirection malgré l'erreur
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      }
    });

    this.subscriptions.add(updateSubscription);
  }

  private handleSignupError(error: any): void {
    this.isLoading = false;
    console.error('❌ Erreur inscription:', error);
    
    if (error.status === 409) {
      this.errorMessage = 'Cet email ou nom d\'utilisateur est déjà utilisé.';
    } else if (error.status === 400) {
      this.errorMessage = 'Données invalides. Vérifiez les champs.';
    } else if (error.message?.includes('candidats')) {
      this.errorMessage = 'Seuls les candidats peuvent s\'inscrire via ce formulaire.';
    } else {
      this.errorMessage = 'Erreur lors de l\'inscription. Veuillez réessayer.';
    }
    
    // Réinitialiser les mots de passe pour la sécurité
    this.signupForm.get('password')?.reset();
    this.signupForm.get('confirmerMotDePasse')?.reset();
  }

  private redirectByRole(role: string | null): void {
    switch (role) {
      case 'admin':
        this.router.navigate(['/features/admin/']);
        break;
      case 'partenaire':
        this.router.navigate(['/features/partenaires/']);
        break;
      case 'candidat':
        this.router.navigate(['/features/candidats/']);
        break;
      default:
        this.router.navigate(['/']);
        break;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signupForm.controls).forEach(key => {
      const control = this.signupForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getters pour le template
  get nom() { return this.signupForm.get('nom'); }
  get prenom() { return this.signupForm.get('prenom'); }
  get email() { return this.signupForm.get('email'); }
  get telephone() { return this.signupForm.get('telephone'); }
  get dateNaissance() { return this.signupForm.get('dateNaissance'); }
  get sexe() { return this.signupForm.get('sexe'); }
  get nationalite() { return this.signupForm.get('nationalite'); }
  get username() { return this.signupForm.get('username'); }
  get password() { return this.signupForm.get('password'); }
  get confirmerMotDePasse() { return this.signupForm.get('confirmerMotDePasse'); }
  get consentementPolitique() { return this.signupForm.get('consentementPolitique'); }

  // Méthodes pour les messages d'erreur
  getDateNaissanceErrorMessage(): string {
    if (this.dateNaissance?.hasError('required')) {
      return 'La date de naissance est requise';
    }
    if (this.dateNaissance?.hasError('tooYoung')) {
      return `Vous devez avoir au moins ${this.MIN_AGE} ans pour vous inscrire`;
    }
    return '';
  }

  getPasswordErrorMessage(): string {
    if (this.password?.hasError('required')) {
      return 'Le mot de passe est requis';
    }
    if (this.password?.hasError('minlength')) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    return '';
  }

  getEmailErrorMessage(): string {
    if (this.email?.hasError('required')) {
      return 'L\'email est requis';
    }
    if (this.email?.hasError('email')) {
      return 'Format d\'email invalide';
    }
    return '';
  }

  getTelephoneErrorMessage(): string {
    if (this.telephone?.hasError('required')) {
      return 'Le téléphone est requis';
    }
    if (this.telephone?.hasError('pattern')) {
      return 'Le téléphone doit contenir exactement 8 chiffres';
    }
    return '';
  }
}