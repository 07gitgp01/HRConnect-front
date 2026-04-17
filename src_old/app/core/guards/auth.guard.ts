import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../../features/services/service_auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> | boolean {
    const requiredRoles = route.data['roles'] as string[];
    
    console.log('=== 🛡️ AUTH GUARD DÉCLENCHÉ ===');
    console.log('Rôles requis:', requiredRoles);
    
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        console.log('Utilisateur connecté:', user);
        
        if (!user) {
          console.log('❌ Non connecté - redirection login');
          this.router.navigate(['/login']);
          return false;
        }

        if (requiredRoles && requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.includes(user.role);
          console.log(`Rôle actuel: "${user.role}", Accès: ${hasRequiredRole}`);
          
          if (!hasRequiredRole) {
            console.log('🚫 Rôle insuffisant - redirection home');
            this.router.navigate(['/home']);
            return false;
          }
        }

        console.log('✅ AuthGuard - Accès autorisé');
        return true;
      })
    );
  }
}