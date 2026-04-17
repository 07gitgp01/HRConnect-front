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

// ✅ ANIMATIONS ANGULAR
import { trigger, state, style, transition, animate } from '@angular/animations';

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
  styleUrls: ['./sidebar.component.scss'],

  // ✅ ANIMATION ACCORDÉON
  animations: [
    trigger('expandCollapse', [
      state('open', style({
        height: '*',
        opacity: 1,
        overflow: 'hidden'
      })),
      state('closed', style({
        height: '0px',
        opacity: 0,
        overflow: 'hidden'
      })),
      transition('open <=> closed', animate('250ms cubic-bezier(0.4, 0, 0.2, 1)')),
    ]),
  ],
})
export class SidebarComponent implements OnInit, OnDestroy {
  currentUser$!: Observable<any>; 
  newMessagesCount$!: Observable<number>;
  nouveauxRapportsCount$: Observable<number> = of(0);

  // ✅ ÉTAT DES GROUPES ACCORDÉON
  groupVolontairesOpen = false;
  groupRapportsOpen = false;

  private authService     = inject(AuthService);
  private contactService  = inject(ContactService);
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
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // ============================================================================
  // INITIALISATION
  // ============================================================================

  private initializeUserData(): void {
    this.currentUser$ = this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) return of(null);

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

  private initializeMessageMonitoring(): void {
    this.newMessagesCount$ = this.currentUser$.pipe(
      switchMap(user => {
        if (user?.role === 'admin') {
          return timer(0, 30000).pipe(
            switchMap(() => this.getNewMessagesCount())
          );
        }
        return of(0);
      })
    );
  }

  private loadPartenaireData(partenaireId: string | number): Observable<any> {
    return this.partenaireService.getById(partenaireId).pipe(
      map(partenaire => {
        console.log('📋 Données partenaire chargées pour sidebar:', partenaire);
        return partenaire || {};
      })
    );
  }

  private getNewMessagesCount(): Observable<number> {
    return this.contactService.getMessagesStats().pipe(
      map(stats => stats.new || 0),
      map(count => {
        if (count > 0) console.log(`📨 ${count} nouveau(x) message(s) non lu(s)`);
        return count;
      })
    );
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES POUR LE TEMPLATE
  // ============================================================================

  getRoleLabel(role: string): string {
    const roleLabels: { [key: string]: string } = {
      'admin':      'Administrateur',
      'candidat':   'Candidat',
      'partenaire': 'Partenaire'
    };
    return roleLabels[role] || role;
  }

  getPartenaireTypesDisplay(partenaireData: any): string {
    if (!partenaireData?.typeStructures || !Array.isArray(partenaireData.typeStructures)) {
      return 'Partenaire';
    }

    const typeLabels: { [key: string]: string } = {
      'Public-Administration': 'Admin. Publique',
      'Public-Collectivite':   'Collectivité',
      'SocieteCivile':         'Société Civile',
      'SecteurPrive':          'Secteur Privé',
      'PTF':                   'PTF',
      'InstitutionAcademique': 'Institution Acad.'
    };

    return partenaireData.typeStructures
      .map((type: string) => typeLabels[type] || type)
      .join(', ');
  }

  // ============================================================================
  // PERMISSIONS — dérivées du typeStructures si champ permissions absent en base
  // ============================================================================

  /**
   * ✅ CORRIGÉ : lit d'abord permissions en base, sinon dérive du typeStructures.
   * Structure d'accueil (tout sauf PTF) → peut créer des projets.
   */
  peutCreerProjets(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) return false;

    const permissions = user.partenaireData.permissions;
    if (permissions?.peutCreerProjets !== undefined) {
      return permissions.peutCreerProjets === true;
    }

    // Fallback : dériver du typeStructures
    const types: string[] = user.partenaireData.typeStructures || [];
    return types.length > 0 && types.some((t: string) => t !== 'PTF');
  }

  /**
   * ✅ CORRIGÉ : Structure d'accueil → peut gérer les volontaires.
   */
  peutGererVolontaires(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) return false;

    const permissions = user.partenaireData.permissions;
    if (permissions?.peutGererVolontaires !== undefined) {
      return permissions.peutGererVolontaires === true;
    }

    // Fallback : toutes les structures sauf PTF pur
    const types: string[] = user.partenaireData.typeStructures || [];
    return types.length > 0 && types.some((t: string) => t !== 'PTF');
  }

  /**
   * ✅ CORRIGÉ : PTF → peut voir les rapports.
   */
  peutVoirRapports(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) return false;

    const permissions = user.partenaireData.permissions;
    if (permissions?.peutVoirRapports !== undefined) {
      return permissions.peutVoirRapports === true;
    }

    // Fallback : uniquement PTF
    const types: string[] = user.partenaireData.typeStructures || [];
    return types.includes('PTF');
  }

  /**
   * ✅ CORRIGÉ : PTF → accès zone PTF.
   */
  aAccesZonePTF(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) return false;

    const permissions = user.partenaireData.permissions;
    if (permissions?.accesZonePTF !== undefined) {
      return permissions.accesZonePTF === true;
    }

    // Fallback : uniquement PTF
    const types: string[] = user.partenaireData.typeStructures || [];
    return types.includes('PTF');
  }

  /**
   * ✅ CORRIGÉ : vérifie si le partenaire est de type PTF.
   */
  estPTF(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) return false;
    const types: string[] = user.partenaireData.typeStructures || [];
    return types.includes('PTF');
  }

  /**
   * ✅ CORRIGÉ : structure d'accueil = partenaire avec au moins un type non-PTF.
   */
  estStructureAccueil(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData) return false;
    const types: string[] = user.partenaireData.typeStructures || [];
    return types.length > 0 && types.some((t: string) => t !== 'PTF');
  }

  /**
   * Vérifie si le partenaire a plusieurs types de structure.
   */
  aPlusieursTypes(user: any): boolean {
    if (user?.role !== 'partenaire' || !user.partenaireData?.typeStructures) return false;
    return user.partenaireData.typeStructures.length > 1;
  }

  /**
   * Vérifie s'il y a de nouveaux rapports depuis la dernière visite.
   */
  hasNewRapports(): boolean {
    const lastVisit = localStorage.getItem('lastRapportsVisit');
    if (!lastVisit) return true;
    return false;
  }

  /**
   * Déconnecte l'utilisateur.
   */
  logout(): void {
    this.authService.logout();
  }
}