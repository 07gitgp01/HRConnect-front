// src/app/core/guards/partenaire-permission.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';
import { PermissionService } from '../../features/services/permission.service';
import { PartenaireService } from '../../features/services/service_parten/partenaire.service';
import { NotificationService } from '../../features/services/service_notif/notification.service';
import { Partenaire } from '../../features/models/partenaire.model';
import { AuthService } from '../../features/services/service_auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PartenairePermissionGuard implements CanActivate {
  
  constructor(
    private permissionService: PermissionService,
    private partenaireService: PartenaireService,
    private notification: NotificationService,
    private authService: AuthService, // ← AJOUT IMPORTANT
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const requiredPermission = route.data['permission'];
    
    console.log('🔐 PartenairePermissionGuard activé');
    console.log('📋 Permission requise:', requiredPermission);
    
    // Vérifier d'abord via AuthService (méthode recommandée)
    if (!this.authService.isLoggedIn() || !this.authService.isPartenaire()) {
      console.error('❌ Utilisateur non connecté ou non partenaire');
      this.redirectToLogin();
      return of(false);
    }

    // Récupérer l'email de l'utilisateur connecté
    const userEmail = this.getCurrentUserEmail();
    
    if (!userEmail) {
      console.error('❌ Aucun email utilisateur trouvé');
      this.redirectToLogin();
      return of(false);
    }

    console.log('📧 Recherche partenaire avec email:', userEmail);

    // Chercher le partenaire par email
    return this.partenaireService.getPartenaireByEmail(userEmail).pipe(
      take(1),
      map((partenaire: Partenaire | null) => {
        console.log('👤 Partenaire trouvé:', partenaire);
        
        if (!partenaire) {
          console.error('❌ Aucun partenaire trouvé pour cet email');
          this.notification.error('Aucun compte partenaire trouvé pour cet email');
          this.redirectToLogin();
          return false;
        }

        // Vérifier si le compte partenaire est activé
        if (!partenaire.estActive && !partenaire.compteActive) {
          console.error('❌ Compte partenaire non activé');
          this.notification.error('Votre compte partenaire n\'est pas encore activé. Veuillez contacter l\'administrateur.');
          this.router.navigate(['/features/partenaires/compte-en-attente']);
          return false;
        }

        console.log('✅ Compte activé, validation permission...');
        const validation = this.permissionService.validerAcces(partenaire, requiredPermission);
        
        console.log('📊 Résultat validation:', validation);
        
        if (!validation.autorise) {
          console.error('❌ Permission refusée:', validation.message);
          this.notification.error(validation.message || 'Accès non autorisé');
          this.redirectToDashboard(partenaire);
          return false;
        }

        console.log('✅ Accès autorisé !');
        return true;
      }),
      catchError((error: any) => {
        console.error('💥 Erreur recherche partenaire:', error);
        this.notification.error('Erreur de vérification des permissions');
        this.redirectToLogin();
        return of(false);
      })
    );
  }

  private getCurrentUserEmail(): string | null {
    try {
      // Méthode 1: Via AuthService (recommandée)
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && currentUser.email) {
        console.log('✅ Email trouvé via AuthService:', currentUser.email);
        return currentUser.email;
      }

      // Méthode 2: Via localStorage (fallback)
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('✅ Email trouvé via localStorage:', user.email);
        return user.email || null;
      }

      console.error('❌ Aucune donnée utilisateur trouvée');
      return null;
      
    } catch (error) {
      console.error('💥 Erreur lecture données utilisateur:', error);
      return null;
    }
  }

  private redirectToLogin(): void {
    this.router.navigate(['/login']);
  }

  private redirectToDashboard(partenaire: Partenaire): void {
    if (this.permissionService.estPTF(partenaire)) {
      this.router.navigate(['/features/partenaires/dashboard-ptf']);
    } else if (this.permissionService.estStructureAccueil(partenaire)) {
      this.router.navigate(['/features/partenaires/dashboard']);
    } else {
      this.router.navigate(['/features/partenaires']);
    }
  }
}