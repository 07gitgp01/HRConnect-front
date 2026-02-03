// src/app/core/layout/header/header.component.ts
import { Component, signal, OnInit, inject, Output, EventEmitter, OnDestroy, Input } from '@angular/core';
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
  userRole = signal<'candidat' | 'partenaire' | 'admin' | null>(null);
  userInitials = signal<string>('');
  currentRoute = signal<string>(''); // Signal pour suivre la route actuelle

  private authService = inject(AuthService);
  private router = inject(Router);
  private authSubscription!: Subscription; 
  private routerSubscription!: Subscription; // Abonnement aux changements de route

  // ✅ CORRECTION : Changer le nom de l'Output pour correspondre au template
  @Output() toggleMenu = new EventEmitter<void>();
  @Input() isMobile = false;

  ngOnInit(): void {
    // Initialiser la route actuelle
    this.currentRoute.set(this.router.url);
    
    // S'abonner aux changements d'authentification
    this.authSubscription = this.authService.currentUser$.subscribe((user: User | Partenaire | any | null) => {
      this.updateUserInfo(user);
    });
    
    // S'abonner aux changements de route
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
      this.userRole.set(user.role as 'candidat' | 'partenaire' | 'admin');
      this.userInitials.set(this.generateInitials(displayedName));
    } else {
      this.clearUserInfo();
    }
  }

  private getDisplayName(user: User | Partenaire | any): string {
    if (!user) return 'Utilisateur';
    
    if (user.role === 'candidat') {
      const candidat = user as User;
      return candidat.prenom && candidat.nom 
        ? `${candidat.prenom} ${candidat.nom}`
        : candidat.username || 'Candidat';
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

  // Méthodes pour vérifier les routes actives (utilisées dans le template)
  isActiveRoute(route: string): boolean {
    return this.currentRoute() === route;
  }
  
  isActiveRouteStartsWith(route: string): boolean {
    return this.currentRoute().startsWith(route);
  }
  
  // Méthode pour les routes complexes (avec sous-routes)
  isActiveForRole(route: string): boolean {
    const current = this.currentRoute();
    const role = this.userRole();
    
    switch(role) {
      case 'candidat':
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
    switch (role) {
      case 'candidat':
        this.router.navigate(['/features/candidats/profil']);
        break;
      case 'partenaire':
        this.router.navigate(['/features/partenaires/profil']);
        break;
      case 'admin':
        this.router.navigate(['/features/admin/profil']);
        break;
      default:
        this.router.navigate(['/login']);
    }
  }

  // ✅ CORRECTION : S'assurer que la méthode est bien appelée
  onToggleMenu(): void {
    console.log('Toggle menu clicked'); // Pour debug
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