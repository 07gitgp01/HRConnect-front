// src/app/features/services/service_auth/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, forkJoin, catchError, throwError, BehaviorSubject, of } from 'rxjs'; 
import { Router } from '@angular/router';
import { Partenaire } from '../../models/partenaire.model';
import { User, AdminUser, AuthenticatedUser, isUser, isAdmin, isPartenaire } from '../../models/user.model'; 

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
        console.log('Admins trouvés:', data.admins.length);
        console.log('Users trouvés:', data.users.length);
        console.log('Partenaires trouvés:', data.partenaires.length);

        // 1. Recherche parmi les candidats/volontaires (users)
        const user = data.users.find(u => 
          (u.email === email || u.username === email) && u.password === password
        );
        if (user) {
          console.log('✅ Candidat/Volontaire trouvé:', user);
          console.log('   Rôle:', user.role);
          console.log('   VolontaireId:', user.volontaireId);
          return user;
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
          console.log('isCandidat():', this.isCandidat());
          console.log('isVolontaire():', this.isVolontaire());
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
   * Crée un compte avec role: 'candidat' par défaut
   */
  signup(userData: User): Observable<User> {
    console.log('📝 Inscription nouveau candidat:', userData.email);
    
    // ✅ Forcer le rôle candidat lors de l'inscription
    const candidatData: User = {
      ...userData,
      role: 'candidat', // ✅ TOUJOURS 'candidat' à l'inscription
      date_inscription: new Date().toISOString(),
      profilComplete: false,
      volontaireId: undefined // Sera défini après création du profil volontaire
    };

    return this.http.post<User>(this.usersUrl, candidatData).pipe(
      tap(user => console.log('✅ User créé avec succès:', user)),
      catchError(error => {
        console.error('❌ Erreur création user:', error);
        return throwError(() => new Error('Erreur lors de la création du compte'));
      })
    );
  }

  /**
   * 👤 CRÉATION ADMIN - Réservé aux administrateurs techniques
   */
  createAdmin(adminData: AdminUser): Observable<AdminUser> {
    console.log('👤 Création admin:', adminData.email);
    return this.http.post<AdminUser>(this.adminUrl, adminData).pipe(
      catchError(error => {
        console.error('❌ Erreur création admin:', error);
        return throwError(() => new Error('Erreur lors de la création de l\'admin'));
      })
    );
  }

  /**
   * 🏢 CRÉATION PARTENAIRE - Réservé aux administrateurs
   */
  createPartenaire(partenaireData: Partenaire): Observable<Partenaire> {
    console.log('🏢 Création partenaire:', partenaireData.email);
    return this.http.post<Partenaire>(this.partenairesUrl, partenaireData).pipe(
      catchError(error => {
        console.error('❌ Erreur création partenaire:', error);
        return throwError(() => new Error('Erreur lors de la création du partenaire'));
      })
    );
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
   * ✅ VÉRIFICATIONS DE RÔLES - CORRIGÉES avec type guards
   */
  
  /**
   * Vérifie si l'utilisateur actuel est un candidat
   * @returns true si role === 'candidat'
   */
  isCandidat(): boolean {
    const user = this.getCurrentUser();
    const isCandidat = user?.role === 'candidat';
    console.log('🎭 isCandidat():', isCandidat);
    return isCandidat;
  }

  /**
   * ✅ NOUVEAU: Vérifie si l'utilisateur actuel est un volontaire
   * @returns true si role === 'volontaire'
   */
  isVolontaire(): boolean {
    const user = this.getCurrentUser();
    const isVol = user?.role === 'volontaire';
    console.log('🎭 isVolontaire():', isVol);
    return isVol;
  }

  /**
   * ✅ NOUVEAU: Vérifie si l'utilisateur est candidat OU volontaire
   * Utile pour les pages accessibles aux deux
   * @returns true si role === 'candidat' || role === 'volontaire'
   */
  isCandidatOuVolontaire(): boolean {
    const user = this.getCurrentUser();
    const result = isUser(user); // Utilise le type guard du modèle
    console.log('🎭 isCandidatOuVolontaire():', result);
    return result;
  }

  isPartenaire(): boolean {
    const user = this.getCurrentUser();
    const isPart = user?.role === 'partenaire';
    console.log('🎭 isPartenaire():', isPart);
    return isPart;
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
      'super admin',
      'SUPER_ADMIN',
      'super_admin',
      'superAdmin',
      'super-admin'
    ];
    
    const isAdminUser = adminRoles.includes(userRole);
    
    console.log('✅ isAdmin():', isAdminUser);
    console.log('🎯 Rôles acceptés:', adminRoles);
    return isAdminUser;
  }

  isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    const userRole = user?.role;
    
    if (!userRole) {
      console.log('🎭 isSuperAdmin(): false (rôle indéfini)');
      return false;
    }
    
    // ✅ ACCEPTER tous les formats de super admin
    const superAdminRoles = ['SUPER_ADMIN', 'super_admin', 'super admin', 'superAdmin', 'super-admin'];
    const isSuperAdminUser = superAdminRoles.includes(userRole);
    
    console.log('🎭 isSuperAdmin():', isSuperAdminUser);
    console.log('🎯 Rôles super admin acceptés:', superAdminRoles);
    return isSuperAdminUser;
  }

  /**
   * 🔧 MÉTHODES UTILITAIRES
   */
  
  /**
   * Récupère l'ID du volontaire lié au user actuel
   * Fonctionne pour role === 'candidat' ET role === 'volontaire'
   */
  getVolontaireId(): number | string | null {
    const user = this.getCurrentUser();
    
    // ✅ CORRECTION: Accepte candidat ET volontaire
    if (user && isUser(user)) {
      const volontaireId = (user as User).volontaireId || null;
      console.log('🔧 getVolontaireId():', volontaireId);
      return volontaireId;
    }
    
    console.log('🔧 getVolontaireId(): null (pas un user candidat/volontaire)');
    return null;
  }

  /**
   * Récupère l'utilisateur actuel s'il est de type User (candidat ou volontaire)
   */
  getCurrentCandidat(): User | null {
    const user = this.getCurrentUser();
    
    // ✅ CORRECTION: Retourne le user s'il est candidat OU volontaire
    if (isUser(user)) {
      console.log('🔧 getCurrentCandidat():', user);
      return user as User;
    }
    
    console.log('🔧 getCurrentCandidat(): null');
    return null;
  }

  /**
   * 🆔 Mettre à jour le volontaireId d'un User
   * Appelé après la création du profil volontaire
   */
  updateUserVolontaireId(userId: number | string, volontaireId: number | string): Observable<User> {
    console.log(`🆔 Mise à jour volontaireId ${userId} -> ${volontaireId}`);
    return this.http.patch<User>(`${this.usersUrl}/${userId}`, {
      volontaireId: volontaireId,
      profilComplete: false // Le profil n'est pas encore complet
    }).pipe(
      tap(updatedUser => {
        // ✅ Mettre à jour l'utilisateur en session si c'est le même
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          this.currentUserSubject.next(updatedUser);
          localStorage.setItem('userData', JSON.stringify(updatedUser));
          console.log('✅ Session utilisateur mise à jour avec volontaireId');
        }
      }),
      catchError(error => {
        console.error(`❌ Erreur mise à jour volontaireId ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la mise à jour du profil'));
      })
    );
  }

  /**
   * ✅ NOUVEAU: Promouvoir un candidat en volontaire
   * Appelé par l'admin après validation du profil
   */
  promouvoirEnVolontaire(userId: number | string): Observable<User> {
    console.log(`🎓 Promotion candidat → volontaire: ${userId}`);
    return this.http.patch<User>(`${this.usersUrl}/${userId}`, {
      role: 'volontaire',
      profilComplete: true,
      updated_at: new Date().toISOString()
    }).pipe(
      tap(updatedUser => {
        // ✅ Mettre à jour la session si c'est l'utilisateur connecté
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          this.currentUserSubject.next(updatedUser);
          localStorage.setItem('userData', JSON.stringify(updatedUser));
          localStorage.setItem('userRole', 'volontaire');
          console.log('✅ Utilisateur promu en volontaire dans la session');
        }
      }),
      catchError(error => {
        console.error(`❌ Erreur promotion volontaire ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la promotion en volontaire'));
      })
    );
  }

  /**
   * ✅ NOUVEAU: Rétrograder un volontaire en candidat
   * Appelé si l'admin refuse le profil
   */
  retrograderEnCandidat(userId: number | string): Observable<User> {
    console.log(`⬇️ Rétrogradation volontaire → candidat: ${userId}`);
    return this.http.patch<User>(`${this.usersUrl}/${userId}`, {
      role: 'candidat',
      profilComplete: false,
      updated_at: new Date().toISOString()
    }).pipe(
      tap(updatedUser => {
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          this.currentUserSubject.next(updatedUser);
          localStorage.setItem('userData', JSON.stringify(updatedUser));
          localStorage.setItem('userRole', 'candidat');
          console.log('✅ Utilisateur rétrogradé en candidat dans la session');
        }
      }),
      catchError(error => {
        console.error(`❌ Erreur rétrogradation candidat ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la rétrogradation en candidat'));
      })
    );
  }

  /**
   * ✅ NOUVEAU: Marquer le profil comme complet
   */
  marquerProfilComplet(userId: number | string): Observable<User> {
    console.log(`✅ Marquage profil complet: ${userId}`);
    return this.http.patch<User>(`${this.usersUrl}/${userId}`, {
      profilComplete: true,
      updated_at: new Date().toISOString()
    }).pipe(
      tap(updatedUser => {
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          this.currentUserSubject.next(updatedUser);
          localStorage.setItem('userData', JSON.stringify(updatedUser));
          console.log('✅ Profil marqué comme complet dans la session');
        }
      }),
      catchError(error => {
        console.error(`❌ Erreur marquage profil complet ${userId}:`, error);
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
   * 🎯 Vérifier les permissions (méthode utilitaire)
   */
  hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    const hasRoleCheck = userRole ? userRole === role : false;
    console.log(`🎯 hasRole("${role}"):`, hasRoleCheck);
    return hasRoleCheck;
  }

  /**
   * 📊 Obtenir tous les rôles disponibles
   */
  getAvailableRoles(): string[] {
    return ['candidat', 'volontaire', 'partenaire', 'admin', 'super admin'];
  }

  /**
   * 🛡️ Vérifier les permissions avec multiple rôles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    const hasAnyRoleCheck = userRole ? roles.includes(userRole) : false;
    console.log(`🛡️ hasAnyRole(${JSON.stringify(roles)}):`, hasAnyRoleCheck);
    return hasAnyRoleCheck;
  }

  /**
   * ✅ NOUVEAU: Vérifier si l'utilisateur peut accéder à l'espace candidat
   * (candidat OU volontaire)
   */
  canAccessCandidatSpace(): boolean {
    return this.isCandidatOuVolontaire();
  }

  /**
   * ✅ NOUVEAU: Vérifier si le profil user est complet
   */
  isProfilComplet(): boolean {
    const user = this.getCurrentUser();
    if (isUser(user)) {
      const result = (user as User).profilComplete || false;
      console.log('🔍 isProfilComplet():', result);
      return result;
    }
    return false;
  }
}