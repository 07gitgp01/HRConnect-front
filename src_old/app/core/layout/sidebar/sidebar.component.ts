// src/app/core/layout/sidebar/sidebar.component.ts
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../features/services/service_auth/auth.service'; 
import { ContactService } from '../../../features/services/service_contact/contact.service';
import { PartenaireService } from '../../../features/services/service_parten/partenaire.service';
import { PermissionService } from '../../../features/services/permission.service';
import { Observable, map, switchMap, of, timer, Subscription } from 'rxjs';

// Modules Material
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    MatBadgeModule,
    MatChipsModule,
    AsyncPipe
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  currentUser$!: Observable<any>; 
  newMessagesCount$!: Observable<number>;
  
  private authService = inject(AuthService);
  private contactService = inject(ContactService);
  private partenaireService = inject(PartenaireService);
  private permissionService = inject(PermissionService);
  private refreshSubscription?: Subscription;

  constructor() {
    this.initializeUserData();
  }

  ngOnInit(): void {
    this.initializeMessageMonitoring();
  }

  ngOnDestroy(): void {
    // Nettoyer les abonnements
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  /**
   * Initialise les données utilisateur avec gestion des partenaires
   */
  private initializeUserData(): void {
    this.currentUser$ = this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return of(null);
        }
        
        if (user.role === 'partenaire' && user.id) {
          return this.loadPartenaireData(user.id).pipe(
            map(partenaireData => ({
              ...user,
              partenaireData: partenaireData
            }))
          );
        }
        
        return of(user);
      })
    );
  }

  /**
   * Initialise la surveillance des messages pour l'admin
   */
  private initializeMessageMonitoring(): void {
    this.newMessagesCount$ = this.currentUser$.pipe(
      switchMap(user => {
        if (user?.role === 'admin') {
          // Rafraîchir toutes les 30 secondes + au chargement initial
          return timer(0, 30000).pipe(
            switchMap(() => this.getNewMessagesCount())
          );
        }
        return of(0);
      })
    );
  }

  /**
   * Charge les données du partenaire avec gestion d'erreur
   */
  private loadPartenaireData(partenaireId: string | number): Observable<any> {
    return this.partenaireService.getById(partenaireId).pipe(
      map(partenaire => {
        console.log('📋 Données partenaire chargées pour sidebar:', partenaire);
        return partenaire;
      }),
      // En cas d'erreur, retourner un objet vide pour éviter de casser l'interface
      map(partenaire => partenaire || {})
    );
  }

  /**
   * Récupère le nombre de nouveaux messages non lus
   */
  private getNewMessagesCount(): Observable<number> {
    return this.contactService.getMessagesStats().pipe(
      map(stats => stats.new || 0),
      map(count => {
        if (count > 0) {
          console.log(`📨 ${count} nouveau(x) message(s) non lu(s)`);
        }
        return count;
      })
    );
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES POUR LE TEMPLATE
  // ============================================================================

  /**
   * Convertit le rôle technique en libellé lisible
   */
  getRoleLabel(role: string): string {
    const roleLabels: { [key: string]: string } = {
      'admin': 'Administrateur',
      'candidat': 'Candidat',
      'partenaire': 'Partenaire'
    };
    return roleLabels[role] || role;
  }

  /**
   * Affiche les types de structures du partenaire
   */
  getPartenaireTypesDisplay(partenaireData: any): string {
    if (!partenaireData?.typeStructures || !Array.isArray(partenaireData.typeStructures)) {
      return 'Partenaire';
    }
    
    const typeLabels: { [key: string]: string } = {
      'Public-Administration': 'Admin. Publique',
      'Public-Collectivite': 'Collectivité',
      'SocieteCivile': 'Société Civile',
      'SecteurPrive': 'Secteur Privé',
      'PTF': 'PTF',
      'InstitutionAcademique': 'Institution Acad.'
    };
    
    return partenaireData.typeStructures
      .map((type: string) => typeLabels[type] || type)
      .join(', ');
  }

  /**
   * Vérifie si l'utilisateur partenaire peut créer des projets
   */
  peutCreerProjets(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) {
      return false;
    }
    return this.permissionService.peutCreerProjets(user.partenaireData);
  }

  /**
   * Vérifie si l'utilisateur partenaire peut gérer les volontaires
   */
  peutGererVolontaires(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) {
      return false;
    }
    return this.permissionService.peutGererVolontaires(user.partenaireData);
  }

  /**
   * Vérifie si l'utilisateur partenaire peut voir les rapports
   */
  peutVoirRapports(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) {
      return false;
    }
    return this.permissionService.peutVoirRapports(user.partenaireData);
  }

  /**
   * Vérifie si l'utilisateur a accès à la zone PTF
   */
  aAccesZonePTF(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) {
      return false;
    }
    return this.permissionService.aAccesZonePTF(user.partenaireData);
  }

  /**
   * Vérifie si l'utilisateur est un PTF
   */
  estPTF(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) {
      return false;
    }
    return this.permissionService.estPTF(user.partenaireData);
  }

  /**
   * Vérifie si l'utilisateur est une Structure d'Accueil
   */
  estStructureAccueil(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) {
      return false;
    }
    return this.permissionService.estStructureAccueil(user.partenaireData);
  }

  /**
   * Vérifie si l'utilisateur a plusieurs types
   */
  aPlusieursTypes(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData?.typeStructures) {
      return false;
    }
    return user.partenaireData.typeStructures.length > 1;
  }

  /**
   * Déconnecte l'utilisateur
   */
  logout(): void {
    this.authService.logout();
  }
  // Pour le badge de nouveaux rapports (optionnel)
nouveauxRapportsCount$: Observable<number> = of(0);

// Ou pour un indicateur simple
hasNewRapports(): boolean {
  // Logique pour vérifier s'il y a de nouveaux rapports
  // Par exemple, stocker dans localStorage la date de dernière consultation
  const lastVisit = localStorage.getItem('lastRapportsVisit');
  if (!lastVisit) return true;
  
  const lastVisitDate = new Date(lastVisit);
  const today = new Date();
  
  // Vérifier s'il y a de nouveaux rapports depuis la dernière visite
  // Cela dépend de votre logique métier
  return false;
}
}