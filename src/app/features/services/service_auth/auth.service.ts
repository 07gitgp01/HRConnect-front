// src/app/features/services/service_auth/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, forkJoin, catchError, throwError, BehaviorSubject, of } from 'rxjs'; 
import { Router } from '@angular/router';
import { Partenaire } from '../../models/partenaire.model';
import { User, AdminUser, AuthenticatedUser } from '../../models/user.model'; 

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthenticatedUser>(null);
  public currentUser$ = this.currentUserSubject.asObservable(); 

  private partenairesUrl = 'http://localhost:3000/partenaires';
  private usersUrl = 'http://localhost:3000/users';
  private adminUrl = 'http://localhost:3000/admins'; 

  constructor(
    private http: HttpClient, 
    private router: Router
  ) {
    this.restoreUserFromStorage();
  }

  /**
   * 🔄 Restaurer l'utilisateur depuis le localStorage
   */
  private restoreUserFromStorage(): void {
    const userData = localStorage.getItem('userData');
    const userRole = localStorage.getItem('userRole');
    
    if (userData && userRole) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        console.log('🔐 Utilisateur restauré depuis storage:', user.role);
      } catch (error) {
        console.error('Erreur restauration utilisateur:', error);
        this.clearStorage();
      }
    }
  }

  /**
   * 🔐 CONNEXION - Recherche dans tous les types d'utilisateurs
   */
  login(email: string, password: string): Observable<AuthenticatedUser> {
    console.log('=== 🔐 TENTATIVE DE CONNEXION ===');
    console.log('Email:', email);
    
    return forkJoin({
      partenaires: this.http.get<Partenaire[]>(this.partenairesUrl).pipe(catchError(() => of([]))),
      users: this.http.get<User[]>(this.usersUrl).pipe(catchError(() => of([]))),
      admins: this.http.get<AdminUser[]>(this.adminUrl).pipe(catchError(() => of([])))
    }).pipe(
      map(data => {
        console.log('=== 🔍 RECHERCHE UTILISATEUR ===');
        console.log('Admins trouvés:', data.admins);
        console.log('Users trouvés:', data.users);
        console.log('Partenaires trouvés:', data.partenaires);

        // 1. Recherche parmi les candidats (users)
        const candidat = data.users.find(u => 
          (u.email === email || u.username === email) && u.password === password
        );
        if (candidat) {
          console.log('✅ Candidat trouvé:', candidat);
          return candidat;
        }

        // 2. Recherche parmi les partenaires
        const partenaire = data.partenaires.find(p => 
          p.email === email && p.motDePasseTemporaire === password
        );
        if (partenaire) {
          console.log('✅ Partenaire trouvé:', partenaire);
          // Vérifier si le compte partenaire est actif
          if (partenaire.estActive === false || partenaire.compteActive === false) {
            throw new Error('Votre compte partenaire a été désactivé. Veuillez contacter l\'administrateur.');
          }
          return partenaire;
        }

        // 3. Recherche parmi les administrateurs
        const admin = data.admins.find(a => 
          (a.email === email || a.username === email) && a.password === password
        );
        if (admin) {
          console.log('✅ Admin trouvé:', admin);
          console.log('🔐 Rôle admin:', admin.role);
          return admin;
        }

        console.log('❌ Aucun utilisateur trouvé avec ces identifiants');
        throw new Error('Email ou mot de passe incorrect.');
      }),
      tap(user => {
        if (user) {
          this.currentUserSubject.next(user);
          localStorage.setItem('userRole', user.role);
          localStorage.setItem('userData', JSON.stringify(user));
          console.log('=== ✅ CONNEXION RÉUSSIE ===');
          console.log('Utilisateur connecté:', user);
          console.log('Rôle:', user.role);
          console.log('isAdmin():', this.isAdmin());
          console.log('isSuperAdmin():', this.isSuperAdmin());
        }
      }),
      catchError(err => {
        console.error('=== ❌ ERREUR CONNEXION ===', err);
        this.currentUserSubject.next(null);
        this.clearStorage();
        return throwError(() => err);
      })
    );
  }

  /**
   * 📝 INSCRIPTION - UNIQUEMENT pour les candidats
   */
  signup(userData: User): Observable<User> {
    console.log('📝 Inscription nouveau candidat:', userData.email);
    
    // ✅ Forcer le rôle candidat
    const candidatData = {
      ...userData,
      role: 'candidat' as const,
      date_inscription: new Date().toISOString(),
      profilComplete: false
    };

    return this.http.post<User>(this.usersUrl, candidatData);
  }

  /**
   * 👤 CRÉATION ADMIN - Réservé aux administrateurs techniques
   */
  createAdmin(adminData: AdminUser): Observable<AdminUser> {
    console.log('👤 Création admin:', adminData.email);
    return this.http.post<AdminUser>(this.adminUrl, adminData);
  }

  /**
   * 🏢 CRÉATION PARTENAIRE - Réservé aux administrateurs
   */
  createPartenaire(partenaireData: Partenaire): Observable<Partenaire> {
    console.log('🏢 Création partenaire:', partenaireData.email);
    return this.http.post<Partenaire>(this.partenairesUrl, partenaireData);
  }

  /**
   * 🚪 DÉCONNEXION
   */
  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    console.log('Utilisateur avant déconnexion:', this.getCurrentUser());
    this.currentUserSubject.next(null);
    this.clearStorage();
    this.router.navigate(['/login']);
    console.log('✅ Déconnexion effectuée');
  }

  /**
   * 🧹 NETTOYAGE STORAGE
   */
  private clearStorage(): void {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    console.log('🧹 Storage nettoyé');
  }

  /**
   * 🔍 VÉRIFICATIONS D'AUTHENTIFICATION
   */
  isLoggedIn(): boolean {
    const isLogged = !!this.currentUserSubject.value;
    console.log('🔍 isLoggedIn():', isLogged);
    return isLogged;
  }

  getUserRole(): string | null {
    const role = this.currentUserSubject.value?.role || localStorage.getItem('userRole');
    console.log('🔍 getUserRole():', role);
    return role;
  }

  getCurrentUser(): AuthenticatedUser {
    const user = this.currentUserSubject.value;
    console.log('🔍 getCurrentUser():', user);
    return user;
  }

  /**
   * ✅ VÉRIFICATIONS DE RÔLES - CORRIGÉES
   */
  isCandidat(): boolean {
    const user = this.getCurrentUser();
    const isCandidat = user?.role === 'candidat';
    console.log('🎭 isCandidat():', isCandidat);
    return isCandidat;
  }

  isPartenaire(): boolean {
    const user = this.getCurrentUser();
    const isPartenaire = user?.role === 'partenaire';
    console.log('🎭 isPartenaire():', isPartenaire);
    return isPartenaire;
  }

  isAdmin(): boolean {
  const user = this.getCurrentUser();
  const userRole = user?.role;
  
  console.log('=== 🔍 VÉRIFICATION ADMIN ===');
  console.log('Utilisateur:', user);
  console.log('Rôle:', userRole);
  
  if (!user || !userRole) {
    console.log('❌ isAdmin(): false (non connecté ou rôle indéfini)');
    return false;
  }
  
  // ✅ ACCEPTER tous les formats de rôles admin
  const adminRoles = [
    'admin', 
    // 'super admin',     // minuscules avec espace
    // 'SUPER_ADMIN',     // majuscules avec underscore
    // 'super_admin',     // minuscules avec underscore
    // 'superAdmin',      // camelCase
    // 'super-admin'      // avec tiret
  ];
  
  const isAdmin = adminRoles.includes(userRole);
  
  console.log('✅ isAdmin():', isAdmin);
  console.log('🎯 Rôles acceptés:', adminRoles);
  return isAdmin;
}

isSuperAdmin(): boolean {
  const user = this.getCurrentUser();
  const userRole = user?.role;
  
  // ✅ CORRECTION : Vérifier que userRole n'est pas undefined
  if (!userRole) {
    console.log('🎭 isSuperAdmin(): false (rôle indéfini)');
    return false;
  }
  
  // ✅ ACCEPTER tous les formats de super admin
  const superAdminRoles = ['SUPER_ADMIN', 'super_admin', 'super admin', 'superAdmin', 'super-admin'];
  const isSuperAdmin = superAdminRoles.includes(userRole);
  
  console.log('🎭 isSuperAdmin():', isSuperAdmin);
  console.log('🎯 Rôles super admin acceptés:', superAdminRoles);
  return isSuperAdmin;
}

  /**
   * 🔧 MÉTHODES UTILITAIRES
   */
  getVolontaireId(): number | string | null {
    const user = this.getCurrentUser();
    if (user && this.isCandidat()) {
      const volontaireId = (user as User).volontaireId || null;
      console.log('🔧 getVolontaireId():', volontaireId);
      return volontaireId;
    }
    console.log('🔧 getVolontaireId(): null');
    return null;
  }

  getCurrentCandidat(): User | null {
    const user = this.getCurrentUser();
    const candidat = this.isCandidat() ? user as User : null;
    console.log('🔧 getCurrentCandidat():', candidat);
    return candidat;
  }

  /**
   * 🆔 Mettre à jour le volontaireId d'un User
   */
  updateUserVolontaireId(userId: number | string, volontaireId: number | string): Observable<User> {
    console.log(`🆔 Mise à jour volontaireId ${userId} -> ${volontaireId}`);
    return this.http.patch<User>(`${this.usersUrl}/${userId}`, {
      volontaireId: volontaireId
    }).pipe(
      catchError(error => {
        console.error(`❌ Erreur mise à jour volontaireId ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la mise à jour du profil'));
      })
    );
  }

  /**
   * 🗑️ Supprimer un User (en cas d'échec de l'inscription)
   */
  deleteUser(userId: number | string): Observable<void> {
    console.log(`🗑️ Suppression user ${userId}`);
    return this.http.delete<void>(`${this.usersUrl}/${userId}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur suppression user ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la suppression du compte'));
      })
    );
  }

  /**
   * 🔍 Récupérer un User par email
   */
  getUserByEmail(email: string): Observable<User[]> {
    console.log(`🔍 Recherche user par email: ${email}`);
    return this.http.get<User[]>(`${this.usersUrl}?email=${email.toLowerCase()}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur recherche user par email ${email}:`, error);
        return of([]);
      })
    );
  }

  /**
   * 🔄 Rafraîchir les données utilisateur
   */
  refreshUserData(): void {
    console.log('🔄 Rafraîchissement des données utilisateur');
    this.restoreUserFromStorage();
  }

  /**
   * 🎯 Vérifier les permissions (méthode utilitaire) - CORRIGÉE
   */
  hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    // ✅ CORRECTION : Vérifier que userRole n'est pas null/undefined
    const hasRole = userRole ? userRole === role : false;
    console.log(`🎯 hasRole("${role}"):`, hasRole);
    return hasRole;
  }

  /**
   * 📊 Obtenir tous les rôles disponibles
   */
  getAvailableRoles(): string[] {
    return ['candidat', 'partenaire', 'admin', 'super admin'];
  }

  /**
   * 🛡️ Vérifier les permissions avec multiple rôles - CORRIGÉE
   */
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    // ✅ CORRECTION : Vérifier que userRole n'est pas null/undefined
    const hasAnyRole = userRole ? roles.includes(userRole) : false;
    console.log(`🛡️ hasAnyRole(${JSON.stringify(roles)}):`, hasAnyRole);
    return hasAnyRole;
  }
}