// src/app/features/auth/components/login/login.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/service_auth/auth.service';
import { Subscription } from 'rxjs';
import { environment } from '../../environment/environment';

// 🔥 Import correct de l'environnement

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class LoginComponent implements OnInit, OnDestroy {
  errorMessage = '';
  isLoading = false;
  private queryParamsSubscription?: Subscription;
  private redirectAttempted = false;

  // 🔥 Nouvelles propriétés pour les fonctionnalités avancées
  showPassword = false;
  currentYear = new Date().getFullYear();
  appVersion = '1.0.0';
  
  // ✅ Utilisation correcte de l'environnement
  isProduction = environment.production;

  // ✅ Définition du formulaire avec rememberMe
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(1)]],
    rememberMe: [false] // Option "se souvenir de moi"
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      this.handleQueryParams(params);
    });

    this.checkExistingAuth();
  }

  ngOnDestroy(): void {
    this.queryParamsSubscription?.unsubscribe();
  }

  private checkExistingAuth(): void {
    if (this.redirectAttempted) return;
    
    if (this.auth.isLoggedIn()) {
      this.redirectAttempted = true;
      console.log('🔍 Utilisateur déjà connecté, redirection...');
      setTimeout(() => this.redirectByRole(), 100);
    }
  }

  private handleQueryParams(params: any): void {
    const message = params['message'];
    const logout = params['logout'];

    if (message === 'compte_desactive') {
      this.errorMessage = 'Votre compte partenaire a été désactivé. Veuillez contacter l\'administrateur.';
    } else if (message === 'session_expired') {
      this.errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
    } else if (message === 'unauthorized') {
      this.errorMessage = 'Accès non autorisé. Veuillez vous reconnecter.';
    }

    if (logout === 'true') {
      console.log('🚪 Déconnexion demandée via URL');
      this.auth.logout();
    }

    if (message || logout) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
    }
  }

  onSubmit(): void {
    this.redirectAttempted = false;

    if (this.loginForm.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs correctement.';
      this.markFormGroupTouched();
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    const email = this.loginForm.get('email')?.value?.trim().toLowerCase();
    const password = this.loginForm.get('password')?.value;

    if (!email || !password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      this.isLoading = false;
      return;
    }

    console.log('🔐 Tentative de connexion pour:', email);

    this.auth.login(email, password).subscribe({
      next: (user) => {
        this.isLoading = false;
        
        if (user) {
          console.log('✅ Connexion réussie pour:', user.role);
          this.redirectAttempted = true;
          this.redirectByRole();
        } else {
          this.errorMessage = 'Erreur inattendue lors de la connexion.';
          console.error('❌ User object is null after login');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Erreur connexion:', error);
        
        this.handleLoginError(error);
        this.loginForm.get('password')?.reset();
        
        setTimeout(() => {
          const emailField = document.getElementById('email');
          if (emailField) (emailField as HTMLInputElement).focus();
        }, 100);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  private handleLoginError(error: any): void {
    const errorMsg = error?.message || error?.error?.message || 'Erreur de connexion';
    
    if (errorMsg.includes('désactivé')) {
      this.errorMessage = errorMsg;
    } else if (errorMsg.includes('Email ou mot de passe incorrect')) {
      this.errorMessage = 'Email ou mot de passe incorrect.';
    } else if (error.status === 0) {
      this.errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    } else if (error.status === 500) {
      this.errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
    } else if (error.status === 404) {
      this.errorMessage = 'Service temporairement indisponible.';
    } else {
      this.errorMessage = 'Erreur de connexion. Veuillez réessayer.';
    }
  }

  private redirectByRole(): void {
    const role = this.auth.getUserRole();
    
    console.log('🔄 Redirection en cours pour le rôle:', role);
    
    setTimeout(() => {
      switch (role) {
        case 'admin':
        case 'super admin':
        case 'SUPER_ADMIN':
        case 'super_admin':
        case 'superAdmin':
        case 'super-admin':
          this.router.navigate(['/features/admin/']);
          break;
        case 'partenaire':
          this.verifyAndRedirectPartenaire();
          break;
        case 'candidat':
          this.router.navigate(['/features/candidats/']);
          break;
        default:
          console.warn('Rôle inconnu ou non défini:', role);
          this.router.navigate(['/home']);
          break;
      }
    }, 50);
  }

  private verifyAndRedirectPartenaire(): void {
    const user = this.auth.getCurrentUser();
    
    if (!user) {
      this.errorMessage = 'Erreur lors de la récupération des informations utilisateur.';
      this.auth.logout();
      return;
    }

    const partenaire = user as any;
    
    if (partenaire.estActive === false || partenaire.compteActive === false) {
      this.errorMessage = 'Votre compte partenaire a été désactivé. Veuillez contacter l\'administrateur.';
      this.auth.logout();
      
      this.router.navigate(['/login'], {
        queryParams: { message: 'compte_desactive' }
      });
      return;
    }
    
    this.router.navigate(['/features/partenaires/']);
  }

  /**
   * 🔥 NOUVELLE MÉTHODE : Basculer la visibilité du mot de passe
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    
    const passwordField = document.getElementById('password') as HTMLInputElement;
    if (passwordField) {
      passwordField.type = this.showPassword ? 'text' : 'password';
    }
  }

  /**
   * 🔥 NOUVELLE MÉTHODE : Remplissage automatique pour le développement
   */
  quickLogin(role: string): void {
    // 🔥 Vérifier que nous sommes en environnement de développement
    if (this.isProduction) {
      console.warn('⚠️  Quick login désactivé en production');
      return;
    }

    const testAccounts: { [key: string]: { email: string, password: string } } = {
      admin: { email: 'admin@pnvb.gov.bf', password: 'admin123' },
      candidat: { email: 'candidat@test.com', password: 'candidat123' },
      partenaire: { email: 'partenaire@test.com', password: 'partenaire123' }
    };

    const account = testAccounts[role];
    if (account) {
      this.loginForm.patchValue({
        email: account.email,
        password: account.password
      });
      console.log(`🔧 Remplissage automatique pour ${role}`);
      
      // Focus sur le bouton de connexion
      setTimeout(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitButton) submitButton.focus();
      }, 100);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  resetForm(): void {
    this.loginForm.reset();
    this.errorMessage = '';
    this.redirectAttempted = false;
    this.showPassword = false;
    
    // 🔥 Réinitialiser aussi le type du champ password
    const passwordField = document.getElementById('password') as HTMLInputElement;
    if (passwordField) {
      passwordField.type = 'password';
    }
  }

  // ✅ Getters pour le template
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
  get rememberMe() { return this.loginForm.get('rememberMe'); }

  getEmailErrorMessage(): string {
    if (this.email?.hasError('required')) {
      return 'L\'email est requis';
    }
    if (this.email?.hasError('email')) {
      return 'Format d\'email invalide';
    }
    return '';
  }

  getPasswordErrorMessage(): string {
    if (this.password?.hasError('required')) {
      return 'Le mot de passe est requis';
    }
    if (this.password?.hasError('minlength')) {
      return 'Le mot de passe ne peut pas être vide';
    }
    return '';
  }

  showFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }
}