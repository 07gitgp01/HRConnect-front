// src/app/core/guards/partenaire-actif.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';
import { PartenaireService } from '../../features/services/service_parten/partenaire.service';
import { NotificationService } from '../../features/services/service_notif/notification.service';
import { AuthService } from '../../features/services/service_auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PartenaireActifGuard implements CanActivate {
  
  constructor(
    private partenaireService: PartenaireService,
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    console.log('🔐 PartenaireActifGuard - Vérification activation partenaire');
    
    // Vérifier d'abord si l'utilisateur est connecté et est un partenaire
    if (!this.authService.isLoggedIn() || !this.authService.isPartenaire()) {
      console.error('❌ Utilisateur non connecté ou non partenaire');
      this.redirectToLogin();
      return of(false);
    }

    const currentUser = this.authService.getCurrentUser();
    console.log('👤 Utilisateur connecté:', currentUser);

    if (!currentUser || !currentUser.email) {
      console.error('❌ Données utilisateur incomplètes');
      this.redirectToLogin();
      return of(false);
    }

    // Rechercher le partenaire par email
    return this.partenaireService.getPartenaireByEmail(currentUser.email).pipe(
      take(1),
      map((partenaire: any) => {
        console.log('🔍 Partenaire trouvé:', partenaire);
        
        if (!partenaire) {
          console.error('❌ Partenaire non trouvé dans la base de données');
          this.notification.error('Compte partenaire introuvable');
          this.redirectToLogin();
          return false;
        }

        // Vérifier si le compte est activé
        if (!partenaire.estActive && !partenaire.compteActive) {
          console.error('❌ Compte partenaire non activé');
          this.notification.error('Votre compte partenaire n\'est pas encore activé. Veuillez contacter l\'administrateur.');
          this.router.navigate(['/features/partenaires/compte-en-attente']);
          return false;
        }

        console.log('✅ Compte partenaire activé - Accès autorisé');
        return true;
      }),
      catchError((error: any) => {
        console.error('💥 Erreur vérification partenaire:', error);
        this.notification.error('Erreur de vérification du compte');
        this.redirectToLogin();
        return of(false);
      })
    );
  }

  private redirectToLogin(): void {
    this.router.navigate(['/login']);
  }
}