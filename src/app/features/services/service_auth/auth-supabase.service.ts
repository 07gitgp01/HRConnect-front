// src/app/features/services/service_auth/auth-supabase.service.ts
// Service d'authentification migré vers Supabase

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, from, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { Partenaire } from '../../models/partenaire.model';
import { User, AdminUser, AuthenticatedUser, isUser, isAdmin, isPartenaire } from '../../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthSupabaseService {
  private currentUserSubject = new BehaviorSubject<AuthenticatedUser>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  /**
   * Obtenir l'utilisateur courant
   */
  getCurrentUser(): AuthenticatedUser | null {
    return this.currentUserSubject.value;
  }

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    // Écouter les changements d'état d'authentification Supabase
    this.supabaseService.authUser.subscribe(user => {
      if (user) {
        // Récupérer les données complètes de l'utilisateur depuis nos tables
        this.getUserCompleteData(user.email!).subscribe({
          next: (completeUser) => {
            this.currentUserSubject.next(completeUser);
            this.saveUserToStorage(completeUser);
          },
          error: (error) => {
            console.error('Erreur récupération données utilisateur:', error);
            this.currentUserSubject.next(null);
            this.clearStorage();
          }
        });
      } else {
        this.currentUserSubject.next(null);
        this.clearStorage();
      }
    });
  }

  /**
   * Connexion avec email et mot de passe
   */
  login(email: string, password: string): Observable<AuthenticatedUser> {
    console.log('=== Supabase Login Attempt ===');
    console.log('Email:', email);

    return from(this.supabaseService.signIn(email, password)).pipe(
      switchMap(({ user, session, error }) => {
        if (error) {
          console.error('Supabase login error:', error);
          return throwError(() => new Error('Email ou mot de passe incorrect.'));
        }

        if (!user || !session) {
          return throwError(() => new Error('Échec de la connexion.'));
        }

        // Récupérer les données complètes depuis nos tables
        return this.getUserCompleteData(email!);
      }),
      tap(user => {
        if (user) {
          this.currentUserSubject.next(user);
          this.saveUserToStorage(user);
          console.log('=== Login Successful ===');
          console.log('User:', user.role);
        }
      }),
      catchError(error => {
        console.error('=== Login Error ===', error);
        this.currentUserSubject.next(null);
        this.clearStorage();
        return throwError(() => error);
      })
    );
  }

  /**
   * Inscription d'un nouveau candidat
   */
  signup(userData: User): Observable<User> {
    console.log('=== Supabase Signup ===');
    console.log('Email:', userData.email);

    // 1. Créer l'utilisateur dans Supabase Auth
    return from(this.supabaseService.signUp(userData.email, userData.password, {
      prenom: userData.prenom,
      nom: userData.nom,
      telephone: userData.telephone,
      role: 'candidat'
    })).pipe(
      switchMap(({ user, session, error }) => {
        if (error) {
          console.error('Supabase signup error:', error);
          return throwError(() => new Error('Erreur lors de la création du compte.'));
        }

        if (!user) {
          return throwError(() => new Error('Échec de la création du compte.'));
        }

        // 2. Créer l'utilisateur dans notre table users
        const candidatData: User = {
          id: user!.id,
          ...userData,
          role: 'candidat',
          actif: true,
          date_inscription: new Date().toISOString(),
          profilComplete: false,
          volontaireId: undefined
        };

        return from(this.supabaseService.insert('users', candidatData));
      }),
      map(({ data, error }) => {
        if (error) {
          throw new Error('Erreur lors de la sauvegarde des données utilisateur.');
        }
        return (data && data[0]) as User;
      }),
      tap(user => {
        console.log('=== Signup Successful ===', user);
      }),
      catchError(error => {
        console.error('=== Signup Error ===', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Déconnexion
   */
  logout(): void {
    console.log('=== Logout ===');
    from(this.supabaseService.signOut()).subscribe({
      next: () => {
        this.currentUserSubject.next(null);
        this.clearStorage();
        this.router.navigate(['/login']);
        console.log('=== Logout Successful ===');
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Forcer la déconnexion locale même si Supabase échoue
        this.currentUserSubject.next(null);
        this.clearStorage();
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Récupérer les données complètes de l'utilisateur depuis nos tables
   */
  public getUserCompleteData(email: string): Observable<AuthenticatedUser> {
    console.log('=== Getting Complete User Data ===');
    console.log('Email:', email);

    // Rechercher dans toutes les tables
    console.log('=== Requêtes Supabase pour email ===', email);

    return forkJoin({
      users: from(this.supabaseService.select('users', { eq: { email } })).pipe(
        tap(result => console.log('Users query result:', result)),
        catchError(() => {
          console.log('Users query failed');
          return of({ data: [] });
        })
      ),
      partenaires: from(this.supabaseService.select('partenaires', { eq: { email } })).pipe(
        tap(result => console.log('Partenaires query result:', result)),
        catchError(() => {
          console.log('Partenaires query failed');
          return of({ data: [] });
        })
      ),
      admins: from(this.supabaseService.select('admins', { eq: { email } })).pipe(
        tap(result => console.log('Admins query result:', result)),
        catchError(() => {
          console.log('Admins query failed');
          return of({ data: [] });
        })
      ),
      volontaires: from(this.supabaseService.select('volontaires', { eq: { email } })).pipe(
        tap(result => console.log('Volontaires query result:', result)),
        catchError(() => {
          console.log('Volontaires query failed');
          return of({ data: [] });
        })
      )
    }).pipe(
      map((results: any) => {
        console.log('Search results:', results);

        // 1. Vérifier les users (candidats/volontaires)
        if (results.users?.data && results.users.data.length > 0) {
          const user = results.users.data[0] as User;
          console.log('Found user:', user);

          // Vérifier si le compte est actif
          if (user.actif === false) {
            throw new Error('Votre compte a été désactivé. Veuillez contacter l\'administrateur.');
          }

          // Le rôle est déjà dans la table users, pas besoin d'ajouter
          return user;
        }

        // 2. Vérifier les partenaires
        if (results.partenaires?.data && results.partenaires.data.length > 0) {
          const partenaire = results.partenaires.data[0] as any;
          console.log('Found partenaire:', partenaire);

          if (partenaire.est_active === false || partenaire.compte_active === false) {
            throw new Error('Votre compte partenaire a été désactivé. Veuillez contacter l\'administrateur.');
          }

          // Ajouter le rôle simplement
          partenaire.role = 'partenaire';
          return partenaire;
        }

        // 3. Vérifier les volontaires (si trouvés directement)
        if (results.volontaires?.data && results.volontaires.data.length > 0) {
          const volontaire = results.volontaires.data[0] as any;
          console.log('Found volontaire:', volontaire);

          // Ajouter le rôle simplement
          volontaire.role = 'candidat'; // Les volontaires sont considérés comme des candidats
          volontaire.id = volontaire.user_id || volontaire.id;

          return volontaire;
        }

  /**
   * Sauvegarder l'utilisateur dans le localStorage
   */
  public saveUserToStorage(user: any): void {
    if (!user) return;
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userData', JSON.stringify(user));
  }

  /**
   * Nettoyer le localStorage
   */
  private clearStorage(): void {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  /**
   * Obtenir le rôle de l'utilisateur
   */
  getUserRole(): string | null {
    return this.currentUserSubject.value?.role || localStorage.getItem('userRole');
  }

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser(): AuthenticatedUser {
    return this.currentUserSubject.value;
  }

  /**
   * Vérifier si c'est un candidat
   */
  isCandidat(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'candidat';
  }

  /**
   * Vérifier si c'est un volontaire
   */
  isVolontaire(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'volontaire';
  }

  /**
   * Vérifier si c'est un candidat ou volontaire
   */
  isCandidatOuVolontaire(): boolean {
    return isUser(this.getCurrentUser());
  }

  /**
   * Vérifier si c'est un partenaire
   */
  isPartenaire(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'partenaire';
  }

  /**
   * Vérifier si c'est un admin
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  /**
   * Obtenir l'ID du volontaire
   */
  getVolontaireId(): number | string | null {
    const user = this.getCurrentUser();
    if (user && isUser(user)) {
      return (user as User).volontaireId || null;
    }
    return null;
  }

  /**
   * Obtenir le candidat actuel
   */
  getCurrentCandidat(): User | null {
    const user = this.getCurrentUser();
    return isUser(user) ? user as User : null;
  }

  /**
   * Vérifier si le profil est complet
   */
  isProfilComplet(): boolean {
    const user = this.getCurrentUser();
    if (isUser(user)) {
      return (user as User).profilComplete || false;
    }
    return false;
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  updateUserProfile(userId: string | number, updates: Partial<User>): Observable<User> {
    return from(this.supabaseService.update('users', updates, userId)).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error('Erreur lors de la mise à jour du profil.');
        }
        return data[0] as User;
      }),
      tap(updatedUser => {
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          this.currentUserSubject.next(updatedUser);
          this.saveUserToStorage(updatedUser);
        }
      })
    );
  }
}
