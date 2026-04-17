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
  private volontairesUrl = 'http://localhost:3000/volontaires';

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
   * 🔐 CONNEXION - Avec vérification du compte actif
   */
  login(email: string, password: string): Observable<AuthenticatedUser> {
    console.log('=== 🔐 TENTATIVE DE CONNEXION ===');
    console.log('Email:', email);
    
    return forkJoin({
      partenaires: this.http.get<Partenaire[]>(this.partenairesUrl).pipe(catchError(() => of([]))),
      users: this.http.get<User[]>(this.usersUrl).pipe(catchError(() => of([]))),
      admins: this.http.get<AdminUser[]>(this.adminUrl).pipe(catchError(() => of([]))),
      volontaires: this.http.get<any[]>(this.volontairesUrl).pipe(catchError(() => of([])))
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
          console.log('   Actif:', user.actif);
          
          // ✅ VÉRIFICATION 1: Le compte utilisateur doit être actif
          if (user.actif === false) {
            console.log('🚫 Compte utilisateur désactivé - Accès refusé');
            throw new Error('Votre compte a été désactivé. Veuillez contacter l\'administrateur.');
          }
          
          // ✅ VÉRIFICATION 2: Si c'est un volontaire, vérifier son statut
          if (user.role === 'volontaire' && user.volontaireId) {
            const volontaireData = data.volontaires.find(v => 
              String(v.id) === String(user.volontaireId)
            );
            
            if (volontaireData) {
              console.log('🔍 Statut volontaire:', volontaireData.statut);
              
              if (volontaireData.statut === 'Inactif') {
                console.log('🚫 Compte volontaire inactif - Accès refusé');
                throw new Error('Votre compte volontaire est actuellement inactif. Veuillez contacter l\'administrateur.');
              }
              
              console.log('✅ Statut volontaire valide:', volontaireData.statut);
            }
          }
          
          return user;
        }

        // 2. Recherche parmi les partenaires
        const partenaire = data.partenaires.find(p => 
          p.email === email && p.motDePasseTemporaire === password
        );
        
        if (partenaire) {
          console.log('✅ Partenaire trouvé:', partenaire);
          
          if (partenaire.estActive === false || partenaire.compteActive === false) {
            console.log('🚫 Compte partenaire désactivé - Accès refusé');
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
          
          if (admin.actif === false) {
            console.log('🚫 Compte admin désactivé - Accès refusé');
            throw new Error('Votre compte administrateur a été désactivé. Veuillez contacter l\'administrateur.');
          }
          
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
    
    const candidatData: User = {
      ...userData,
      role: 'candidat',
      actif: true, // ✅ Par défaut, le compte est actif
      date_inscription: new Date().toISOString(),
      profilComplete: false,
      volontaireId: undefined
    };

    return this.http.post<User>(this.usersUrl, candidatData).pipe(
      tap(user => console.log('✅ User créé avec succès:', user)),
      catchError(error => {
        console.error('❌ Erreur création user:', error);
        return throwError(() => new Error('Erreur lors de la création du compte'));
      })
    );
  }

  createAdmin(adminData: AdminUser): Observable<AdminUser> {
    console.log('👤 Création admin:', adminData.email);
    
    const adminAvecActif = {
      ...adminData,
      actif: true // ✅ Par défaut, le compte admin est actif
    };
    
    return this.http.post<AdminUser>(this.adminUrl, adminAvecActif).pipe(
      catchError(error => {
        console.error('❌ Erreur création admin:', error);
        return throwError(() => new Error('Erreur lors de la création de l\'admin'));
      })
    );
  }

  createPartenaire(partenaireData: Partenaire): Observable<Partenaire> {
    console.log('🏢 Création partenaire:', partenaireData.email);
    
    const partenaireAvecActif = {
      ...partenaireData,
      compteActive: true,
      estActive: true
    };
    
    return this.http.post<Partenaire>(this.partenairesUrl, partenaireAvecActif).pipe(
      catchError(error => {
        console.error('❌ Erreur création partenaire:', error);
        return throwError(() => new Error('Erreur lors de la création du partenaire'));
      })
    );
  }

  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    this.currentUserSubject.next(null);
    this.clearStorage();
    this.router.navigate(['/login']);
    console.log('✅ Déconnexion effectuée');
  }

  private clearStorage(): void {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    console.log('🧹 Storage nettoyé');
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  getUserRole(): string | null {
    return this.currentUserSubject.value?.role || localStorage.getItem('userRole');
  }

  getCurrentUser(): AuthenticatedUser {
    return this.currentUserSubject.value;
  }

  isCandidat(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'candidat';
  }

  isVolontaire(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'volontaire';
  }

  isCandidatOuVolontaire(): boolean {
    return isUser(this.getCurrentUser());
  }

  isPartenaire(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'partenaire';
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  getVolontaireId(): number | string | null {
    const user = this.getCurrentUser();
    if (user && isUser(user)) {
      return (user as User).volontaireId || null;
    }
    return null;
  }

  getCurrentCandidat(): User | null {
    const user = this.getCurrentUser();
    return isUser(user) ? user as User : null;
  }

  updateUserVolontaireId(userId: number | string, volontaireId: number | string): Observable<User> {
    console.log(`🆔 Mise à jour volontaireId ${userId} -> ${volontaireId}`);
    return this.http.patch<User>(`${this.usersUrl}/${userId}`, {
      volontaireId: volontaireId,
      profilComplete: false
    }).pipe(
      tap(updatedUser => {
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          this.currentUserSubject.next(updatedUser);
          localStorage.setItem('userData', JSON.stringify(updatedUser));
        }
      }),
      catchError(error => {
        console.error(`❌ Erreur mise à jour volontaireId ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la mise à jour du profil'));
      })
    );
  }

  promouvoirEnVolontaire(userId: number | string): Observable<User> {
    console.log(`🎓 Promotion candidat → volontaire: ${userId}`);
    return this.http.patch<User>(`${this.usersUrl}/${userId}`, {
      role: 'volontaire',
      profilComplete: true,
      updated_at: new Date().toISOString()
    }).pipe(
      tap(updatedUser => {
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          this.currentUserSubject.next(updatedUser);
          localStorage.setItem('userData', JSON.stringify(updatedUser));
          localStorage.setItem('userRole', 'volontaire');
        }
      }),
      catchError(error => {
        console.error(`❌ Erreur promotion volontaire ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la promotion en volontaire'));
      })
    );
  }

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
        }
      }),
      catchError(error => {
        console.error(`❌ Erreur rétrogradation candidat ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la rétrogradation en candidat'));
      })
    );
  }

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
        }
      }),
      catchError(error => {
        console.error(`❌ Erreur marquage profil complet ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la mise à jour du profil'));
      })
    );
  }

  deleteUser(userId: number | string): Observable<void> {
    console.log(`🗑️ Suppression user ${userId}`);
    return this.http.delete<void>(`${this.usersUrl}/${userId}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur suppression user ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la suppression du compte'));
      })
    );
  }

  getUserByEmail(email: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.usersUrl}?email=${email.toLowerCase()}`).pipe(
      catchError(() => of([]))
    );
  }

  refreshUserData(): void {
    this.restoreUserFromStorage();
  }

  isProfilComplet(): boolean {
    const user = this.getCurrentUser();
    if (isUser(user)) {
      return (user as User).profilComplete || false;
    }
    return false;
  }
}