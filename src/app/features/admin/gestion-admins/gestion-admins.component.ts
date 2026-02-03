// src/app/features/admin/gestion-admins/gestion-admins.component.ts
import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog/confirm-dialog.component';
import { Admin, AdminService, CreateAdminRequest } from '../../services/service_admin/admin.service';
import { NotificationService } from '../../services/service_notif/notification.service';
import { AuthService } from '../../services/service_auth/auth.service';

@Component({
  selector: 'app-gestion-admins',
  templateUrl: './gestion-admins.component.html',
  styleUrls: ['./gestion-admins.component.scss']
})
export class GestionAdminsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['nom', 'email', 'role', 'dateCreation', 'statut', 'actions'];
  dataSource = new MatTableDataSource<Admin>();

  adminForm: FormGroup;
  showForm = false;
  isSubmitting = false;
  isLoading = false;

  searchValue = '';
  roleFilter = 'TOUS';
  currentAdmin: Admin | null = null;
  superAdminExists = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private notification: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.adminForm = this.createAdminForm();
  }

  ngOnInit(): void {
    console.log('=== 🚀 INIT GESTION ADMINS ===');
    this.loadCurrentAdmin();
    this.loadAdmins();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = this.createFilter();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 📝 Créer le formulaire admin
   */
  createAdminForm(): FormGroup {
    return this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      prenom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      role: [{value: 'ADMIN', disabled: false}, Validators.required]
    });
  }

  /**
   * 🔍 Charger l'admin connecté
   */
  loadCurrentAdmin(): void {
    this.adminService.getCurrentAdmin()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (admin) => {
          this.currentAdmin = admin;
          console.log('👤 Admin connecté:', admin);
        },
        error: (error) => {
          console.error('❌ Erreur chargement admin courant:', error);
          this.notification.error('Erreur lors du chargement de votre profil');
        }
      });
  }

  /**
   * 🔍 Charger tous les admins
   */
  loadAdmins(): void {
    this.isLoading = true;
    this.adminService.getAdmins()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (admins: Admin[]) => {
          this.dataSource.data = admins;
          this.superAdminExists = admins.some(admin => admin.role === 'SUPER_ADMIN');
          this.updateRoleFieldState();
          this.isLoading = false;
          console.log(`✅ ${admins.length} administrateurs chargés`);
        },
        error: (error: any) => {
          this.notification.error('Erreur lors du chargement des administrateurs');
          console.error('❌ Erreur:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * 🔧 Mettre à jour l'état du champ rôle
   */
  private updateRoleFieldState(): void {
    const roleControl = this.adminForm.get('role');
    if (this.superAdminExists) {
      roleControl?.setValue('ADMIN');
      roleControl?.disable();
    } else {
      roleControl?.enable();
    }
  }

  /**
   * 📤 Soumettre le formulaire
   */
  onSubmit(): void {
    if (this.adminForm.valid) {
      this.isSubmitting = true;
      
      const adminData: CreateAdminRequest = {
        nom: this.nom?.value?.trim(),
        prenom: this.prenom?.value?.trim(),
        email: this.email?.value?.trim().toLowerCase(),
        password: this.password?.value,
        role: this.role?.value || 'ADMIN'
      };

      this.adminService.createAdmin(adminData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newAdmin: Admin) => {
            this.notification.success(`Administrateur ${newAdmin.prenom} ${newAdmin.nom} créé avec succès`);
            this.resetForm();
            this.loadAdmins();
          },
          error: (error: any) => {
            this.notification.error(error.message || 'Erreur lors de la création de l\'administrateur');
            console.error('❌ Erreur:', error);
          },
          complete: () => {
            this.isSubmitting = false;
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * 🔄 Réinitialiser le formulaire
   */
  private resetForm(): void {
    this.adminForm.reset({ role: 'ADMIN' });
    this.updateRoleFieldState();
  }

  /**
   * 🛡️ Vérifier les permissions
   */
  canModifyAdmin(admin: Admin): boolean {
    if (!this.currentAdmin) return false;
    
    if (this.currentAdmin.role === 'SUPER_ADMIN') {
      return true;
    }
    return this.currentAdmin.id === admin.id;
  }

  canDeleteAdmin(admin: Admin): boolean {
    if (!this.currentAdmin) return false;
    
    if (this.currentAdmin.role === 'SUPER_ADMIN') {
      return this.currentAdmin.id !== admin.id;
    }
    return false;
  }

  canToggleAdminStatus(admin: Admin): boolean {
    if (!this.currentAdmin) return false;
    
    if (this.currentAdmin.role === 'SUPER_ADMIN') {
      return this.currentAdmin.id !== admin.id;
    }
    return this.currentAdmin.id === admin.id;
  }

  /**
   * 🔄 Activer/Désactiver un admin
   */
  toggleAdminStatus(admin: Admin): void {
    if (!this.canToggleAdminStatus(admin)) {
      this.notification.error('Vous n\'avez pas les droits pour modifier ce compte');
      return;
    }

    const action = admin.actif ? 'désactiver' : 'activer';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: `Confirmer la ${action}`,
        message: `Êtes-vous sûr de vouloir ${action} l'administrateur ${admin.prenom} ${admin.nom} ?`,
        confirmText: action.toUpperCase(),
        cancelText: 'ANNULER',
        confirmColor: 'primary'
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.adminService.toggleAdminStatus(admin.id, !admin.actif)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.notification.success(`Administrateur ${action} avec succès`);
                this.loadAdmins();
              },
              error: (error: any) => {
                this.notification.error(`Erreur lors de la ${action} de l'administrateur`);
                console.error('❌ Erreur:', error);
              }
            });
        }
      });
  }

  /**
   * 🗑️ Supprimer un admin
   */
  deleteAdmin(admin: Admin): void {
    if (!this.canDeleteAdmin(admin)) {
      this.notification.error('Vous n\'avez pas les droits pour supprimer ce compte');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Supprimer l\'administrateur',
        message: `Êtes-vous sûr de vouloir supprimer définitivement l'administrateur ${admin.prenom} ${admin.nom} ? Cette action est irréversible.`,
        confirmText: 'SUPPRIMER',
        cancelText: 'ANNULER',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.adminService.deleteAdmin(admin.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.notification.success('Administrateur supprimé avec succès');
                this.loadAdmins();
              },
              error: (error: any) => {
                this.notification.error('Erreur lors de la suppression de l\'administrateur');
                console.error('❌ Erreur:', error);
              }
            });
        }
      });
  }

  /**
   * ✏️ Éditer un admin
   */
  editAdmin(admin: Admin): void {
    if (!this.canModifyAdmin(admin)) {
      this.notification.error('Vous n\'avez pas les droits pour modifier ce compte');
      return;
    }

    // TODO: Implémenter l'édition modal
    this.notification.info('Fonctionnalité d\'édition à implémenter');
    console.log('✏️ Édition admin:', admin);
  }

  /**
   * 🔍 Appliquer les filtres
   */
  applyFilter(): void {
    this.dataSource.filter = this.searchValue.trim().toLowerCase();
  }

  onRoleFilterChange(): void {
    this.dataSource.filterPredicate = this.createFilter();
    this.applyFilter();
  }

  createFilter(): (data: Admin, filter: string) => boolean {
    return (data: Admin, filter: string) => {
      const searchFilter = filter.toLowerCase();
      const matchesSearch = 
        data.nom.toLowerCase().includes(searchFilter) || 
        data.prenom.toLowerCase().includes(searchFilter) ||
        data.email.toLowerCase().includes(searchFilter);
      
      const matchesRole = this.roleFilter === 'TOUS' || data.role === this.roleFilter;
      
      return matchesSearch && matchesRole;
    };
  }

  /**
   * 📝 Marquer tous les champs comme touchés
   */
  markFormGroupTouched(): void {
    Object.keys(this.adminForm.controls).forEach(key => {
      this.adminForm.get(key)?.markAsTouched();
    });
  }

  /**
   * 🏷️ Getters pour l'affichage
   */
  getRoleDisplay(role: string): string {
    const roles: { [key: string]: string } = {
      'ADMIN': 'Administrateur',
      'SUPER_ADMIN': 'Super Admin'
    };
    return roles[role] || role;
  }

  getStatusDisplay(actif: boolean): string {
    return actif ? 'Actif' : 'Inactif';
  }

  /**
   * 📋 Afficher/Masquer le formulaire
   */
  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  /**
   * 🔧 Getters pour le template
   */
  get nom() { return this.adminForm.get('nom'); }
  get prenom() { return this.adminForm.get('prenom'); }
  get email() { return this.adminForm.get('email'); }
  get password() { return this.adminForm.get('password'); }
  get role() { return this.adminForm.get('role'); }

  /**
   * 🐛 Méthode de debug
   */
  debugInfo(): void {
    console.log('=== 🐛 DEBUG GESTION ADMINS ===');
    console.log('Current Admin:', this.currentAdmin);
    console.log('Super Admin Exists:', this.superAdminExists);
    console.log('Admins count:', this.dataSource.data.length);
    console.log('Form valid:', this.adminForm.valid);
    console.log('Form values:', this.adminForm.value);
  }
}