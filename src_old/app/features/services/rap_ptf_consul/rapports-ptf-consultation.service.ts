// src/app/features/partenaires/services/rap_ptf_consul/rapports-ptf-consultation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { 
  RapportPTF, 
  RapportPTFResponse, 
  RapportPTFSearchParams,
  RapportType,
  StatsConsultation
} from '../../models/rapport-ptf.model';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class RapportsPtfConsultationService {
  private apiUrl = `${environment.apiUrl}/rapports-ptf`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer les rapports disponibles pour un PTF spécifique
   */
  getRapportsForPTF(partenairePTFId: number, params?: RapportPTFSearchParams): Observable<RapportPTFResponse> {
    let httpParams = new HttpParams();
    
    httpParams = httpParams.set('partenaireId', partenairePTFId.toString());
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.type) httpParams = httpParams.set('type', params.type);
      if (params.categorie) httpParams = httpParams.set('categorie', params.categorie);
      if (params.periode) httpParams = httpParams.set('periode', params.periode);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    }
    
    console.log('📡 API Call - getRapportsForPTF:', {
      url: `${this.apiUrl}/consultation`,
      partenairePTFId,
      params: httpParams.toString()
    });
    
    return this.http.get<RapportPTFResponse>(`${this.apiUrl}/consultation`, { params: httpParams }).pipe(
      tap(response => {
        console.log('✅ Rapports reçus:', {
          total: response.total,
          count: response.rapports?.length || 0,
          page: response.page
        });
      }),
      map(response => {
        if (!response || !response.rapports) {
          console.warn('⚠️ Réponse API incomplète, normalisation...');
          return {
            rapports: [],
            total: 0,
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalPages: 0
          };
        }
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Erreur chargement rapports:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
          error: error.error
        });
        
        return of({
          rapports: [],
          total: 0,
          page: params?.page || 1,
          limit: params?.limit || 10,
          totalPages: 0
        });
      })
    );
  }

  /**
   * Marquer un rapport comme consulté
   */
  marquerCommeConsulte(rapportId: number, partenairePTFId: number): Observable<any> {
    console.log('📝 Marquage consultation:', { rapportId, partenairePTFId });
    
    const body = {
      partenairePTFId,
      dateConsultation: new Date().toISOString()
    };
    
    return this.http.post(`${this.apiUrl}/${rapportId}/consulter`, body).pipe(
      tap(() => {
        console.log('✅ Consultation marquée avec succès');
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Erreur marquage consultation:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Télécharger un rapport
   */
  telechargerRapport(rapportId: number): Observable<Blob> {
    console.log('📥 Téléchargement rapport:', rapportId);
    
    return this.http.get(`${this.apiUrl}/${rapportId}/telecharger`, {
      responseType: 'blob'
    }).pipe(
      tap((blob: Blob) => {
        console.log('✅ Rapport téléchargé:', {
          size: blob.size,
          type: blob.type
        });
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Erreur téléchargement rapport:', {
          status: error.status,
          message: error.message
        });
        
        return throwError(() => new Error(
          error.status === 404 
            ? 'Rapport non trouvé' 
            : 'Erreur lors du téléchargement du rapport'
        ));
      })
    );
  }

  /**
   * Récupérer les statistiques de consultation
   */
  getStatsConsultation(partenairePTFId: number): Observable<StatsConsultation> {
    console.log('📊 Chargement stats consultation:', partenairePTFId);
    
    return this.http.get<StatsConsultation>(`${this.apiUrl}/stats/${partenairePTFId}`).pipe(
      tap(stats => {
        console.log('✅ Stats reçues:', stats);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Erreur chargement stats:', error);
        
        return of({
          totalRapports: 0,
          rapportsConsultes: 0,
          derniereConsultation: null,
          tauxConsultation: 0
        });
      })
    );
  }

  /**
   * Récupérer les rapports récents
   */
  getRapportsRecents(partenairePTFId: number, limit: number = 5): Observable<RapportPTF[]> {
    console.log('📰 Chargement rapports récents:', { partenairePTFId, limit });
    
    return this.http.get<RapportPTF[]>(`${this.apiUrl}/recents/${partenairePTFId}`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(
      tap(rapports => {
        console.log('✅ Rapports récents reçus:', rapports.length);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Erreur chargement rapports récents:', error);
        return of([]);
      })
    );
  }

  /**
   * Récupérer les types de rapports disponibles
   * CORRECTION: Retourne Observable<RapportType[]>
   */
  getTypes(): Observable<RapportType[]> {
    return this.http.get<RapportType[]>(`${this.apiUrl}/types`).pipe(
      tap(types => {
        console.log('✅ Types disponibles:', types);
      }),
      catchError((error: HttpErrorResponse) => {
        console.warn('⚠️ Erreur chargement types depuis API, utilisation fallback');
        
        const fallbackTypes: RapportType[] = [
          'rapport_trimestriel',
          'rapport_annuel', 
          'rapport_impact',
          'rapport_special',
          'autre'
        ];
        
        return of(fallbackTypes);
      })
    );
  }

  /**
   * Récupérer les catégories disponibles
   */
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`).pipe(
      tap(categories => {
        console.log('✅ Catégories disponibles:', categories);
      }),
      catchError((error: HttpErrorResponse) => {
        console.warn('⚠️ Erreur chargement catégories depuis API, utilisation fallback');
        
        return of([
          'Rapport officiel',
          'Statistiques',
          'Impact social',
          'Finances',
          'Évaluation',
          'Projets',
          'Volontaires'
        ]);
      })
    );
  }

  /**
   * Vérifier si un rapport a été consulté par un PTF
   */
  verifierConsultation(rapportId: number, partenairePTFId: number): Observable<boolean> {
    return this.http.get<{ consulte: boolean }>(
      `${this.apiUrl}/${rapportId}/consulte/${partenairePTFId}`
    ).pipe(
      map(response => response.consulte),
      catchError(() => of(false))
    );
  }
}