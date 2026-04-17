// src/app/shared/components/header/header.component.ts

import { Component, signal, OnInit, inject, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { Subscription, filter } from 'rxjs';

import { AuthService } from '../../../features/services/service_auth/auth.service'; 
import { Partenaire } from '../../../features/models/partenaire.model';
import { User } from '../../../features/models/user.model';

// Importations Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu'; 
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    TitleCasePipe
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  username = signal<string | null>(null);
  userRole = signal<'candidat' | 'volontaire' | 'partenaire' | 'admin' | null>(null); // ✅ AJOUTER 'volontaire'
  userInitials = signal<string>('');
  currentRoute = signal<string>('');

  private authService = inject(AuthService);
  private router = inject(Router);
  private authSubscription!: Subscription; 
  private routerSubscription!: Subscription;

  @Output() toggleMenu = new EventEmitter<void>();

  ngOnInit(): void {
    this.currentRoute.set(this.router.url);
    
    this.authSubscription = this.authService.currentUser$.subscribe((user: User | Partenaire | any | null) => {
      this.updateUserInfo(user);
    });
    
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute.set(event.url);
      });
  }

  private updateUserInfo(user: User | Partenaire | any | null): void {
    if (user) {
      const displayedName = this.getDisplayName(user);
      this.username.set(displayedName);
      
      // ✅ Gérer tous les rôles possibles
      if (user.role === 'candidat' || user.role === 'volontaire' || user.role === 'partenaire' || user.role === 'admin') {
        this.userRole.set(user.role);
      } else {
        this.userRole.set(null);
      }
      
      this.userInitials.set(this.generateInitials(displayedName));
    } else {
      this.clearUserInfo();
    }
  }

  private getDisplayName(user: User | Partenaire | any): string {
    if (!user) return 'Utilisateur';
    
    // ✅ Traiter à la fois 'candidat' ET 'volontaire'
    if (user.role === 'candidat' || user.role === 'volontaire') {
      const candidat = user as User;
      return candidat.prenom && candidat.nom 
        ? `${candidat.prenom} ${candidat.nom}`
        : candidat.username || (user.role === 'candidat' ? 'Candidat' : 'Volontaire');
    } 
    
    if (user.role === 'partenaire') {
      const partenaire = user as Partenaire;
      return partenaire.nomStructure || partenaire.email || 'Partenaire';
    }
    
    if (user.role === 'admin') {
      return (user as any).username || 'Administrateur';
    }
    
    return 'Utilisateur';
  }

  private generateInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  private clearUserInfo(): void {
    this.username.set(null);
    this.userRole.set(null);
    this.userInitials.set('');
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute() === route;
  }
  
  isActiveRouteStartsWith(route: string): boolean {
    return this.currentRoute().startsWith(route);
  }
  
  isActiveForRole(route: string): boolean {
    const current = this.currentRoute();
    const role = this.userRole();
    
    switch(role) {
      case 'candidat':
      case 'volontaire': // ✅ AJOUTER volontaire
        return current.includes('/features/candidats' + route);
      case 'partenaire':
        return current.includes('/features/partenaires' + route);
      case 'admin':
        return current.includes('/features/admin' + route);
      default:
        return false;
    }
  }

  navigateToDashboard(): void {
    const role = this.userRole();
    switch (role) {
      case 'candidat':
      case 'volontaire': // ✅ AJOUTER volontaire
        this.router.navigate(['/features/candidats']);
        break;
      case 'partenaire':
        this.router.navigate(['/features/partenaires']);
        break;
      case 'admin':
        this.router.navigate(['/features/admin']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  navigateToProfil(): void {
    const role = this.userRole();
    console.log('🔍 Navigation vers profil, rôle:', role);
    
    switch (role) {
      case 'candidat':
      case 'volontaire': // ✅ AJOUTER volontaire - les deux vont vers le même profil
        this.router.navigate(['/features/candidats/profil']).then(success => {
          if (success) {
            console.log('✅ Navigation vers profil candidat/volontaire réussie');
          } else {
            console.error('❌ Échec navigation vers profil');
          }
        });
        break;
      case 'partenaire':
        this.router.navigate(['/features/partenaires/profil']);
        break;
      case 'admin':
        this.router.navigate(['/features/admin/profil']);
        break;
      default:
        console.warn('⚠️ Rôle non reconnu, redirection vers login');
        this.router.navigate(['/login']);
    }
  }

  onToggleMenu(): void {
    this.toggleMenu.emit();
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}