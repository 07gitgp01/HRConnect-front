// src/app/features/services/rapport-ptf/rapport-ptf.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  RapportPTF, 
  RapportPTFResponse, 
  RapportPTFUploadRequest 
} from '../../models/rapport-ptf.model';

@Injectable({
  providedIn: 'root'
})
export class RapportPTFService {
  private apiUrl = 'http://localhost:3000/rapports';

  constructor(private http: HttpClient) {}

  getRapportsForPTF(partenairePTFId?: string | number, params?: any): Observable<RapportPTFResponse> {
    let httpParams = new HttpParams();
    
    if (params?.page) {
      httpParams = httpParams.set('_page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('_limit', params.limit.toString());
    }
    
    if (params?.type) {
      httpParams = httpParams.set('type', params.type);
    }
    if (params?.search) {
      httpParams = httpParams.set('q', params.search);
    }
    
    if (params?.sortBy) {
      httpParams = httpParams.set('_sort', params.sortBy);
    }
    if (params?.sortOrder) {
      httpParams = httpParams.set('_order', params.sortOrder);
    }
    
    if (partenairePTFId) {
      httpParams = httpParams.set('partenairePTFId', partenairePTFId.toString());
    }
    
    return this.http.get<RapportPTF[]>(this.apiUrl, { params: httpParams, observe: 'response' })
      .pipe(
        map(response => {
          const rapports = response.body || [];
          const total = parseInt(response.headers.get('X-Total-Count') || rapports.length.toString(), 10);
          
          return {
            rapports,
            total,
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalPages: Math.ceil(total / (params?.limit || 10))
          };
        })
      );
  }

  uploadRapport(rapportData: RapportPTFUploadRequest, file: File): Observable<RapportPTF> {
    const rapport: RapportPTF = {
      id: Date.now(),
      titre: rapportData.titre,
      type: rapportData.type,
      description: rapportData.description || '',
      date: new Date().toISOString(),
      url: `/assets/rapports/${file.name}`,
      partenairePTFId: rapportData.partenairePTFId,
      categories: rapportData.categories || [],
      taille: file.size,
      statut: 'actif',
      metadata: rapportData.metadata || {}
    };
    
    return this.http.post<RapportPTF>(this.apiUrl, rapport);
  }

  deleteRapport(rapportId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${rapportId}`);
  }

  getTypes(): Observable<string[]> {
    return of([
      'rapport_trimestriel',
      'rapport_annuel',
      'rapport_impact',
      'rapport_special',
      'autre'
    ]);
  }

  getCategories(): Observable<string[]> {
    return of([
      'Rapport officiel',
      'Statistiques',
      'Impact social',
      'Finances',
      'Évaluation',
      'Projets',
      'Volontaires'
    ]);
  }
}