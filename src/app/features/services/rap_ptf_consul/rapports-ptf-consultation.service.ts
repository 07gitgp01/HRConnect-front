// src/app/features/services/rap_ptf_consul/rapports-ptf-consultation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
  private apiUrl     = `${environment.apiUrl}/rapports-ptf`;
  private serverBase = environment.apiUrl.replace(/\/api$/, '');

  constructor(private http: HttpClient) {}

  // ─── Liste des rapports ───────────────────────────────────────────────────

  getRapportsForPTF(
    partenairePTFId: string,
    params?: RapportPTFSearchParams
  ): Observable<RapportPTFResponse> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((reponse: any) => {
        let tous: any[] = [];
        if (Array.isArray(reponse))                      tous = reponse;
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

        if (params?.type)   filtered = filtered.filter((r: any) => r.type === params.type);
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

        const sortBy    = params?.sortBy    || 'date';
        const sortOrder = params?.sortOrder || 'desc';
        filtered.sort((a: any, b: any) => {
          const cmp = String(a[sortBy] || '') < String(b[sortBy] || '') ? -1 : 1;
          return sortOrder === 'desc' ? -cmp : cmp;
        });

        const total      = filtered.length;
        const page       = params?.page  || 1;
        const limit      = params?.limit || 10;
        const start      = (page - 1) * limit;

        return { rapports: filtered.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) };
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('❌ Erreur GET rapports-ptf:', err.message);
        return of({ rapports: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      })
    );
  }

  // ─── ✅ Stats : deux stratégies en cascade ────────────────────────────────
  //
  // Stratégie 1 (prioritaire) : GET /rapports-ptf/stats/:id
  //   → Calcul côté serveur depuis bd.json, résultat toujours à jour.
  //
  // Stratégie 2 (fallback)    : calcul côté client via forkJoin
  //   → Utilisée si le serveur custom n'est pas disponible (ex: json-server pur).

  getStatsConsultation(partenairePTFId: string): Observable<StatsConsultation> {
    // Stratégie 1 : endpoint dédié du server.js
    const statsUrl = `${this.serverBase}/rapports-ptf/stats/${partenairePTFId}`;

    return this.http.get<any>(statsUrl).pipe(
      map((data: any) => {
        const stats: StatsConsultation = {
          totalRapports:        data.totalRapports        ?? 0,
          rapportsConsultes:    data.rapportsConsultes    ?? 0,
          derniereConsultation: data.derniereConsultation ?? null,
          tauxConsultation:     data.tauxConsultation     ?? 0
        };
        console.log(`📊 Stats PTF "${partenairePTFId}" (serveur):`, stats);
        return stats;
      }),
      // Stratégie 2 : fallback calcul client
      catchError(() => this.getStatsConsultationFallback(partenairePTFId))
    );
  }

  /**
   * Fallback : lit directement /consultations-ptf exposé par json-server
   * et croise avec la liste des rapports accessibles.
   */
  private getStatsConsultationFallback(partenairePTFId: string): Observable<StatsConsultation> {
    const consultationsUrl = `${environment.apiUrl}/consultations-ptf`;

    return forkJoin({
      rapports:      this.getRapportsForPTF(partenairePTFId, { page: 1, limit: 10000 }),
      consultations: this.http.get<any[]>(consultationsUrl).pipe(catchError(() => of([])))
    }).pipe(
      map(({ rapports, consultations }) => {
        const totalRapports    = rapports.total;
        const consultationsPTF = Array.isArray(consultations)
          ? consultations.filter((c: any) => String(c.partenairePTFId) === String(partenairePTFId))
          : [];

        const idsConsultes     = new Set(consultationsPTF.map((c: any) => String(c.rapportId)));
        const rapportsConsultes = idsConsultes.size;

        const dates = consultationsPTF
          .map((c: any) => c.dateConsultation)
          .filter(Boolean)
          .sort((a: string, b: string) => b.localeCompare(a));

        const tauxConsultation = totalRapports > 0
          ? Math.min(100, Math.round((rapportsConsultes / totalRapports) * 100))
          : 0;

        console.log(`📊 Stats PTF "${partenairePTFId}" (fallback client):`,
          { totalRapports, rapportsConsultes, tauxConsultation });

        return {
          totalRapports,
          rapportsConsultes,
          derniereConsultation: dates[0] ?? null,
          tauxConsultation
        };
      }),
      catchError(() => of({ totalRapports: 0, rapportsConsultes: 0, derniereConsultation: null, tauxConsultation: 0 }))
    );
  }

  // ─── Consultation ─────────────────────────────────────────────────────────

  marquerCommeConsulte(rapportId: number, partenairePTFId: string): Observable<any> {
    return this.http
      .post(`${this.serverBase}/rapports-ptf/${rapportId}/consulter`, {
        partenairePTFId,
        dateConsultation:  new Date().toISOString(),
        typeConsultation: 'vue'
      })
      .pipe(
        catchError(() =>
          // Fallback json-server natif si server.js non disponible
          this.http.post(`${environment.apiUrl}/consultations-ptf`, {
            id:               Date.now(),
            rapportId,
            partenairePTFId,
            dateConsultation: new Date().toISOString(),
            typeConsultation: 'vue'
          }).pipe(catchError(() => of({ success: false })))
        )
      );
  }

  // ─── Blob (preview + téléchargement) ─────────────────────────────────────

  getPdfBlob(rapportId: number, rapportUrl?: string): Observable<Blob> {
    if (rapportUrl) {
      return this.http.get(this.buildFileUrl(rapportUrl), { responseType: 'blob' }).pipe(
        catchError(() => this.getBlobViaBase64(rapportId))
      );
    }
    return this.getBlobViaBase64(rapportId);
  }

  private getBlobViaBase64(rapportId: number): Observable<Blob> {
    return this.http.get<any>(`${this.apiUrl}/${rapportId}`).pipe(
      map((r: any) => {
        if (!r?.fichierBase64) throw new Error('Fichier introuvable dans la base de données');
        return this.base64ToBlob(r.fichierBase64, r.typeFichier || 'application/pdf');
      }),
      catchError((err) => throwError(() => new Error(err.message || 'Erreur récupération fichier')))
    );
  }

  telechargerRapport(rapportId: number, rapportUrl?: string): Observable<Blob> {
    return this.getPdfBlob(rapportId, rapportUrl);
  }

  // ─── Types & catégories ──────────────────────────────────────────────────

  getTypes(): Observable<RapportType[]> {
    return this.http.get<any>(`${environment.apiUrl}/types`).pipe(
      map(res => { const l = Array.isArray(res) ? res : []; return l.length ? l : this.defaultTypes(); }),
      catchError(() => of(this.defaultTypes()))
    );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<any>(`${environment.apiUrl}/categories`).pipe(
      map(res => { const l = Array.isArray(res) ? res : []; return l.length ? l : this.defaultCategories(); }),
      catchError(() => of(this.defaultCategories()))
    );
  }

  // ─── Utilitaires publics ──────────────────────────────────────────────────

  buildFileUrl(relativeUrl: string): string {
    if (!relativeUrl)                    return '';
    if (relativeUrl.startsWith('http'))  return relativeUrl;
    return `${this.serverBase.replace(/\/$/,'')}${relativeUrl.startsWith('/') ? relativeUrl : '/'+relativeUrl}`;
  }

  base64ToBlob(base64: string, mimeType: string): Blob {
    const byteString  = atob(base64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array  = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) uint8Array[i] = byteString.charCodeAt(i);
    return new Blob([uint8Array], { type: mimeType });
  }

  private defaultTypes(): RapportType[] {
    return ['rapport_trimestriel','rapport_annuel','rapport_impact','rapport_special','autre'];
  }

  private defaultCategories(): string[] {
    return ['Rapport officiel','Statistiques','Impact social','Finances','Évaluation','Projets','Volontaires'];
  }
}