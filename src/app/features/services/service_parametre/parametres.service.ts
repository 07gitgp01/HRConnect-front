import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Parametres {
  app_name: string;
  logo_url: string;
  email_contact: string;
  telephone: string;
  adresse: string;
  langue: string;
  theme: 'clair' | 'sombre';
  notifications: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ParametresService {
  private apiUrl = 'http://localhost:3000/parametres';

  constructor(private http: HttpClient) {}

  getParametres(): Observable<Parametres> {
    return this.http.get<Parametres>(this.apiUrl);
  }

  updateParametres(data: Parametres): Observable<Parametres> {
    return this.http.put<Parametres>(this.apiUrl, data);
  }
}
