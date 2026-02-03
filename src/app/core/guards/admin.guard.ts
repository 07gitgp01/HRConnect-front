import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../../features/services/service_auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    console.log('=== 🛡️ ADMIN GUARD DÉCLENCHÉ ===');
    console.log('📍 URL actuelle:', window.location.href);
    
    // Vérifications complètes
    const isLoggedIn = this.authService.isLoggedIn();
    const userRole = this.authService.getUserRole();
    const isAdmin = this.authService.isAdmin();
    const currentUser = this.authService.getCurrentUser();
    
    console.log('🔍 État complet:');
    console.log('- isLoggedIn():', isLoggedIn);
    console.log('- getUserRole():', userRole);
    console.log('- isAdmin():', isAdmin);
    console.log('- CurrentUser:', currentUser);
    
    // Vérifier le localStorage directement
    const storedUserData = localStorage.getItem('userData');
    const storedUserRole = localStorage.getItem('userRole');
    console.log('💾 localStorage:');
    console.log('- userData:', storedUserData);
    console.log('- userRole:', storedUserRole);

    if (isAdmin) {
      console.log('✅ AdminGuard - Accès autorisé');
      return true;
    } else {
      console.log('❌ AdminGuard - Accès refusé, redirection vers home');
      console.log('🔄 Tentative de récupération de l\'état...');
      
      // Essayer de récupérer l'état
      this.tryRecoverAuthState();
      
      this.router.navigate(['/home']);
      return false;
    }
  }

  private tryRecoverAuthState(): void {
    console.log('🔄 Tentative de récupération de l\'état auth...');
    
    const storedUserData = localStorage.getItem('userData');
    const storedUserRole = localStorage.getItem('userRole');
    
    if (storedUserData && storedUserRole) {
      try {
        const user = JSON.parse(storedUserData);
        console.log('🔍 Données trouvées dans localStorage:');
        console.log('- Rôle:', user.role);
        console.log('- Données complètes:', user);
        
        // ✅ CORRECTION : Vérifier avec tous les formats
        const adminRoles = [
          'admin'  // ✅ SEULEMENT 'admin' maintenant
        ];
        const shouldBeAdmin = adminRoles.includes(user.role);
        console.log('🤔 Devrait être admin?:', shouldBeAdmin);
        console.log('🎯 Rôles acceptés:', adminRoles);
        
        if (shouldBeAdmin) {
          console.log('⚠️  Problème: Les données sont dans localStorage mais AuthService ne les voit pas!');
          console.log('💡 Solution: Vérifiez que le rôle dans db.json est cohérent');
        }
      } catch (error) {
        console.error('💥 Erreur parsing userData:', error);
      }
    } else {
      console.log('📭 Aucune donnée dans localStorage');
    }
  }
}