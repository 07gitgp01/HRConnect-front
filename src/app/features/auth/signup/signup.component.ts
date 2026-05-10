import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
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

  private readonly MIN_AGE = 18;
  typePieceSelectionne: 'CNIB' | 'PASSEPORT' = 'CNIB';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private volontaireService: VolontaireService,
    private router: Router
  ) {
    this.signupForm = this.createSignupForm();
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const role = this.authService.getUserRole();
      this.redirectByRole(role);
    }
    this.setupTypePieceListener();
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
      nationalite: ['', [Validators.required, Validators.minLength(2)]], // Plus pré‑rempli
      typePiece: ['CNIB', [Validators.required]],
      numeroPiece: ['', [Validators.required, this.numeroPieceValidator.bind(this)]],
      // Compte
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmerMotDePasse: ['', [Validators.required]],
      consentementPolitique: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private setupTypePieceListener(): void {
    this.signupForm.get('typePiece')?.valueChanges.subscribe((value: 'CNIB' | 'PASSEPORT') => {
      this.typePieceSelectionne = value;
      const numeroPieceControl = this.signupForm.get('numeroPiece');
      if (numeroPieceControl) {
        numeroPieceControl.setValue('');
        numeroPieceControl.updateValueAndValidity();
      }
    });
  }

  private numeroPieceValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return { required: true };
    const typePiece = this.signupForm?.get('typePiece')?.value;
    const numeroPiece = control.value.trim();
    if (typePiece === 'CNIB') {
      if (!/^[0-9]{17}$/.test(numeroPiece)) return { invalidCNIB: true };
    } else if (typePiece === 'PASSEPORT') {
      if (!/^[A-Z0-9]{6,9}$/.test(numeroPiece)) return { invalidPasseport: true };
    }
    return null;
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
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
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

    const userData: User = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: 'candidat',
      prenom: formData.prenom.trim(),
      nom: formData.nom.trim(),
      telephone: formData.telephone,
      dateNaissance: formData.dateNaissance,
      sexe: formData.sexe,
      nationalite: formData.nationalite.trim(),
      typePiece: formData.typePiece,
      numeroPiece: formData.numeroPiece.trim().toUpperCase(),
      profilComplete: false,
      date_inscription: new Date().toISOString()
    };

    console.log('📝 Inscription User:', { email: userData.email, nationalite: userData.nationalite });

    const signupSubscription = this.authService.signup(userData).subscribe({
      next: (user) => {
        console.log('✅ User créé:', user);
        this.createVolontaireProfile(formData, user);
      },
      error: (error) => this.handleSignupError(error)
    });
    this.subscriptions.add(signupSubscription);
  }

  private createVolontaireProfile(formData: any, user: User): void {
    const volontaireData: Volontaire = {
      nom: formData.nom,
      prenom: formData.prenom,
      email: formData.email.toLowerCase(),
      telephone: formData.telephone,
      dateNaissance: formData.dateNaissance,
      sexe: formData.sexe,
      nationalite: formData.nationalite.trim(),
      typePiece: formData.typePiece,
      numeroPiece: formData.numeroPiece.trim().toUpperCase(),
      statut: 'Candidat',
      dateInscription: new Date().toISOString(),
      userId: user.id,
      competences: [],
      regionGeographique: '',
      motivation: '',
      disponibilite: 'Temps plein'
    };

    const volontaireSubscription = this.volontaireService.createVolontaire(volontaireData).subscribe({
      next: (volontaire) => {
        console.log('✅ Volontaire créé:', volontaire);
        this.updateUserWithVolontaireId(user.id!, volontaire.id!);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Erreur création volontaire:', error);
        this.errorMessage = 'Erreur lors de la création du profil volontaire. Veuillez contacter l\'administrateur.';
        this.authService.deleteUser(user.id!).subscribe();
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
        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { message: 'inscription_reussie', email: updatedUser.email }
          });
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Erreur mise à jour user:', error);
        this.successMessage = 'Inscription partiellement réussie. Veuillez vous connecter et compléter votre profil.';
        setTimeout(() => this.router.navigate(['/login']), 3000);
      }
    });
    this.subscriptions.add(updateSubscription);
  }

  private handleSignupError(error: any): void {
    this.isLoading = false;
    console.error('❌ Erreur inscription:', error);
    if (error.status === 409) {
      this.errorMessage = 'Cet email ou numéro de pièce d\'identité est déjà utilisé.';
    } else if (error.status === 400) {
      this.errorMessage = 'Données invalides. Vérifiez les champs.';
    } else if (error.message?.includes('candidats')) {
      this.errorMessage = 'Seuls les candidats peuvent s\'inscrire via ce formulaire.';
    } else {
      this.errorMessage = 'Erreur lors de l\'inscription. Veuillez réessayer.';
    }
    this.signupForm.get('password')?.reset();
    this.signupForm.get('confirmerMotDePasse')?.reset();
  }

  private redirectByRole(role: string | null): void {
    switch (role) {
      case 'admin': this.router.navigate(['/features/admin/']); break;
      case 'partenaire': this.router.navigate(['/features/partenaires/']); break;
      case 'candidat': case 'volontaire': this.router.navigate(['/features/candidats/']); break;
      default: this.router.navigate(['/']);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signupForm.controls).forEach(key => {
      this.signupForm.get(key)?.markAsTouched();
    });
  }

  // Getters
  get nom() { return this.signupForm.get('nom'); }
  get prenom() { return this.signupForm.get('prenom'); }
  get email() { return this.signupForm.get('email'); }
  get telephone() { return this.signupForm.get('telephone'); }
  get dateNaissance() { return this.signupForm.get('dateNaissance'); }
  get sexe() { return this.signupForm.get('sexe'); }
  get nationalite() { return this.signupForm.get('nationalite'); }
  get typePiece() { return this.signupForm.get('typePiece'); }
  get numeroPiece() { return this.signupForm.get('numeroPiece'); }
  get password() { return this.signupForm.get('password'); }
  get confirmerMotDePasse() { return this.signupForm.get('confirmerMotDePasse'); }
  get consentementPolitique() { return this.signupForm.get('consentementPolitique'); }

  getDateNaissanceErrorMessage(): string {
    if (this.dateNaissance?.hasError('required')) return 'La date de naissance est requise';
    if (this.dateNaissance?.hasError('tooYoung')) return `Vous devez avoir au moins ${this.MIN_AGE} ans`;
    return '';
  }

  getPasswordErrorMessage(): string {
    if (this.password?.hasError('required')) return 'Le mot de passe est requis';
    if (this.password?.hasError('minlength')) return 'Le mot de passe doit contenir au moins 6 caractères';
    return '';
  }

  getEmailErrorMessage(): string {
    if (this.email?.hasError('required')) return 'L\'email est requis';
    if (this.email?.hasError('email')) return 'Format d\'email invalide';
    return '';
  }

  getTelephoneErrorMessage(): string {
    if (this.telephone?.hasError('required')) return 'Le téléphone est requis';
    if (this.telephone?.hasError('pattern')) return 'Le téléphone doit contenir exactement 8 chiffres';
    return '';
  }

  getNumeroPieceErrorMessage(): string {
    const ctrl = this.numeroPiece;
    if (!ctrl) return '';
    if (ctrl.hasError('required')) return this.typePieceSelectionne === 'CNIB' ? 'Le NIP CNIB est requis' : 'Le numéro de passeport est requis';
    if (ctrl.hasError('invalidCNIB')) return 'Le NIP CNIB doit contenir exactement 17 chiffres';
    if (ctrl.hasError('invalidPasseport')) return 'Le numéro de passeport doit contenir 6 à 9 caractères (lettres majuscules et chiffres)';
    return '';
  }

  getLabelNumeroPiece(): string {
    return this.typePieceSelectionne === 'CNIB' ? 'NIP CNIB (17 chiffres) *' : 'Numéro de Passeport *';
  }

  getPlaceholderNumeroPiece(): string {
    return this.typePieceSelectionne === 'CNIB' ? 'Ex: 12345678901234567' : 'Ex: AB123456';
  }

  onTypePieceChange(): void {
    const numeroPieceControl = this.signupForm.get('numeroPiece');
    if (numeroPieceControl) {
      numeroPieceControl.setValue('');
      numeroPieceControl.markAsUntouched();
    }
  }
}