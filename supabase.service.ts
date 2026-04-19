// ============================================================================
// SUPABASE SERVICE - Service central pour Supabase (HRConnect-Front)
// ============================================================================
// À placer dans: src/app/features/services/supabase/supabase.service.ts

import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  User,
  Session,
} from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

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

  async signUp(email: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<Session | null> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      this.authUser$.next(data.user);
      return data.session;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      this.authUser$.next(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Get session error:', error);
      throw error;
    }
  }

  getAuthUser$(): Observable<User | null> {
    return this.authUser$.asObservable();
  }

  getAuthUser(): User | null {
    return this.authUser$.value;
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async updatePassword(newPassword: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  // ========================================================================
  // OPÉRATIONS CRUD GÉNÉRIQUES
  // ========================================================================

  async select<T>(
    table: string,
    columns: string = '*',
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      let query = this.supabase.from(table).select(columns);

      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection !== 'desc',
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as T[]) || [];
    } catch (error) {
      console.error(`Select from ${table} error:`, error);
      throw error;
    }
  }

  async selectWhere<T>(
    table: string,
    column: string,
    operator: string,
    value: any,
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      let query = this.supabase.from(table).select('*');

      if (operator === 'eq') {
        query = query.eq(column, value);
      } else if (operator === 'neq') {
        query = query.neq(column, value);
      } else if (operator === 'gt') {
        query = query.gt(column, value);
      } else if (operator === 'gte') {
        query = query.gte(column, value);
      } else if (operator === 'lt') {
        query = query.lt(column, value);
      } else if (operator === 'lte') {
        query = query.lte(column, value);
      } else if (operator === 'like') {
        query = query.like(column, value);
      } else if (operator === 'ilike') {
        query = query.ilike(column, value);
      } else if (operator === 'in') {
        query = query.in(column, value);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection !== 'desc',
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as T[]) || [];
    } catch (error) {
      console.error(`SelectWhere from ${table} error:`, error);
      throw error;
    }
  }

  async selectOne<T>(
    table: string,
    id: string,
    columns: string = '*'
  ): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .select(columns)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      return data as T;
    } catch (error) {
      console.error(`SelectOne from ${table} error:`, error);
      throw error;
    }
  }

  async insert<T>(
    table: string,
    records: Partial<T> | Partial<T>[],
    options?: { returning?: boolean }
  ): Promise<T[]> {
    try {
      const dataArray = Array.isArray(records) ? records : [records];

      const { data, error } = await this.supabase
        .from(table)
        .insert(dataArray)
        .select();

      if (error) throw error;
      return (data as T[]) || [];
    } catch (error) {
      console.error(`Insert into ${table} error:`, error);
      throw error;
    }
  }

  async update<T>(
    table: string,
    id: string,
    updates: Partial<T>
  ): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as T;
    } catch (error) {
      console.error(`Update ${table} error:`, error);
      throw error;
    }
  }

  async delete(table: string, id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Delete from ${table} error:`, error);
      throw error;
    }
  }

  async count(table: string, filter?: { column: string; value: any }): Promise<number> {
    try {
      let query = this.supabase.from(table).select('*', { count: 'exact', head: true });

      if (filter) {
        query = query.eq(filter.column, filter.value);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error(`Count from ${table} error:`, error);
      throw error;
    }
  }

  // ========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ========================================================================

  subscribeToTable(
    table: string,
    callback: (payload: any) => void,
    options?: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*' }
  ): string {
    const subscriptionId = `${table}_${Date.now()}`;

    const subscription = this.supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        {
          event: options?.event || '*',
          schema: 'public',
          table,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  unsubscribeFromTable(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }

  // ========================================================================
  // GESTION DE FICHIERS (STORAGE)
  // ========================================================================

  async uploadFile(
    bucket: string,
    path: string,
    file: File
  ): Promise<{ path: string; fullPath: string }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file);

      if (error) throw error;
      const fullPath = this.supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
      return { ...data, fullPath };
    } catch (error) {
      console.error(`Upload file error:`, error);
      throw error;
    }
  }

  async uploadFileReplace(
    bucket: string,
    path: string,
    file: File
  ): Promise<{ path: string; fullPath: string }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .update(path, file, { upsert: true });

      if (error) throw error;
      const fullPath = this.supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
      return { ...data, fullPath };
    } catch (error) {
      console.error(`Upload file replace error:`, error);
      throw error;
    }
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
    } catch (error) {
      console.error(`Delete file error:`, error);
      throw error;
    }
  }

  getPublicFileUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // ========================================================================
  // REQUÊTES RPC
  // ========================================================================

  async callFunction<T>(functionName: string, params?: any): Promise<T> {
    try {
      const { data, error } = await this.supabase.rpc(functionName, params);
      if (error) throw error;
      return data as T;
    } catch (error) {
      console.error(`Call function ${functionName} error:`, error);
      throw error;
    }
  }

  // ========================================================================
  // OPÉRATIONS EN BATCH
  // ========================================================================

  async batchInsert<T>(
    table: string,
    records: Partial<T>[],
    batchSize: number = 1000
  ): Promise<T[]> {
    try {
      const allData: T[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const batchData = await this.insert<T>(table, batch);
        allData.push(...batchData);
      }

      return allData;
    } catch (error) {
      console.error(`Batch insert error:`, error);
      throw error;
    }
  }

  async batchUpdate<T>(
    table: string,
    updates: { id: string; data: Partial<T> }[]
  ): Promise<void> {
    try {
      for (const item of updates) {
        await this.update(table, item.id, item.data);
      }
    } catch (error) {
      console.error(`Batch update error:`, error);
      throw error;
    }
  }

  // ========================================================================
  // REQUÊTES AVANCÉES
  // ========================================================================

  async selectWithJoin<T>(
    table: string,
    joinString: string,
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      let query = this.supabase.from(table).select(joinString);

      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection !== 'desc',
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as T[]) || [];
    } catch (error) {
      console.error(`Select with join error:`, error);
      throw error;
    }
  }

  async textSearch<T>(
    table: string,
    searchColumn: string,
    searchTerm: string,
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      let query = this.supabase
        .from(table)
        .select('*')
        .ilike(searchColumn, `%${searchTerm}%`);

      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection !== 'desc',
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as T[]) || [];
    } catch (error) {
      console.error(`Text search error:`, error);
      throw error;
    }
  }

  async multiFilter<T>(
    table: string,
    filters: Array<{ column: string; operator: string; value: any }>,
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      let query = this.supabase.from(table).select('*');

      for (const filter of filters) {
        if (filter.operator === 'eq') {
          query = query.eq(filter.column, filter.value);
        } else if (filter.operator === 'neq') {
          query = query.neq(filter.column, filter.value);
        } else if (filter.operator === 'gt') {
          query = query.gt(filter.column, filter.value);
        } else if (filter.operator === 'gte') {
          query = query.gte(filter.column, filter.value);
        } else if (filter.operator === 'lt') {
          query = query.lt(filter.column, filter.value);
        } else if (filter.operator === 'lte') {
          query = query.lte(filter.column, filter.value);
        } else if (filter.operator === 'like') {
          query = query.like(filter.column, filter.value);
        } else if (filter.operator === 'in') {
          query = query.in(filter.column, filter.value);
        }
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection !== 'desc',
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as T[]) || [];
    } catch (error) {
      console.error(`Multi filter error:`, error);
      throw error;
    }
  }

  // ========================================================================
  // GESTION DES ERREURS
  // ========================================================================

  formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error.message) {
      return error.message;
    }
    return 'Une erreur est survenue';
  }
}
