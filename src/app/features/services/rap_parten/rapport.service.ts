// src/app/features/services/rap_parten/rapport.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  RapportEvaluation,
  RapportAvecDetails,
  NouveauRapport,
  RapportStats,
} from '../../models/rapport-evaluation.model';
import { Partenaire } from '../../models/partenaire.model';
import { environment } from '../../environment/environment';

// Type local pour compatibilité avec gestion-rapports.component
type AnyRapport = RapportEvaluation & {
  titre?:          string;
  typeRapportId?:  number;
  missionId?:      number | string;
  dateCreation?:   string;
  dateEcheance?:   string;
  description?:    string;
  contenu?:        any;
  statut?:         RapportEvaluation['statut'] | 'brouillon' | 'soumis' | 'valide' | 'rejete' | 'en_retard';
  [key: string]:   any;
};

@Injectable({ providedIn: 'root' })
export class RapportService {
  // ✅ Utilisation de environment.apiUrl au lieu de 'http://localhost:3000'
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('📡 RapportService initialisé avec API URL:', this.apiUrl);
  }

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
    const now = new Date().toISOString();
    const payload = {
      ...rapport,
      partenaireId:     rapport.partenaireId || this.getPartenaireIdFromStorage(),
      dateSoumission:   now,
      dateModification: now,
      created_at:       now,
      updated_at:       now
    };
    return this.http.post<RapportEvaluation>(`${this.apiUrl}/rapports`, payload);
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
  // PROJETS ÉLIGIBLES
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

  soumettreRapport(id: number | string): Observable<any> {
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
  // UTILITAIRES
  // ============================================================

  getPartenaireIdFromStorage(): string {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        if (user?.id) return String(user.id);
      }
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        const user = JSON.parse(currentUser);
        if (user?.id) return String(user.id);
      }
    } catch (e) {
      console.error('RapportService — Erreur lecture localStorage:', e);
    }
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
  // ALIAS DE COMPATIBILITÉ — gestion-rapports.component.ts
  // ============================================================

  /** Alias de deleteRapport(). */
  supprimerRapport(id: number | string): Observable<void> {
    return this.deleteRapport(id);
  }

  /** Alias de getRapportsByPartenaire(). */
  getRapportsParPartenaire(partenaireId: number | string): Observable<any[]> {
    return this.getRapportsByPartenaire(partenaireId);
  }

  /**
   * Accepte Partial<any> pour compatibilité avec gestion-rapports
   * qui passe des objets partiels de type Rapport (rapport.model.ts).
   */
  creerRapport(data: Partial<AnyRapport>): Observable<any> {
    const partenaireId = data.partenaireId || this.getPartenaireIdFromStorage();
    const now = new Date().toISOString();
    const payload: any = {
      // Champs NouveauRapport
      partenaireId,
      projetId:          data.projetId      ?? data.missionId ?? '',
      missionNom:        data.titre         ?? data.missionNom ?? '',
      periode:           data.periode       ?? 'Non spécifié',
      evaluationGlobale: data.evaluationGlobale ?? 0,
      criteres: data.criteres ?? {
        integration: 0, competences: 0, initiative: 0,
        collaboration: 0, respectEngagement: 0
      },
      commentaires:  data.description ?? data.commentaires ?? '',
      statut:        data.statut      ?? 'Brouillon',
      // Champs propres à rapport.model.ts
      titre:         data.titre,
      typeRapportId: data.typeRapportId,
      missionId:     data.missionId,
      dateEcheance:  data.dateEcheance,
      contenu:       data.contenu,
      // Timestamps
      dateCreation:     now,
      dateSoumission:   now,
      dateModification: now,
      created_at:       now,
      updated_at:       now,
      // Spread en dernier pour préserver toutes les propriétés supplémentaires
      ...data
    };
    return this.http.post<any>(`${this.apiUrl}/rapports`, payload);
  }

  /** Génère un PDF (stub — retourne un Blob vide). */
  genererRapportPDF(_id: number | string): Observable<Blob> {
    return of(new Blob([''], { type: 'application/pdf' }));
  }

  /**
   * Formate une date d'échéance.
   * Retourne { texte, classe } attendu par gestion-rapports.component.ts.
   */
  formaterDateEcheance(date?: string): { texte: string; classe: string } {
    if (!date) return { texte: '—', classe: 'secondary' };

    const echeance  = new Date(date);
    const now       = new Date();
    const diffJours = Math.ceil((echeance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const texteDate = echeance.toLocaleDateString('fr-FR');

    if (diffJours < 0)   return { texte: `${Math.abs(diffJours)}j de retard`, classe: 'danger'    };
    if (diffJours === 0) return { texte: "Aujourd'hui",                        classe: 'warning'   };
    if (diffJours <= 7)  return { texte: `Dans ${diffJours}j`,                 classe: 'warning'   };
    if (diffJours <= 30) return { texte: texteDate,                            classe: 'info'      };
    return               { texte: texteDate,                                   classe: 'secondary' };
  }

  /**
   * Retourne les types de rapport depuis json-server.
   * Ajouter une entrée "typesRapport" dans db.json pour l'activer.
   */
  getTypesRapport(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/typesRapport`).pipe(
      catchError(() => of([]))
    );
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