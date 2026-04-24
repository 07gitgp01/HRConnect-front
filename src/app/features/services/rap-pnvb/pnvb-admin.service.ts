// src/app/features/services/rap-pnvb/pnvb-admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { RapportEvaluation } from '../../models/rapport-evaluation.model';
import { Partenaire }        from '../../models/partenaire.model';
import { environment } from '../../environment/environment';

// ── DTO enrichi côté admin ──────────────────────────────────────────────────
export interface RapportAdmin extends RapportEvaluation {
  partenaireNom:     string;
  missionVolontaire: string;  // alias lisible de missionNom
}

export interface StatsAdmin {
  totalRapports:    number;
  rapportsSoumis:   number;
  rapportsValides:  number;
  rapportsRejetes:  number;
  rapportsEnAttente: number;
  moyenneGenerale:  number;
}

@Injectable({ providedIn: 'root' })
export class PnvbAdminService {
  // ✅ Utilisation de environment.apiUrl
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('📡 PnvbAdminService initialisé avec API URL:', this.apiUrl);
  }

  // ── Récupérer tous les rapports enrichis ────────────────────────────────

  getAllRapports(): Observable<RapportAdmin[]> {
    return forkJoin({
      rapports:   this.http.get<RapportEvaluation[]>(`${this.apiUrl}/rapports`).pipe(catchError(() => of([]))),
      partenaires: this.http.get<Partenaire[]>(`${this.apiUrl}/partenaires`).pipe(catchError(() => of([]))),
      projets:    this.http.get<any[]>(`${this.apiUrl}/projets`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ rapports, partenaires, projets }) =>
        rapports.map(rapport => {
          const r          = rapport as any;
          const partenaire = partenaires.find(p => String(p.id) === String(rapport.partenaireId));
          const projet     = projets.find(p => String(p.id) === String(r.projetId));

          return {
            ...rapport,
            partenaireNom:     partenaire?.nomStructure ?? `Partenaire #${rapport.partenaireId}`,
            missionVolontaire: r.missionNom ?? projet?.titre ?? projet?.title ?? `Mission #${r.projetId ?? '?'}`,
          } as RapportAdmin;
        })
      )
    );
  }

  getRapportAdmin(id: number | string): Observable<RapportAdmin> {
    return forkJoin({
      rapport:    this.http.get<RapportEvaluation>(`${this.apiUrl}/rapports/${id}`),
      partenaires: this.http.get<Partenaire[]>(`${this.apiUrl}/partenaires`).pipe(catchError(() => of([]))),
      projets:    this.http.get<any[]>(`${this.apiUrl}/projets`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ rapport, partenaires, projets }) => {
        const r          = rapport as any;
        const partenaire = partenaires.find(p => String(p.id) === String(rapport.partenaireId));
        const projet     = projets.find(p => String(p.id) === String(r.projetId));

        return {
          ...rapport,
          partenaireNom:     partenaire?.nomStructure ?? `Partenaire #${rapport.partenaireId}`,
          missionVolontaire: r.missionNom ?? projet?.titre ?? projet?.title ?? `Mission #${r.projetId ?? '?'}`,
        } as RapportAdmin;
      })
    );
  }

  // ── Statistiques ────────────────────────────────────────────────────────

  getStatsAdmin(): Observable<StatsAdmin> {
    return this.getAllRapports().pipe(
      map(rapports => {
        const vals = rapports
          .filter(r => r.statut === 'Validé' || r.statut === 'Soumis')
          .map(r => r.evaluationGlobale);

        const moyenne = vals.length > 0
          ? vals.reduce((a, b) => a + b, 0) / vals.length
          : 0;

        return {
          totalRapports:     rapports.length,
          rapportsSoumis:    rapports.filter(r => r.statut === 'Soumis').length,
          rapportsValides:   rapports.filter(r => r.statut === 'Validé').length,
          rapportsRejetes:   rapports.filter(r => r.statut === 'Rejeté').length,
          rapportsEnAttente: rapports.filter(r =>
            r.statut === 'Lu par PNVB' || r.statut === 'En attente'
          ).length,
          moyenneGenerale:   Number(moyenne.toFixed(1))
        };
      })
    );
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  marquerCommeLu(id: number | string): Observable<RapportEvaluation> {
    return this.http.patch<RapportEvaluation>(`${this.apiUrl}/rapports/${id}`, {
      statut:           'Lu par PNVB',
      dateModification: new Date().toISOString(),
      updated_at:       new Date().toISOString()
    });
  }

  validerRapport(id: number | string, feedback?: string): Observable<RapportEvaluation> {
    return this.http.patch<RapportEvaluation>(`${this.apiUrl}/rapports/${id}`, {
      statut:           'Validé',
      feedbackPNVB:     feedback || null,
      dateValidation:   new Date().toISOString(),
      validePar:        'admin@pnvb.sn',
      dateModification: new Date().toISOString(),
      updated_at:       new Date().toISOString()
    });
  }

  rejeterRapport(id: number | string, raison: string): Observable<RapportEvaluation> {
    return this.http.patch<RapportEvaluation>(`${this.apiUrl}/rapports/${id}`, {
      statut:           'Rejeté',
      feedbackPNVB:     raison,
      dateModification: new Date().toISOString(),
      updated_at:       new Date().toISOString()
    });
  }

  // ── Export ───────────────────────────────────────────────────────────────

  exportRapports(format: 'excel' | 'csv' = 'csv'): Observable<Blob> {
    return this.getAllRapports().pipe(
      map(rapports => {
        const headers = [
          'ID', 'Partenaire', 'Mission', 'Période',
          'Évaluation', 'Statut', 'Date soumission', 'Commentaires'
        ].join(';');

        const rows = rapports.map(r =>
          [
            r.id,
            `"${r.partenaireNom}"`,
            `"${r.missionVolontaire}"`,
            r.periode,
            r.evaluationGlobale,
            r.statut,
            r.dateSoumission ? new Date(r.dateSoumission).toLocaleDateString('fr-FR') : '',
            `"${(r.commentaires ?? '').replace(/"/g, '""')}"`
          ].join(';')
        );

        const csv = [headers, ...rows].join('\n');
        return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      }),
      catchError(() => of(new Blob([''], { type: 'text/csv' })))
    );
  }

  supprimerRapport(id: number | string): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/rapports/${id}`);
}

}