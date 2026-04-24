import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, BehaviorSubject, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environment/environment';

export interface LoginResponse {
  success: boolean;
  user?: any;
  type?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // ✅ Utilisation de environment.apiUrl
  private apiUrl = environment.apiUrl;
  private authUrl = `${this.apiUrl}/auth`;
  private usersUrl = `${this.apiUrl}/users`;
  private adminsUrl = `${this.apiUrl}/admins`;
  private partenairesUrl = `${this.apiUrl}/partenaires`;
  private volontairesUrl = `${this.apiUrl}/volontaires`;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.restoreUserFromStorage();
  }

  private restoreUserFromStorage(): void {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        console.log('🔐 Utilisateur restauré:', user.role);
      } catch (error) {
        console.error('Erreur restauration:', error);
        this.clearStorage();
      }
    }
  }

  // ==================== AUTHENTIFICATION ====================

  login(email: string, password: string): Observable<any> {
    console.log('=== 🔐 TENTATIVE DE CONNEXION ===');
    console.log('Email:', email);
    console.log('API URL:', this.apiUrl);
    
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, { email, password }).pipe(
      tap(response => {
        if (response.success && response.user) {
          const user = {
            ...response.user,
            role: response.user.role || response.type
          };
          this.currentUserSubject.next(user);
          localStorage.setItem('userData', JSON.stringify(user));
          console.log('✅ Connexion réussie:', user);
        } else if (response.error) {
          console.error('❌ Erreur:', response.error);
        }
      }),
      catchError(error => {
        console.error('❌ Erreur connexion:', error);
        this.currentUserSubject.next(null);
        this.clearStorage();
        return throwError(() => new Error(error.error?.error || 'Erreur de connexion'));
      })
    );
  }

  // ==================== INSCRIPTION ====================

  signup(userData: any): Observable<any> {
    console.log('📝 Inscription nouveau candidat:', userData.email);
    
    const candidatData = {
      ...userData,
      role: 'candidat',
      actif: true,
      dateInscription: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profilComplete: false
    };

    return this.http.post<any>(this.usersUrl, candidatData).pipe(
      tap(user => console.log('✅ User créé avec succès:', user)),
      catchError(error => {
        console.error('❌ Erreur création user:', error);
        return throwError(() => new Error('Erreur lors de la création du compte'));
      })
    );
  }

  // ==================== CRUD UTILISATEURS ====================

  deleteUser(userId: string | number): Observable<void> {
    console.log(`🗑️ Suppression user ${userId}`);
    return this.http.delete<void>(`${this.usersUrl}/${userId}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur suppression user ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la suppression du compte'));
      })
    );
  }

  updateUserVolontaireId(userId: string | number, volontaireId: string | number): Observable<any> {
    console.log(`🆔 Mise à jour volontaireId ${userId} -> ${volontaireId}`);
    return this.http.patch<any>(`${this.usersUrl}/${userId}`, {
      volontaireId: String(volontaireId),
      updatedAt: new Date().toISOString()
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

  promouvoirEnVolontaire(userId: string | number): Observable<any> {
    console.log(`🎓 Promotion candidat → volontaire: ${userId}`);
    return this.http.patch<any>(`${this.usersUrl}/${userId}`, {
      role: 'volontaire',
      profilComplete: true,
      updatedAt: new Date().toISOString()
    }).pipe(
      tap(updatedUser => {
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          this.currentUserSubject.next(updatedUser);
          localStorage.setItem('userData', JSON.stringify(updatedUser));
        }
      }),
      catchError(error => {
        console.error(`❌ Erreur promotion volontaire ${userId}:`, error);
        return throwError(() => new Error('Erreur lors de la promotion en volontaire'));
      })
    );
  }

  marquerProfilComplet(userId: string | number): Observable<any> {
    console.log(`✅ Marquage profil complet: ${userId}`);
    return this.http.patch<any>(`${this.usersUrl}/${userId}`, {
      profilComplete: true,
      updatedAt: new Date().toISOString()
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

  // ==================== GETTERS ====================

 getVolontaireId(): string | null {
  const user = this.getCurrentUser();
  return user?.volontaireId || null;
}

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  getUserRole(): string | null {
    return this.currentUserSubject.value?.role || null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  isCandidat(): boolean {
    const role = this.getUserRole();
    return role === 'candidat';
  }

  isVolontaire(): boolean {
    const role = this.getUserRole();
    return role === 'volontaire';
  }

  isCandidatOuVolontaire(): boolean {
    const role = this.getUserRole();
    return role === 'candidat' || role === 'volontaire';
  }

  isPartenaire(): boolean {
    const role = this.getUserRole();
    return role === 'partenaire';
  }

  isAdmin(): boolean {
    const role = this.getUserRole();
    return role === 'admin';
  }

  // ==================== DÉCONNEXION ====================

  logout(): void {
    this.http.post(`${this.authUrl}/logout`, {}).subscribe({
      next: () => console.log('🚪 Déconnexion API réussie'),
      error: (err) => console.error('Erreur déconnexion API:', err)
    });
    this.currentUserSubject.next(null);
    this.clearStorage();
    this.router.navigate(['/login']);
  }

  private clearStorage(): void {
    localStorage.removeItem('userData');
    console.log('🧹 Storage nettoyé');
  }

  // ==================== MÉTHODES COMPLÉMENTAIRES ====================

  getUserByEmail(email: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.usersUrl}?email=${email.toLowerCase()}`).pipe(
      catchError(() => of([]))
    );
  }

  refreshUserData(): void {
    this.restoreUserFromStorage();
  }

  isProfilComplet(): boolean {
    const user = this.getCurrentUser();
    return user?.profilComplete === true;
  }

  createAdmin(adminData: any): Observable<any> {
    console.log('👤 Création admin:', adminData.email);
    return this.http.post<any>(this.adminsUrl, adminData).pipe(
      catchError(error => {
        console.error('❌ Erreur création admin:', error);
        return throwError(() => new Error('Erreur lors de la création de l\'admin'));
      })
    );
  }

  createPartenaire(partenaireData: any): Observable<any> {
    console.log('🏢 Création partenaire:', partenaireData.email);
    return this.http.post<any>(this.partenairesUrl, partenaireData).pipe(
      catchError(error => {
        console.error('❌ Erreur création partenaire:', error);
        return throwError(() => new Error('Erreur lors de la création du partenaire'));
      })
    );
  }
}