// src/app/features/services/rap-eval/rapport.service.ts
//
// ⚠️  CE FICHIER REMPLACE L'ANCIEN service qui référençait volontaireId.
//    Copiez-le dans src/app/features/services/rap-eval/rapport.service.ts
//    (écrasez l'ancien fichier).
//
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  RapportEvaluation,
  RapportAvecDetails,
  NouveauRapport,
  RapportStats
} from '../../models/rapport-evaluation.model';
import { Partenaire } from '../../models/partenaire.model';

@Injectable({ providedIn: 'root' })
export class RapportService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // ============================================================
  // CRUD BASIQUE
  // ============================================================

  getRapports(): Observable<RapportEvaluation[]> {
    return this.http.get<RapportEvaluation[]>(`${this.apiUrl}/rapports`);
  }

  getRapport(id: number | string): Observable<RapportEvaluation> {
    return this.http.get<RapportEvaluation>(`${this.apiUrl}/rapports/${id}`);
  }

  createRapport(rapport: NouveauRapport): Observable<RapportEvaluation> {
    const rapportComplet: Omit<RapportEvaluation, 'id'> = {
      ...rapport,
      partenaireId:     rapport.partenaireId || this.getPartenaireIdFromStorage(),
      dateSoumission:   new Date().toISOString(),
      dateModification: new Date().toISOString(),
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString()
    };
    return this.http.post<RapportEvaluation>(`${this.apiUrl}/rapports`, rapportComplet);
  }

  updateRapport(
    id: number | string,
    rapport: Partial<RapportEvaluation>
  ): Observable<RapportEvaluation> {
    return this.http.patch<RapportEvaluation>(`${this.apiUrl}/rapports/${id}`, {
      ...rapport,
      dateModification: new Date().toISOString(),
      updated_at:       new Date().toISOString()
    });
  }

  deleteRapport(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/rapports/${id}`);
  }

  // ─── Alias pour compatibilité avec les anciens composants ────────────────
  /** @deprecated Utilisez createRapport() */
  creerRapport(rapport: NouveauRapport): Observable<RapportEvaluation> {
    return this.createRapport(rapport);
  }
  /** @deprecated Utilisez deleteRapport() */
  supprimerRapport(id: number | string): Observable<void> {
    return this.deleteRapport(id);
  }
  /** @deprecated Utilisez getRapportsByPartenaire() */
  getRapportsParPartenaire(partenaireId: number | string): Observable<RapportAvecDetails[]> {
    return this.getRapportsByPartenaire(partenaireId);
  }
  /** @deprecated Non implémenté — retourne un Blob vide */
  genererRapportPDF(_id: number | string): Observable<Blob> {
    return of(new Blob([''], { type: 'application/pdf' }));
  }
  /** @deprecated */
  formaterDateEcheance(date?: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR');
  }
  /** @deprecated Retourne un tableau vide — les types de rapport ne sont plus utilisés */
  getTypesRapport(): Observable<any[]> {
    return of([]);
  }

  // ============================================================
  // RAPPORTS PAR PARTENAIRE
  // ============================================================

  getRapportsByPartenaire(partenaireId: number | string): Observable<RapportAvecDetails[]> {
    return forkJoin({
      rapports:    this.http.get<any[]>(
                     `${this.apiUrl}/rapports?partenaireId=${partenaireId}`
                   ).pipe(catchError(() => of([]))),
      projets:     this.http.get<any[]>(`${this.apiUrl}/projets`).pipe(catchError(() => of([]))),
      partenaires: this.http.get<Partenaire[]>(`${this.apiUrl}/partenaires`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ rapports, projets, partenaires }) =>
        rapports.map((rapport: any) => {
          const projet     = projets.find((p: any) => String(p.id) === String(rapport.projetId));
          const partenaire = partenaires.find(p => String(p.id) === String(rapport.partenaireId));

          return {
            ...rapport,
            partenaireNom:     partenaire?.nomStructure ?? `Partenaire #${rapport.partenaireId}`,
            missionNom:        rapport.missionNom ?? projet?.titre ?? `Mission #${rapport.projetId}`,
            missionVolontaire: rapport.missionNom ?? projet?.titre ?? ''
          } as RapportAvecDetails;
        })
      )
    );
  }

  // ============================================================
  // PROJETS ÉLIGIBLES POUR UN RAPPORT (clôturés du partenaire)
  // ============================================================

  getProjetsEligibles(partenaireId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/projets`).pipe(
      map((projets: any[]) =>
        projets.filter((p: any) =>
          String(p.partenaireId) === String(partenaireId) &&
          p.statutProjet === 'cloture'
        )
      ),
      catchError(() => of([]))
    );
  }

  // ============================================================
  // STATISTIQUES
  // ============================================================

  getStatsPartenaire(partenaireId: number | string): Observable<RapportStats> {
    return this.getRapportsByPartenaire(partenaireId).pipe(
      map(rapports => this.calculerStats(rapports))
    );
  }

  // ============================================================
  // GESTION DES ÉTATS
  // ============================================================

  soumettreRapport(id: number | string): Observable<RapportEvaluation> {
    return this.updateRapport(id, {
      statut:         'Soumis',
      dateSoumission: new Date().toISOString()
    });
  }

  sauvegarderBrouillon(rapport: NouveauRapport): Observable<RapportEvaluation> {
    return this.createRapport({ ...rapport, statut: 'Brouillon' });
  }

  validerRapport(id: number | string, feedback?: string): Observable<RapportEvaluation> {
    return this.updateRapport(id, {
      statut:         'Validé',
      feedbackPNVB:   feedback,
      dateValidation: new Date().toISOString(),
      validePar:      'admin@pnvb.sn'
    });
  }

  rejeterRapport(id: number | string, raison: string): Observable<RapportEvaluation> {
    return this.updateRapport(id, { statut: 'Rejeté', feedbackPNVB: raison });
  }

  // ============================================================
  // UTILITAIRE — partenaireId depuis le localStorage
  // ============================================================

  getPartenaireIdFromStorage(): string {
    try {
      // Priorité 1 : userData (format AuthService Anthropic)
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        if (user?.id) return String(user.id);
      }
      // Priorité 2 : currentUser (format legacy)
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        const user = JSON.parse(currentUser);
        if (user?.id) return String(user.id);
      }
    } catch (e) {
      console.error('RapportService — Erreur lecture localStorage:', e);
    }
    console.warn('RapportService — partenaireId introuvable');
    return '';
  }

  // ============================================================
  // CONFIGURATION
  // ============================================================

  getPeriodesDisponibles(): string[] {
    const y = new Date().getFullYear();
    return [`T1-${y}`, `T2-${y}`, `T3-${y}`, `T4-${y}`, 'Final', 'Exceptionnel'];
  }

  getStatutsDisponibles(): string[] {
    return ['Brouillon', 'Soumis', 'Lu par PNVB', 'Validé', 'Rejeté'];
  }

  getCriteresEvaluation(): { code: string; libelle: string; description: string }[] {
    return [
      { code: 'integration',       libelle: 'Intégration',             description: "Capacité à s'intégrer dans l'équipe et la structure" },
      { code: 'competences',       libelle: 'Compétences',             description: 'Maîtrise des compétences requises pour la mission' },
      { code: 'initiative',        libelle: 'Initiative',              description: "Prise d'initiative et autonomie" },
      { code: 'collaboration',     libelle: 'Collaboration',           description: 'Travail en équipe et communication' },
      { code: 'respectEngagement', libelle: 'Respect des engagements', description: 'Ponctualité et respect des délais' }
    ];
  }

  // ============================================================
  // PRIVÉ
  // ============================================================

  private calculerStats(rapports: RapportAvecDetails[]): RapportStats {
    const total     = rapports.length;
    const soumis    = rapports.filter(r => r.statut === 'Soumis').length;
    const valide    = rapports.filter(r => r.statut === 'Validé').length;
    const brouillon = rapports.filter(r => r.statut === 'Brouillon').length;
    const rejete    = rapports.filter(r => r.statut === 'Rejeté').length;
    const enAttente = rapports.filter(r =>
      r.statut === 'Lu par PNVB' || r.statut === 'En attente'
    ).length;

    const vals = rapports
      .filter(r => r.statut === 'Validé' || r.statut === 'Soumis')
      .map(r => r.evaluationGlobale);

    const moyenneEvaluation = vals.length > 0
      ? vals.reduce((a, b) => a + b, 0) / vals.length
      : 0;

    const parStatut = rapports.reduce((acc: Record<string, number>, r) => {
      acc[r.statut] = (acc[r.statut] || 0) + 1; return acc;
    }, {});
    const parPeriode = rapports.reduce((acc: Record<string, number>, r) => {
      acc[r.periode] = (acc[r.periode] || 0) + 1; return acc;
    }, {});
    const parPartenaire = rapports.reduce((acc: Record<string, number>, r) => {
      const id = String(r.partenaireId);
      acc[id] = (acc[id] || 0) + 1; return acc;
    }, {});

    return {
      total, soumis, valide, brouillon, rejete, enAttente,
      moyenneEvaluation: Number(moyenneEvaluation.toFixed(1)),
      parStatut, parPeriode, parPartenaire
    };
  }
}