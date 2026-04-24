// src/app/features/candidats/services/service_candi/candidature.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of, switchMap, throwError, tap } from 'rxjs';
import { Candidature, CandidatureStats } from '../../models/candidature.model';
import { Volontaire } from '../../models/volontaire.model';
import { User } from '../../models/user.model';
import { AffectationService } from '../service-affecta/affectation.service';
import { VolontaireService } from '../service_volont/volontaire.service';
import { Project } from '../../models/projects.model';
import { SyncService } from '../../../features/services/sync.service';
import { environment } from '../../environment/environment';

@Injectable({ providedIn: 'root' })
export class CandidatureService {
  private apiUrl = environment.apiUrl;
  private usersUrl = `${environment.apiUrl}/users`;
  private jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(
    private http: HttpClient,
    private affectationService: AffectationService,
    private volontaireService: VolontaireService,
    private syncService: SyncService
  ) {
    console.log('📡 CandidatureService initialisé avec API URL:', this.apiUrl);
  }

  // ==================== UTILITAIRE PROJET ====================

  private incrementerVolontairesProjet(projectId: number | string): Observable<any> {
    const id = this.resolveId(projectId);
    return this.http.get<Project>(`${this.apiUrl}/projets/${id}`).pipe(
      switchMap(projet => {
        const actuel = typeof projet.nombreVolontairesActuels === 'number' ? projet.nombreVolontairesActuels : 0;
        return this.http.patch(`${this.apiUrl}/projets/${id}`, {
          nombreVolontairesActuels: actuel + 1,
          updated_at: new Date().toISOString()
        }, { headers: this.jsonHeaders });
      }),
      catchError(err => {
        console.warn(`⚠️ Incrémentation projet #${id} échouée:`, err);
        return of(null);
      })
    );
  }

  private decrementerVolontairesProjet(projectId: number | string): Observable<any> {
    const id = this.resolveId(projectId);
    return this.http.get<Project>(`${this.apiUrl}/projets/${id}`).pipe(
      switchMap(projet => {
        const actuel = typeof projet.nombreVolontairesActuels === 'number' ? projet.nombreVolontairesActuels : 0;
        return this.http.patch(`${this.apiUrl}/projets/${id}`, {
          nombreVolontairesActuels: Math.max(0, actuel - 1),
          updated_at: new Date().toISOString()
        }, { headers: this.jsonHeaders });
      }),
      catchError(err => {
        console.warn(`⚠️ Décrémentation projet #${id} échouée:`, err);
        return of(null);
      })
    );
  }

  // ==================== UTILITAIRE ID ====================

  private resolveId(id: any): number | string {
    if (id === undefined || id === null) return id;
    const str = String(id).trim();
    if (str === '' || str === 'NaN') return id;
    if (/^[a-f0-9]+$/i.test(str) && str.length <= 8) return str;
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    return id;
  }

  private idsEqual(a: any, b: any): boolean {
    if (a == null || b == null) return false;
    return String(a).trim() === String(b).trim();
  }

  // ==================== HELPER PATCH ========================

  private patchCandidature(id: number | string, body: object): Observable<Candidature> {
    const resolvedId = this.resolveId(id);
    return this.http.patch<Candidature>(
      `${this.apiUrl}/candidatures/${resolvedId}`,
      body,
      { headers: this.jsonHeaders }
    ).pipe(
      map(c => this.normalizeCandidature(c)),
      catchError(err => {
        console.error(`❌ Erreur PATCH candidature ${resolvedId}:`, err);
        return throwError(() => err);
      })
    );
  }

  // ==================== CRUD DE BASE ====================

  getAll(): Observable<Candidature[]> {
    console.log('📋 Chargement de toutes les candidatures');
    return this.http.get<Candidature[]>(`${this.apiUrl}/candidatures`).pipe(
      map(list => this.normalizeCandidatures(list)),
      catchError(err => {
        console.error('❌ Erreur getAll:', err);
        return of([]);
      })
    );
  }

  getById(id: number | string): Observable<Candidature> {
    const resolvedId = this.resolveId(id);
    return this.http.get<Candidature>(`${this.apiUrl}/candidatures/${resolvedId}`).pipe(
      map(c => this.normalizeCandidature(c)),
      catchError(err => {
        console.error(`❌ Candidature ${resolvedId} non trouvée:`, err);
        return throwError(() => new Error(`Candidature ${id} non trouvée`));
      })
    );
  }

  // ✅ Upload de fichier via l'endpoint existant /api/upload
  uploadFile(formData: FormData): Observable<{ url: string; nom: string; taille: number; success: boolean }> {
    return this.http.post<{ url: string; nom: string; taille: number; success: boolean }>(
      `${this.apiUrl}/upload`,
      formData
    ).pipe(
      catchError(() => throwError(() => new Error('Erreur upload fichier')))
    );
  }

  // ✅ Upload de CV pour une candidature existante
  uploadCV(candidatureId: number | string, file: File): Observable<{ cv_url: string }> {
    const resolvedId = this.resolveId(candidatureId);
    const formData = new FormData();
    formData.append('cv', file);
    return this.http.post<{ cv_url: string }>(
      `${this.apiUrl}/candidatures/${resolvedId}/upload-cv`, formData
    ).pipe(catchError(() => throwError(() => new Error('Erreur upload CV'))));
  }

  create(candidature: Candidature): Observable<Candidature> {
    if (!candidature.volontaireId) {
      return throwError(() => new Error('Le volontaireId est requis'));
    }
    const now = new Date().toISOString();
    const data = this.normalizeCandidature({
      ...candidature,
      cree_le: candidature.cree_le || now,
      mis_a_jour_le: candidature.mis_a_jour_le || now,
      statut: candidature.statut || 'en_attente'
    });
    return this.http.post<Candidature>(`${this.apiUrl}/candidatures`, data, {
      headers: this.jsonHeaders
    }).pipe(
      map(c => {
        this.syncService.notifierCandidatures();
        return this.normalizeCandidature(c);
      }),
      catchError(() => throwError(() => new Error('Erreur création candidature')))
    );
  }

  update(id: number | string, candidature: Candidature): Observable<Candidature> {
    const resolvedId = this.resolveId(id);
    return this.http.put<Candidature>(`${this.apiUrl}/candidatures/${resolvedId}`, {
      ...candidature,
      mis_a_jour_le: new Date().toISOString()
    }, { headers: this.jsonHeaders }).pipe(
      map(c => {
        this.syncService.notifierCandidatures();
        return this.normalizeCandidature(c);
      }),
      catchError(() => throwError(() => new Error('Erreur mise à jour candidature')))
    );
  }

  delete(id: number | string): Observable<void> {
    const resolvedId = this.resolveId(id);
    return this.http.delete<void>(`${this.apiUrl}/candidatures/${resolvedId}`).pipe(
      map(() => { this.syncService.notifierCandidatures(); }),
      catchError(() => throwError(() => new Error('Erreur suppression candidature')))
    );
  }

  // ==================== NORMALISATION ====================

  private normalizeCandidature(c: Candidature): Candidature {
    const now = new Date().toISOString();
    let creeLe = c.cree_le || (c as any).creeLe;
    let misAJourLe = c.mis_a_jour_le || (c as any).misAJourLe;
    
    if (!creeLe || creeLe === 'null' || creeLe === 'undefined') creeLe = now;
    if (!misAJourLe || misAJourLe === 'null' || misAJourLe === 'undefined') misAJourLe = now;
    
    return {
      ...c,
      id: c.id ?? undefined,
      projectId: c.projectId ?? '',
      volontaireId: c.volontaireId ?? '',
      competences: this.normalizeCompetences(c.competences),
      statut: c.statut || 'en_attente',
      typePiece: c.typePiece || 'CNIB',
      numeroPiece: c.numeroPiece || (c as any).numeroPiece || '',
      cv_url: c.cv_url || (c as any).cvUrl || '',
      cree_le: creeLe,
      mis_a_jour_le: misAJourLe
    };
  }

  private normalizeCandidatures(list: Candidature[]): Candidature[] {
    return list.map(c => this.normalizeCandidature(c));
  }

  private normalizeCompetences(competences: any): string[] {
    if (Array.isArray(competences)) return competences;
    if (typeof competences === 'string')
      return competences.split(',').map(c => c.trim()).filter(Boolean);
    return [];
  }

  // ==================== GESTION DES STATUTS ====================

  changerStatut(id: number | string, statut: Candidature['statut']): Observable<Candidature> {
    console.log(`🔄 Changement de statut: candidature ${id} → ${statut}`);
    const resolvedId = this.resolveId(id);
    return this.patchCandidature(resolvedId, {
      statut,
      mis_a_jour_le: new Date().toISOString()
    }).pipe(
      map(c => {
        this.syncService.notifierCandidatures();
        return c;
      }),
      catchError(err => {
        console.error(`❌ Erreur changement statut → ${statut}:`, err);
        return throwError(() => new Error(`Erreur passage statut candidature → ${statut}`));
      })
    );
  }

  refuserCandidature(id: number | string): Observable<Candidature> { 
    return this.changerStatut(id, 'refusee'); 
  }
  
  mettreEnEntretien(id: number | string): Observable<Candidature> { 
    return this.changerStatut(id, 'entretien'); 
  }

  // ==================== ACCEPTATION ====================

  accepterEtAffecterCandidature(candidatureId: number | string): Observable<{
    candidature: Candidature;
    message: string;
  }> {
    console.log(`✅ Tentative d'acceptation candidature:`, candidatureId);
    const resolvedCandidatureId = this.resolveId(candidatureId);

    return this.getById(resolvedCandidatureId).pipe(
      switchMap(candidature => {
        if (!candidature.projectId) {
          return throwError(() => new Error('Candidature non liée à un projet'));
        }
        if (!candidature.volontaireId) {
          return throwError(() => new Error('Candidature non liée à un volontaire'));
        }
        return this.patchCandidature(resolvedCandidatureId, {
          statut: 'acceptee',
          mis_a_jour_le: new Date().toISOString()
        }).pipe(
          map(candidatureAcceptee => {
            this.syncService.notifierCandidatures();
            return {
              candidature: candidatureAcceptee,
              message: `✅ Candidature acceptée avec succès`
            };
          })
        );
      }),
      catchError(error => {
        console.error('❌ Erreur accepterEtAffecterCandidature:', error);
        return throwError(() => error);
      })
    );
  }

  // ==================== MÉTHODES DE CONSULTATION ====================

  getByProject(projectId: number | string): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/candidatures?projectId=${projectId}`).pipe(
      map(list => this.normalizeCandidatures(list)),
      catchError(() => of([]))
    );
  }

  getByVolontaire(volontaireId: number | string): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/candidatures?volontaireId=${volontaireId}`).pipe(
      map(list => this.normalizeCandidatures(list)),
      catchError(() => of([]))
    );
  }

  emailDejaPostule(email: string, projectId: number | string): Observable<boolean> {
    return this.getByProject(projectId).pipe(
      map(list => list.some(c => c.email.toLowerCase() === email.toLowerCase())),
      catchError(() => of(false))
    );
  }

  getCandidaturesRecentes(): Observable<Candidature[]> {
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    return this.getAll().pipe(
      map(list => list.filter(c => c.cree_le && new Date(c.cree_le) >= limite))
    );
  }

  updateNotes(id: number | string, notes: string): Observable<Candidature> {
    return this.patchCandidature(id, {
      notes_interne: notes,
      mis_a_jour_le: new Date().toISOString()
    }).pipe(
      catchError(() => throwError(() => new Error('Erreur mise à jour notes')))
    );
  }

  planifierEntretien(id: number | string, dateEntretien: string, notes?: string): Observable<Candidature> {
    return this.patchCandidature(id, {
      statut: 'entretien',
      date_entretien: dateEntretien,
      notes_interne: notes,
      mis_a_jour_le: new Date().toISOString()
    }).pipe(
      map(c => {
        this.syncService.notifierCandidatures();
        return c;
      }),
      catchError(() => throwError(() => new Error('Erreur planification entretien')))
    );
  }

  // ==================== STATISTIQUES ====================

  getStatsByProject(projectId: number | string): Observable<any> {
    return forkJoin({
      candidatures: this.getByProject(projectId),
      affectations: this.affectationService.getAffectationsActivesByProject(projectId)
    }).pipe(
      map(({ candidatures, affectations }) => ({
        total: candidatures.length,
        en_attente: candidatures.filter(c => c.statut === 'en_attente').length,
        entretien: candidatures.filter(c => c.statut === 'entretien').length,
        acceptee: candidatures.filter(c => c.statut === 'acceptee').length,
        refusee: candidatures.filter(c => c.statut === 'refusee').length,
        volontaires_affectes: affectations.length,
        volontaires_actifs: affectations.filter((a: any) => a.statut === 'active').length,
        par_type_piece: {
          CNIB: candidatures.filter(c => c.typePiece === 'CNIB').length,
          PASSEPORT: candidatures.filter(c => c.typePiece === 'PASSEPORT').length
        }
      })),
      catchError(() => of({
        total: 0, en_attente: 0, entretien: 0, acceptee: 0, refusee: 0,
        volontaires_affectes: 0, volontaires_actifs: 0,
        par_type_piece: { CNIB: 0, PASSEPORT: 0 }
      }))
    );
  }

  getCandidaturesAvecAffectations(projectId: number | string): Observable<any[]> {
    return forkJoin({
      candidatures: this.getByProject(projectId),
      affectations: this.affectationService.getAffectationsByProject(projectId),
      volontaires: this.volontaireService.getVolontaires()
    }).pipe(
      map(({ candidatures, affectations, volontaires }) =>
        candidatures.map(c => {
          const v = volontaires.find(vol => this.idsEqual(vol.id, c.volontaireId));
          const a = v ? affectations.find((aff: any) => this.idsEqual(aff.volontaireId, v.id)) : null;
          return {
            ...c,
            volontaire: v,
            estAffecte: !!a,
            dateAffectation: a?.dateAffectation,
            statutAffectation: a?.statut
          };
        })
      ),
      catchError(() => of([]))
    );
  }

  getCandidaturesByPartenaire(partenaireId: number | string): Observable<any[]> {
    return forkJoin({
      projets: this.http.get<Project[]>(`${this.apiUrl}/projets?partenaireId=${partenaireId}`),
      candidatures: this.getAll()
    }).pipe(
      map(({ projets, candidatures }) => {
        const projetIds = projets.map(p => p.id).filter(Boolean);
        return candidatures
          .filter(c => c.projectId && projetIds.some(pid => this.idsEqual(pid, c.projectId)))
          .map(c => {
            const p = projets.find(proj => this.idsEqual(proj.id, c.projectId));
            return {
              ...c,
              projetTitre: p?.titre || 'Inconnu',
              projetRegion: p?.regionAffectation || '',
              projetStatut: p?.statutProjet || ''
            };
          });
      }),
      catchError(() => of([]))
    );
  }

  getStats(): Observable<CandidatureStats> {
    return this.getAll().pipe(
      map(list => {
        const par_statut: { [s: string]: number } = {};
        const par_type_piece = { CNIB: 0, PASSEPORT: 0 };
        list.forEach(c => {
          par_statut[c.statut] = (par_statut[c.statut] || 0) + 1;
          if (c.typePiece) (par_type_piece as any)[c.typePiece]++;
        });
        return {
          total: list.length,
          en_attente: list.filter(c => c.statut === 'en_attente').length,
          entretien: list.filter(c => c.statut === 'entretien').length,
          acceptee: list.filter(c => c.statut === 'acceptee').length,
          refusee: list.filter(c => c.statut === 'refusee').length,
          par_projet: this.calculerRepartitionProjet(list),
          par_statut,
          par_type_piece
        };
      }),
      catchError(() => of({
        total: 0, en_attente: 0, entretien: 0, acceptee: 0, refusee: 0,
        par_projet: {}, par_statut: {}, par_type_piece: { CNIB: 0, PASSEPORT: 0 }
      }))
    );
  }

  // ==================== UTILITAIRES PRIVÉS ====================

  private calculerRepartitionProjet(list: Candidature[]): { [p: string]: number } {
    const r: { [p: string]: number } = {};
    list.forEach(c => {
      if (c.projectId) { const key = String(c.projectId); r[key] = (r[key] || 0) + 1; }
    });
    return r;
  }
  getCandidaturesAvecProjets(): Observable<any[]> {
  return forkJoin({
    candidatures: this.getAll(),
    projets: this.http.get<Project[]>(`${this.apiUrl}/projets`)
  }).pipe(
    map(({ candidatures, projets }) => {
      const projetsMap = new Map(projets.map(p => [String(p.id), p]));
      return candidatures.map(c => {
        const p = c.projectId != null ? projetsMap.get(String(c.projectId)) : null;
        return {
          ...c,
          region: p?.regionAffectation || 'Non assignée',
          projetTitre: p?.titre || 'Non spécifié',
          projetStatut: p?.statutProjet || 'Non spécifié'
        };
      });
    }),
    catchError(() => of([]))
  );
}
}