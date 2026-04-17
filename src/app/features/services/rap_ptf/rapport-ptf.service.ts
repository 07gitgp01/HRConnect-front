// src/app/features/services/rap_ptf/rapport-ptf.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  RapportPTF,
  RapportPTFResponse,
  RapportPTFUploadRequest
} from '../../models/rapport-ptf.model';
import { environment } from '../../environment/environment';

@Injectable({ providedIn: 'root' })
export class RapportPTFService {
  private apiUrl      = `${environment.apiUrl}/rapports-ptf`;
  private uploadUrl   = `${environment.apiUrl}/upload-rapport`;        // endpoint backend upload
  private serverBase  = environment.apiUrl.replace(/\/api$/, '');      // http://localhost:3000

  constructor(private http: HttpClient) {}

  // ─── Liste (admin — tous les rapports) ────────────────────────────────────

  getRapportsForPTF(partenairePTFId?: string, params?: any): Observable<RapportPTFResponse> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((reponse: any) => {
        // Normaliser — json-server peut retourner un tableau ou un objet
        let tous: RapportPTF[] = this.normaliserReponse(reponse);

        // Filtres optionnels
        if (params?.type)   tous = tous.filter(r => r.type === params.type);
        if (params?.search) {
          const q = params.search.toLowerCase();
          tous = tous.filter(r =>
            r.titre?.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q)
          );
        }

        // Tri
        const sortBy    = params?.sortBy    || 'date';
        const sortOrder = params?.sortOrder || 'desc';
        tous.sort((a: any, b: any) => {
          const cmp = String(a[sortBy] || '') < String(b[sortBy] || '') ? -1 : 1;
          return sortOrder === 'desc' ? -cmp : cmp;
        });

        // Pagination
        const total      = tous.length;
        const page       = params?.page  || 1;
        const limit      = params?.limit || 10;
        const start      = (page - 1) * limit;
        return {
          rapports:   tous.slice(start, start + limit),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        };
      }),
      catchError(() => of({ rapports: [], total: 0, page: 1, limit: 10, totalPages: 0 }))
    );
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  /**
   * json-server ne gère pas les fichiers multipart.
   * On sauvegarde les métadonnées en JSON (POST /rapports-ptf)
   * et on stocke le fichier en base64 dans le champ `fichierBase64`
   * OU on utilise un backend séparé pour l'upload.
   *
   * ✅ Solution retenue : POST JSON avec fichierBase64 + tous les champs multi-PTF
   */
  uploadRapport(rapportData: RapportPTFUploadRequest, file: File): Observable<RapportPTF> {
    return new Observable(observer => {
      const reader = new FileReader();

      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];

        // ✅ Construire l'objet complet avec TOUS les destinataires
        const ids = rapportData.partenairePTFIds || [];

        const payload = {
          // Identifiant unique
          id: Date.now(),

          // Champs principaux
          titre:       rapportData.titre,
          type:        rapportData.type,
          description: rapportData.description || '',
          date:        new Date().toISOString(),

          // ✅ Multi-PTF : stocker le tableau complet
          partenairePTFIds: ids,

          // ✅ Rétrocompat singulier : null si global, premier ID si spécifique
          // MAIS on ne se fie PAS à ce champ pour le filtrage — on utilise le tableau
          partenairePTFId: ids.length > 0 ? null : null, // toujours null, filtrage via tableau

          // Fichier
          nomFichier:    file.name,
          taille:        file.size,
          typeFichier:   file.type,
          fichierBase64: base64,

          // URL simulée (chemin relatif)
          url: `/uploads/rapports-ptf/${file.name}`,

          // Métadonnées
          categories: rapportData.categories || [],
          metadata: {
            periode:          rapportData.metadata?.periode || null,
            zoneGeographique: [],
            themes:           []
          },
          statut:    'actif',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log('📤 Upload rapport — destinataires:', ids.length ? ids : 'Tous les PTF');

        this.http.post<RapportPTF>(this.apiUrl, payload).subscribe({
          next:  (r) => { observer.next(r); observer.complete(); },
          error: (e) => observer.error(new Error(e?.error?.message || 'Erreur upload'))
        });
      };

      reader.onerror = () => observer.error(new Error('Erreur lecture fichier'));
      reader.readAsDataURL(file);
    });
  }

  // ─── Téléchargement ───────────────────────────────────────────────────────

  downloadRapport(rapportId: number, rapportUrl?: string): Observable<Blob> {
    // Si on a l'URL du fichier statique, l'utiliser directement
    if (rapportUrl) {
      const urlComplete = this.buildFileUrl(rapportUrl);
      return this.http.get(urlComplete, { responseType: 'blob' }).pipe(
        catchError(() => this.downloadViaBase64(rapportId))
      );
    }
    return this.downloadViaBase64(rapportId);
  }

  /**
   * Récupère le rapport depuis db.json et recrée le blob depuis base64
   */
  private downloadViaBase64(rapportId: number): Observable<Blob> {
    return this.http.get<any>(`${this.apiUrl}/${rapportId}`).pipe(
      map((rapport: any) => {
        if (rapport.fichierBase64) {
          // Recréer le blob depuis base64
          const byteChars   = atob(rapport.fichierBase64);
          const byteArrays  = [];
          for (let i = 0; i < byteChars.length; i += 512) {
            const slice     = byteChars.slice(i, i + 512);
            const byteNums  = new Array(slice.length);
            for (let j = 0; j < slice.length; j++) {
              byteNums[j] = slice.charCodeAt(j);
            }
            byteArrays.push(new Uint8Array(byteNums));
          }
          return new Blob(byteArrays, { type: rapport.typeFichier || 'application/octet-stream' });
        }
        throw new Error('Fichier non trouvé dans la base de données');
      }),
      catchError((err) => throwError(() => new Error(
        err.message || 'Rapport introuvable'
      )))
    );
  }

  // ─── Suppression ─────────────────────────────────────────────────────────

  deleteRapport(rapportId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${rapportId}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => new Error(
        err.error?.message || 'Erreur lors de la suppression'
      )))
    );
  }

  // ─── Types & catégories ──────────────────────────────────────────────────

  getTypes(): Observable<string[]> {
    return this.http.get<any>(`${environment.apiUrl}/types`).pipe(
      map(res => {
        const liste = Array.isArray(res) ? res : [];
        return liste.length ? liste : this.defaultTypes();
      }),
      catchError(() => of(this.defaultTypes()))
    );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<any>(`${environment.apiUrl}/categories`).pipe(
      map(res => {
        const liste = Array.isArray(res) ? res : [];
        return liste.length ? liste : this.defaultCategories();
      }),
      catchError(() => of(this.defaultCategories()))
    );
  }

  // ─── Utilitaires privés ───────────────────────────────────────────────────

  private normaliserReponse(reponse: any): RapportPTF[] {
    if (Array.isArray(reponse))                      return reponse;
    if (reponse && Array.isArray(reponse.rapports))  return reponse.rapports;
    if (reponse && typeof reponse === 'object') {
      const vals = Object.values(reponse);
      if (vals.length && typeof vals[0] === 'object') return vals as RapportPTF[];
    }
    return [];
  }

  private buildFileUrl(relativeUrl: string): string {
    if (!relativeUrl)                   return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    const base = this.serverBase.replace(/\/$/, '');
    const path = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    return `${base}${path}`;
  }

  private defaultTypes(): string[] {
    return ['rapport_trimestriel', 'rapport_annuel', 'rapport_impact', 'rapport_special', 'autre'];
  }

  private defaultCategories(): string[] {
    return ['Rapport officiel', 'Statistiques', 'Impact social', 'Finances', 'Évaluation', 'Projets', 'Volontaires'];
  }
}