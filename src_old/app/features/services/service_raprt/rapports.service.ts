import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candidature } from '../../models/candidature.model';

@Injectable({
  providedIn: 'root'
})
export class RapportsService {

  private apiUrl = 'http://localhost:3000/candidatures';

  constructor(private http: HttpClient) {}

  getCandidatures(): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(this.apiUrl);
  }
}
