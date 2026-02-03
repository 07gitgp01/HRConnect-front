// src/app/features/partenaires/services/rap_ptf/rapports-ptf-consultation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  RapportPTF, 
  RapportPTFResponse, 
  RapportPTFSearchParams 
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
    
    // Ajouter le partenaire PTF ID
    httpParams = httpParams.set('partenaireId', partenairePTFId.toString());
    
    // Ajouter les paramètres de recherche
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
    
    return this.http.get<RapportPTFResponse>(`${this.apiUrl}/consultation`, { params: httpParams }).pipe(
      catchError(error => {
        console.error('❌ Erreur chargement rapports:', error);
        return of({
          rapports: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0
        });
      })
    );
  }

  /**
   * Marquer un rapport comme consulté
   */
  marquerCommeConsulte(rapportId: number, partenairePTFId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${rapportId}/consulter`, { partenairePTFId }).pipe(
      catchError(error => {
        console.error('❌ Erreur marquage consultation:', error);
        return of({ success: false });
      })
    );
  }

  /**
   * Télécharger un rapport
   */
  telechargerRapport(rapportId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${rapportId}/telecharger`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('❌ Erreur téléchargement:', error);
        throw error;
      })
    );
  }

  /**
   * Récupérer les statistiques de consultation
   */
  getStatsConsultation(partenairePTFId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/${partenairePTFId}`).pipe(
      catchError(error => {
        console.error('❌ Erreur chargement stats:', error);
        return of({
          totalRapports: 0,
          rapportsConsultes: 0,
          derniereConsultation: null
        });
      })
    );
  }

  /**
   * Récupérer les rapports récents
   */
  getRapportsRecents(partenairePTFId: number, limit: number = 5): Observable<RapportPTF[]> {
    return this.http.get<RapportPTF[]>(`${this.apiUrl}/recents/${partenairePTFId}?limit=${limit}`).pipe(
      catchError(error => {
        console.error('❌ Erreur chargement rapports récents:', error);
        return of([]);
      })
    );
  }

  /**
   * Récupérer les types de rapports disponibles
   */
  getTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/types`).pipe(
      catchError(error => {
        console.error('❌ Erreur chargement types:', error);
        return of([
          'rapport_trimestriel',
          'rapport_annuel', 
          'rapport_impact',
          'rapport_special',
          'autre'
        ]);
      })
    );
  }

  /**
   * Récupérer les catégories disponibles
   */
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`).pipe(
      catchError(error => {
        console.error('❌ Erreur chargement catégories:', error);
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
}