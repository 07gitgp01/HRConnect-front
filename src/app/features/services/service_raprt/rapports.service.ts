import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candidature } from '../../models/candidature.model';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class RapportsService {

  // ✅ Utilisation de environment.apiUrl
  private apiUrl = `${environment.apiUrl}/candidatures`;

  constructor(private http: HttpClient) {
    console.log('📡 RapportsService initialisé avec API URL:', this.apiUrl);
  }

  getCandidatures(): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(this.apiUrl);
  }
}