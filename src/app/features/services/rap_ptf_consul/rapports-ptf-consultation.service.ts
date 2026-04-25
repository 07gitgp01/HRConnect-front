// src/app/features/services/rap_ptf_consul/rapports-ptf-consultation.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  RapportPTF,
  RapportPTFResponse,
  RapportPTFSearchParams,
  RapportType,
  StatsConsultation
} from '../../models/rapport-ptf.model';
import { environment } from '../../environment/environment';

@Injectable({ providedIn: 'root' })
export class RapportsPtfConsultationService {
  private readonly apiUrl = `${environment.apiUrl}/rapports-ptf`;
  private readonly consultationsUrl = `${environment.apiUrl}/consultations-ptf`;
  private readonly uploadsUrl = environment.apiUrl.replace('/api', '');

  // Cache local pour les stats
  private statsCache: Map<string, StatsConsultation> = new Map();

  constructor(private http: HttpClient) {}

  // ─── Liste des rapports ───────────────────────────────────────────────────

  getRapportsForPTF(
    partenairePTFId: string,
    params?: RapportPTFSearchParams
  ): Observable<RapportPTFResponse> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((reponse: any) => {
        let tous: any[] = [];
        if (Array.isArray(reponse)) tous = reponse;
        else if (reponse && Array.isArray(reponse.rapports)) tous = reponse.rapports;
        else if (reponse && typeof reponse === 'object') {
          const vals = Object.values(reponse);
          if (vals.length && typeof vals[0] === 'object') tous = vals as any[];
        }

        let filtered = tous.filter((r: any) => {
          if (Array.isArray(r.partenairePTFIds)) {
            if (r.partenairePTFIds.length === 0) return true;
            return r.partenairePTFIds.some((id: any) => String(id) === String(partenairePTFId));
          }
          const id = r.partenairePTFId;
          return id === null || id === undefined || id === '' || String(id) === String(partenairePTFId);
        });

        if (params?.type) filtered = filtered.filter((r: any) => r.type === params.type);
        if (params?.search) {
          const q = params.search.toLowerCase();
          filtered = filtered.filter((r: any) =>
            r.titre?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
          );
        }
        if (params?.periode) {
          const p = params.periode.toLowerCase();
          filtered = filtered.filter((r: any) =>
            r.metadata?.periode?.toLowerCase().includes(p)
          );
        }

        const sortBy = params?.sortBy || 'date';
        const sortOrder = params?.sortOrder || 'desc';
        filtered.sort((a: any, b: any) => {
          const cmp = String(a[sortBy] || '') < String(b[sortBy] || '') ? -1 : 1;
          return sortOrder === 'desc' ? -cmp : cmp;
        });

        const total = filtered.length;
        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const start = (page - 1) * limit;

        return {
          rapports: filtered.slice(start, start + limit),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        };
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('❌ Erreur GET rapports-ptf:', err.message);
        return of({ rapports: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      })
    );
  }

  // ─── Stats consultation ───────────────────────────────────────────────────

  getStatsConsultation(partenairePTFId: string): Observable<StatsConsultation> {
    const statsUrl = `${this.consultationsUrl}/stats/${partenairePTFId}`;

    return this.http.get<any>(statsUrl).pipe(
      map((data: any) => {
        const stats: StatsConsultation = {
          totalRapports: data.totalRapports ?? 0,
          rapportsConsultes: data.rapportsConsultes ?? 0,
          derniereConsultation: data.derniereConsultation ?? null,
          tauxConsultation: data.tauxConsultation ?? 0
        };
        
        // Mettre en cache
        this.statsCache.set(partenairePTFId, stats);
        
        console.log(`📊 Stats PTF "${partenairePTFId}":`, stats);
        return stats;
      }),
      catchError(() => of({
        totalRapports: 0,
        rapportsConsultes: 0,
        derniereConsultation: null,
        tauxConsultation: 0
      }))
    );
  }

  // ─── Consultation ─────────────────────────────────────────────────────────

  /**
   * ✅ CORRECTION : Utiliser le bon endpoint /consultations-ptf
   */
  marquerCommeConsulte(rapportId: string | number, partenairePTFId: string): Observable<any> {
    const dateConsultation = new Date().toISOString();
    
    const consultationData = {
      rapportId: String(rapportId),
      partenairePTFId: partenairePTFId,
      dateConsultation: dateConsultation,
      typeConsultation: 'vue'
    };
    
    console.log('📝 Enregistrement consultation:', consultationData);
    
    // ✅ Utiliser le bon endpoint /consultations-ptf
    return this.http.post(this.consultationsUrl, consultationData).pipe(
      tap(() => {
        console.log('✅ Consultation enregistrée avec succès');
        // ✅ Mettre à jour le cache local
        this.mettreAJourCacheApresConsultation(partenairePTFId, dateConsultation);
      }),
      catchError((err) => {
        console.warn('⚠️ Erreur enregistrement consultation:', err);
        // Même en cas d'erreur, on met à jour localement
        this.mettreAJourCacheApresConsultation(partenairePTFId, dateConsultation);
        return of({ success: false, error: err.message });
      })
    );
  }

  /**
   * ✅ Mettre à jour le cache local après une consultation
   */
  private mettreAJourCacheApresConsultation(partenairePTFId: string, dateConsultation: string): void {
    const currentStats = this.statsCache.get(partenairePTFId);
    
    if (currentStats) {
      const updatedStats: StatsConsultation = {
        totalRapports: currentStats.totalRapports,
        rapportsConsultes: currentStats.rapportsConsultes + 1,
        derniereConsultation: dateConsultation,
        tauxConsultation: currentStats.totalRapports > 0
          ? Math.min(100, Math.round(((currentStats.rapportsConsultes + 1) / currentStats.totalRapports) * 100))
          : 0
      };
      
      this.statsCache.set(partenairePTFId, updatedStats);
      console.log('📊 Cache mis à jour:', updatedStats);
    }
  }

  /**
   * ✅ Récupérer les stats depuis le cache (pour l'affichage immédiat)
   */
  getStatsFromCache(partenairePTFId: string): StatsConsultation | null {
    return this.statsCache.get(partenairePTFId) || null;
  }

  // ─── Blob (preview + téléchargement) ─────────────────────────────────────

  getPdfBlob(rapportId: string | number, rapportUrl?: string): Observable<Blob> {
    if (rapportUrl) {
      const fullUrl = this.buildFileUrl(rapportUrl);
      return this.http.get(fullUrl, { responseType: 'blob' }).pipe(
        catchError(() => this.getBlobViaBase64(rapportId))
      );
    }
    return this.getBlobViaBase64(rapportId);
  }

  private getBlobViaBase64(rapportId: string | number): Observable<Blob> {
    return this.http.get<any>(`${this.apiUrl}/${rapportId}`).pipe(
      map((r: any) => {
        if (!r?.fichierBase64) throw new Error('Fichier introuvable dans la base de données');
        return this.base64ToBlob(r.fichierBase64, r.typeFichier || 'application/pdf');
      }),
      catchError((err) => {
        throw new Error(err.message || 'Erreur récupération fichier');
      })
    );
  }

  telechargerRapport(rapportId: string | number, rapportUrl?: string): Observable<Blob> {
    return this.getPdfBlob(rapportId, rapportUrl);
  }

  // ─── Types & catégories ──────────────────────────────────────────────────

  getTypes(): Observable<RapportType[]> {
    return this.http.get<any>(`${environment.apiUrl}/types`).pipe(
      map(res => {
        const l = Array.isArray(res) ? res : [];
        return l.length ? l : this.defaultTypes();
      }),
      catchError(() => of(this.defaultTypes()))
    );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<any>(`${environment.apiUrl}/categories`).pipe(
      map(res => {
        const l = Array.isArray(res) ? res : [];
        return l.length ? l : this.defaultCategories();
      }),
      catchError(() => of(this.defaultCategories()))
    );
  }

  // ─── Utilitaires publics ──────────────────────────────────────────────────

  buildFileUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    const base = this.uploadsUrl.replace(/\/$/, '');
    const path = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    return `${base}${path}`;
  }

  base64ToBlob(base64: string, mimeType: string): Blob {
    const byteString = atob(base64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([uint8Array], { type: mimeType });
  }

  private defaultTypes(): RapportType[] {
    return ['rapport_trimestriel', 'rapport_annuel', 'rapport_impact', 'rapport_special', 'autre'];
  }

  private defaultCategories(): string[] {
    return ['Rapport officiel', 'Statistiques', 'Impact social', 'Finances', 'Évaluation', 'Projets', 'Volontaires'];
  }
}