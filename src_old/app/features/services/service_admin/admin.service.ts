// src/app/core/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environment/environment';

export interface CreateAdminRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
}

export interface Admin {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  dateCreation: string;
  actif: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admins`;
  private superAdminCache: Admin | null = null;

  constructor(private http: HttpClient) {}

  /**
   * 🔍 Récupérer tous les administrateurs
   */
  getAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>(this.apiUrl).pipe(
      tap(admins => {
        // Mettre à jour le cache du SUPER_ADMIN
        this.superAdminCache = admins.find(admin => admin.role === 'SUPER_ADMIN') || null;
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des admins:', error);
        return throwError(() => new Error('Impossible de charger la liste des administrateurs'));
      })
    );
  }

  /**
   * 🔍 Récupérer l'admin connecté (simulation)
   */
  getCurrentAdmin(): Observable<Admin | null> {
    return this.getAdmins().pipe(
      map(admins => admins.find(admin => admin.role === 'SUPER_ADMIN') || null),
      catchError(error => {
        console.error('❌ Erreur récupération admin courant:', error);
        return throwError(() => new Error('Impossible de récupérer les informations de l\'administrateur'));
      })
    );
  }

  /**
   * ➕ Créer un nouvel administrateur
   */
  createAdmin(adminData: CreateAdminRequest): Observable<Admin> {
    console.log('👤 Création admin:', adminData.email);
    
    return this.getAdmins().pipe(
      switchMap(admins => {
        // Validation: SUPER_ADMIN unique
        if (adminData.role === 'SUPER_ADMIN' && this.superAdminCache) {
          throw new Error('Un Super Administrateur existe déjà dans le système');
        }

        // Validation: Email unique
        const emailExists = admins.some(admin => 
          admin.email.toLowerCase() === adminData.email.toLowerCase()
        );
        
        if (emailExists) {
          throw new Error('Un administrateur avec cet email existe déjà');
        }

        const newAdmin = {
          ...adminData,
          id: this.generateId(),
          dateCreation: new Date().toISOString(),
          actif: true
        };

        return this.http.post<Admin>(this.apiUrl, newAdmin).pipe(
          tap(() => console.log('✅ Admin créé avec succès'))
        );
      }),
      catchError(error => {
        console.error('❌ Erreur création admin:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 🔄 Activer/Désactiver un admin
   */
  toggleAdminStatus(adminId: number, actif: boolean): Observable<Admin> {
    console.log(`🔄 Modification statut admin ${adminId}: ${actif ? 'actif' : 'inactif'}`);
    
    return this.http.patch<Admin>(`${this.apiUrl}/${adminId}`, { actif }).pipe(
      tap(() => console.log('✅ Statut admin mis à jour')),
      catchError(error => {
        console.error('❌ Erreur modification statut admin:', error);
        return throwError(() => new Error('Impossible de modifier le statut de l\'administrateur'));
      })
    );
  }

  /**
   * 🗑️ Supprimer un admin
   */
  deleteAdmin(adminId: number): Observable<void> {
    console.log(`🗑️ Suppression admin ${adminId}`);
    
    return this.http.delete<void>(`${this.apiUrl}/${adminId}`).pipe(
      tap(() => console.log('✅ Admin supprimé avec succès')),
      catchError(error => {
        console.error('❌ Erreur suppression admin:', error);
        return throwError(() => new Error('Impossible de supprimer l\'administrateur'));
      })
    );
  }

  /**
   * ✏️ Mettre à jour un admin
   */
  updateAdmin(adminId: number, adminData: Partial<Admin>): Observable<Admin> {
    console.log(`✏️ Mise à jour admin ${adminId}`);
    
    return this.http.patch<Admin>(`${this.apiUrl}/${adminId}`, adminData).pipe(
      tap(() => console.log('✅ Admin mis à jour avec succès')),
      catchError(error => {
        console.error('❌ Erreur mise à jour admin:', error);
        return throwError(() => new Error('Impossible de mettre à jour l\'administrateur'));
      })
    );
  }

  /**
   * 🔍 Vérifier si un SUPER_ADMIN existe
   */
  hasSuperAdmin(): Observable<boolean> {
    return this.getAdmins().pipe(
      map(admins => admins.some(admin => admin.role === 'SUPER_ADMIN'))
    );
  }

  /**
   * 🔍 Récupérer un admin par ID
   */
  getAdminById(id: number): Observable<Admin | undefined> {
    return this.getAdmins().pipe(
      map(admins => admins.find(admin => admin.id === id)),
      catchError(error => {
        console.error('❌ Erreur récupération admin par ID:', error);
        return throwError(() => new Error('Impossible de récupérer l\'administrateur'));
      })
    );
  }

  /**
   * 🔧 Générer un ID temporaire
   */
  private generateId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }
}