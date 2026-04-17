// src/app/core/directives/has-permission-advanced.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription, of, combineLatest } from 'rxjs';
import { map, catchError, take, startWith } from 'rxjs/operators';
import { PermissionService } from '../../features/services/permission.service';
import { PartenaireService } from '../../features/services/service_parten/partenaire.service';
import { Partenaire } from '../../features/models/partenaire.model';

interface CurrentUser {
  id?: number;
  partenaireId?: number;
  role: string;
  nomStructure?: string;
  estActive?: boolean;
  compteActive?: boolean;
  typeStructures?: string[];
}

@Directive({
  selector: '[appHasPermissionAdvanced]',
  standalone: true
})
export class HasPermissionAdvancedDirective implements OnInit, OnDestroy {
  @Input() appHasPermissionAdvanced!: string | string[];
  @Input() appHasPermissionPartenaireId?: number;
  @Input() appHasPermissionRequireAll: boolean = false; // true = ET logique, false = OU logique

  private partenaire: Partenaire | null = null;
  private subscription: Subscription = new Subscription();

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService,
    private partenaireService: PartenaireService
  ) {}

  ngOnInit(): void {
    this.loadPartenaireAndCheckPermissions().subscribe({
      next: (hasPermission: boolean) => {
        this.updateView(hasPermission);
      },
      error: (error: any) => {
        console.error('Erreur vérification permissions:', error);
        this.updateView(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadPartenaireAndCheckPermissions(): Observable<boolean> {
    const partenaireId = this.appHasPermissionPartenaireId || this.getCurrentPartenaireId();
    
    if (!partenaireId) {
      return of(false);
    }

    return this.partenaireService.getById(partenaireId).pipe(
      take(1),
      map((partenaire: Partenaire) => {
        this.partenaire = partenaire;
        return this.checkPermissions(partenaire);
      }),
      catchError((error: any) => {
        console.error('Erreur récupération partenaire:', error);
        return of(false);
      })
    );
  }

  private checkPermissions(partenaire: Partenaire): boolean {
    // Vérifier si le compte est actif
    const estActif = partenaire.estActive || partenaire.compteActive;
    if (!estActif) {
      return false;
    }

    // Gérer les permissions multiples
    if (Array.isArray(this.appHasPermissionAdvanced)) {
      if (this.appHasPermissionRequireAll) {
        // ET logique : toutes les permissions requises
        return this.appHasPermissionAdvanced.every(permission => 
          this.checkSinglePermission(partenaire, permission)
        );
      } else {
        // OU logique : au moins une permission requise
        return this.appHasPermissionAdvanced.some(permission => 
          this.checkSinglePermission(partenaire, permission)
        );
      }
    } else {
      // Permission unique
      return this.checkSinglePermission(partenaire, this.appHasPermissionAdvanced);
    }
  }

  private checkSinglePermission(partenaire: Partenaire, permission: string): boolean {
    const validation = this.permissionService.validerAcces(partenaire, permission);
    return validation.autorise;
  }

  private updateView(hasPermission: boolean): void {
    this.viewContainer.clear();
    
    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }

  private getCurrentPartenaireId(): number | null {
    try {
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        const user: CurrentUser = JSON.parse(userData);
        
        if (user.partenaireId) {
          return Number(user.partenaireId);
        }
        if (user.id && user.role === 'partenaire') {
          return Number(user.id);
        }
      }
      return null;
    } catch (error) {
      console.error('Erreur lecture données utilisateur:', error);
      return null;
    }
  }
}