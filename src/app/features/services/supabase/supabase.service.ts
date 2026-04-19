// ============================================================================
// SUPABASE SERVICE - Service central pour Supabase (HRConnect-Front)
// ============================================================================

import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  User,
  Session,
} from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environment/environment';

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private authUser$ = new BehaviorSubject<User | null>(null);
  private subscriptions: Map<string, any> = new Map();

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.key
    );
    this.initializeAuth();
  }

  // ========================================================================
  // AUTHENTIFICATION
  // ========================================================================

  private initializeAuth(): void {
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this.authUser$.next(session.user);
      } else {
        this.authUser$.next(null);
      }
    });
  }

  // Observable pour l'utilisateur authentifié
  get authUser(): Observable<User | null> {
    return this.authUser$.asObservable();
  }

  // Obtenir l'utilisateur actuel
  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Inscription (Sign Up)
  async signUp(email: string, password: string, metadata?: any): Promise<{ user: User | null; session: Session | null; error?: any }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { user: data.user, session: data.session, error };
  }

  // Connexion (Sign In)
  async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; error?: any }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    return { user: data.user, session: data.session, error };
  }

  // Déconnexion
  async signOut(): Promise<{ error?: any }> {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  // Réinitialisation du mot de passe
  async resetPassword(email: string): Promise<{ error?: any }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    return { error };
  }

  // ========================================================================
  // DATABASE OPERATIONS
  // ========================================================================

  // SELECT générique
  async select(table: string, options?: QueryOptions & { eq?: Record<string, any> }): Promise<{ data: any[]; error?: any }> {
    let query = this.supabase.from(table).select('*');

    // Appliquer les filtres d'égalité
    if (options?.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Appliquer l'ordre
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDirection === 'asc' });
    }

    // Appliquer la pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  }

  // INSERT générique
  async insert(table: string, data: any): Promise<{ data: any; error?: any }> {
    const { data: result, error } = await this.supabase.from(table).insert(data);
    return { data: result, error };
  }

  // UPDATE générique
  async update(table: string, data: any, id: string | number): Promise<{ data: any; error?: any }> {
    const { data: result, error } = await this.supabase.from(table).update(data).eq('id', id);
    return { data: result, error };
  }

  // DELETE générique
  async delete(table: string, id: string | number): Promise<{ error?: any }> {
    const { error } = await this.supabase.from(table).delete().eq('id', id);
    return { error };
  }

  // ========================================================================
  // FILE UPLOAD (Stockage)
  // ========================================================================

  // Uploader un fichier
  async uploadFile(bucket: string, path: string, file: File): Promise<{ data: any; error?: any }> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file);
    return { data, error };
  }

  // Obtenir l'URL publique d'un fichier
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  // Supprimer un fichier
  async deleteFile(bucket: string, path: string): Promise<{ error?: any }> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);
    return { error };
  }

  // ========================================================================
  // REALTIME
  // ========================================================================

  // S'abonner aux changements d'une table
  subscribeToTable(table: string, callback: (payload: any) => void): string {
    const channelName = `table-changes-${table}`;
    
    const channel = this.supabase
      .channel(channelName)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: table },
        callback
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channelName;
  }

  // Se désabonner
  unsubscribe(channelName: string): void {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  // Nettoyer tous les abonnements
  unsubscribeAll(): void {
    this.subscriptions.forEach((channel, name) => {
      this.supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
  }

  // ========================================================================
  // UTILITAIRES
  // ========================================================================

  // Obtenir le client Supabase brut (pour usages avancés)
  get client(): SupabaseClient {
    return this.supabase;
  }

  // Vérifier si l'utilisateur est connecté
  get isAuthenticated(): boolean {
    return this.authUser$.value !== null;
  }
}
