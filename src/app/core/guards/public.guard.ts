// src/app/core/guards/public.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../../features/services/service_auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PublicGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user) {
          // ✅ Utilisateur déjà connecté - redirection vers le dashboard approprié
          this.redirectToDashboard(user.role);
          return false;
        }
        // ❌ Utilisateur non connecté - accès autorisé aux pages publiques
        return true;
      })
    );
  }

  /**
   * Redirige vers le dashboard selon le rôle
   */
  private redirectToDashboard(role: string): void {
    switch (role) {
      case 'admin':
        this.router.navigate(['/features/admin']);
        break;
      case 'partenaire':
        this.router.navigate(['/features/partenaires']);
        break;
      case 'candidat':
        this.router.navigate(['/features/candidats']);
        break;
      default:
        this.router.navigate(['/features']);
    }
  }
}