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

@Injectable({ providedIn: 'root' })
export class CandidatureService {
  private apiUrl   = 'http://localhost:3000';
  private usersUrl = 'http://localhost:3000/users';

  private jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(
    private http:               HttpClient,
    private affectationService: AffectationService,
    private volontaireService:  VolontaireService,
    private syncService:        SyncService
  ) {}

  // ==================== UTILITAIRE PROJET ====================

  private incrementerVolontairesProjet(projectId: number | string): Observable<any> {
    const id = this.resolveId(projectId);
    return this.http.get<Project>(`${this.apiUrl}/projets/${id}`).pipe(
      switchMap(projet => {
        const actuel = typeof projet.nombreVolontairesActuels === 'number'
          ? projet.nombreVolontairesActuels : 0;
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
        const actuel = typeof projet.nombreVolontairesActuels === 'number'
          ? projet.nombreVolontairesActuels : 0;
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

  /**
   * Résout un ID sans le convertir en décimal pour les IDs hex
   */
  private resolveId(id: any): number | string {
    console.log('🔍 [resolveId] Entrée:', id, 'type:', typeof id);
    
    if (id === undefined || id === null) {
      console.warn('⚠️ [resolveId] ID null ou undefined');
      return id;
    }
    
    const str = String(id).trim();
    console.log('🔍 [resolveId] Chaîne:', str);
    
    if (str === '' || str === 'NaN') {
      console.warn('⚠️ [resolveId] Chaîne vide ou NaN');
      return id;
    }

    // IMPORTANT: Garder les IDs hex tels quels (ex: "f743", "a2eb")
    if (/^[a-f0-9]+$/i.test(str) && str.length <= 8) {
      console.log('🔍 [resolveId] ID hexadécimal détecté, conservation:', str);
      return str;
    }

    // Si c'est un nombre décimal pur
    if (/^\d+$/.test(str)) {
      const num = parseInt(str, 10);
      console.log('🔍 [resolveId] ID numérique pur:', num);
      return num;
    }

    console.log('🔍 [resolveId] ID conservé tel quel:', id);
    return id;
  }

  private idsEqual(a: any, b: any): boolean {
    if (a == null || b == null) return false;
    return String(a).trim() === String(b).trim();
  }

  // ==================== HELPER PATCH ========================

  private patchCandidature(id: number | string, body: object): Observable<Candidature> {
    const resolvedId = this.resolveId(id);
    console.log(`📝 PATCH candidature ${resolvedId} avec:`, body);
    
    return this.http.patch<Candidature>(
      `${this.apiUrl}/candidatures/${resolvedId}`,
      body,
      { headers: this.jsonHeaders }
    ).pipe(
      tap(result => console.log('✅ PATCH réussi:', result)),
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
      tap(candidatures => console.log('📋 Candidatures reçues:', candidatures.map(c => ({ id: c.id, nom: c.nom, statut: c.statut })))),
      map(list => this.normalizeCandidatures(list)),
      catchError(err => {
        console.error('❌ Erreur getAll:', err);
        return of([]);
      })
    );
  }

  getById(id: number | string): Observable<Candidature> {
    const resolvedId = this.resolveId(id);
    console.log(`🔍 Recherche candidature par ID: ${resolvedId}`);
    
    return this.http.get<Candidature>(`${this.apiUrl}/candidatures/${resolvedId}`).pipe(
      tap(c => console.log(`✅ Candidature trouvée:`, c)),
      map(c => this.normalizeCandidature(c)),
      catchError(err => {
        console.error(`❌ Candidature ${resolvedId} non trouvée:`, err);
        return throwError(() => new Error(`Candidature ${id} non trouvée`));
      })
    );
  }

  create(candidature: Candidature): Observable<Candidature> {
    if (!candidature.volontaireId) {
      return throwError(() => new Error('Le volontaireId est requis'));
    }
    const data = this.normalizeCandidature({
      ...candidature,
      cree_le:       new Date().toISOString(),
      mis_a_jour_le: new Date().toISOString(),
      statut:        candidature.statut || 'en_attente'
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
    return {
      ...c,
      id:           c.id ?? undefined,
      projectId:    c.projectId ?? '',
      volontaireId: c.volontaireId ?? '',
      competences:  this.normalizeCompetences(c.competences),
      statut:       c.statut || 'en_attente',
      typePiece:    c.typePiece || 'CNIB'
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

    if (statut === 'refusee') {
      return this.http.get<Candidature>(`${this.apiUrl}/candidatures/${resolvedId}`).pipe(
        switchMap(candidatureActuelle => {
          console.log('📋 Candidature actuelle:', candidatureActuelle);

          const patchCandidature$ = this.patchCandidature(resolvedId, {
            statut: 'refusee',
            mis_a_jour_le: new Date().toISOString()
          });

          if (candidatureActuelle.statut === 'acceptee' && candidatureActuelle.volontaireId) {
            const volontaireId = candidatureActuelle.volontaireId;
            const projectId    = candidatureActuelle.projectId;

            console.log(`🔴 Candidature #${resolvedId} était acceptée → annulation`);

            const annulerAffectation$ = this.affectationService
              .getAffectationsByVolontaire(volontaireId).pipe(
                switchMap(affectations => {
                  const affActive = affectations.find(
                    a => a.statut === 'active' && this.idsEqual(a.projectId, projectId)
                  );
                  if (affActive?.id) {
                    return this.affectationService.annulerAffectation(affActive.id);
                  }
                  return of(null);
                }),
                catchError(() => of(null))
              );

            const retrograderVolontaire$ = this.http
              .get<Candidature[]>(`${this.apiUrl}/candidatures?volontaireId=${volontaireId}`).pipe(
                switchMap(toutesLesCandidatures => {
                  const autresAcceptees = toutesLesCandidatures.filter(
                    c => !this.idsEqual(c.id, resolvedId) && c.statut === 'acceptee'
                  );
                  if (autresAcceptees.length > 0) return of(null);
                  const volId = this.resolveId(volontaireId);
                  return this.http.patch<Volontaire>(
                    `${this.apiUrl}/volontaires/${volId}`,
                    { statut: 'En attente', updated_at: new Date().toISOString() },
                    { headers: this.jsonHeaders }
                  ).pipe(catchError(() => of(null)));
                }),
                catchError(() => of(null))
              );

            const decrementerProjet$ = projectId
              ? this.decrementerVolontairesProjet(projectId) : of(null);

            return forkJoin([
              patchCandidature$,
              annulerAffectation$,
              retrograderVolontaire$,
              decrementerProjet$
            ]).pipe(
              map(([candidature]) => {
                this.syncService.notifierTout();
                return candidature;
              })
            );
          }

          return patchCandidature$;
        }),
        catchError(err => {
          console.error(`❌ Erreur changerStatut → refusee:`, err);
          return throwError(() => new Error('Erreur refus candidature'));
        })
      );
    }

    // Cas général
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
        console.log('📋 Candidature trouvée:', candidature);
        
        if (!candidature.projectId) {
          return throwError(() => new Error('Candidature non liée à un projet'));
        }
        if (!candidature.volontaireId) {
          return throwError(() => new Error('Candidature non liée à un volontaire'));
        }

        console.log(`✅ Acceptation de la candidature #${resolvedCandidatureId}`);

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

  uploadCV(candidatureId: number | string, file: File): Observable<{ cv_url: string }> {
    const resolvedId = this.resolveId(candidatureId);
    const formData = new FormData();
    formData.append('cv', file);
    return this.http.post<{ cv_url: string }>(
      `${this.apiUrl}/candidatures/${resolvedId}/upload-cv`, formData
    ).pipe(catchError(() => throwError(() => new Error('Erreur upload CV'))));
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
      statut:         'entretien',
      date_entretien: dateEntretien,
      notes_interne:  notes,
      mis_a_jour_le:  new Date().toISOString()
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
        total:                candidatures.length,
        en_attente:           candidatures.filter(c => c.statut === 'en_attente').length,
        entretien:            candidatures.filter(c => c.statut === 'entretien').length,
        acceptee:             candidatures.filter(c => c.statut === 'acceptee').length,
        refusee:              candidatures.filter(c => c.statut === 'refusee').length,
        volontaires_affectes: affectations.length,
        volontaires_actifs:   affectations.filter((a: any) => a.statut === 'active').length,
        par_type_piece: {
          CNIB:      candidatures.filter(c => c.typePiece === 'CNIB').length,
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
      volontaires:  this.volontaireService.getVolontaires()
    }).pipe(
      map(({ candidatures, affectations, volontaires }) =>
        candidatures.map(c => {
          const v = volontaires.find(vol => this.idsEqual(vol.id, c.volontaireId));
          const a = v ? affectations.find((aff: any) => this.idsEqual(aff.volontaireId, v.id)) : null;
          return {
            ...c,
            volontaire:        v,
            estAffecte:        !!a,
            dateAffectation:   a?.dateAffectation,
            statutAffectation: a?.statut
          };
        })
      ),
      catchError(() => of([]))
    );
  }

  // ==================== PARTENAIRES ====================

  getCandidaturesByPartenaire(partenaireId: number | string): Observable<any[]> {
    return forkJoin({
      projets:      this.http.get<Project[]>(`${this.apiUrl}/projets?partenaireId=${partenaireId}`),
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
              projetTitre:  p?.titre            || 'Inconnu',
              projetRegion: p?.regionAffectation || '',
              projetStatut: p?.statutProjet      || ''
            };
          });
      }),
      catchError(() => of([]))
    );
  }

  getCandidaturesFiltreesPartenaire(partenaireId: number | string, filtres: any): Observable<any[]> {
    return this.getCandidaturesByPartenaire(partenaireId).pipe(
      map(list => {
        let f = list;
        if (filtres.statut          && filtres.statut          !== 'tous') f = f.filter((c: any) => c.statut === filtres.statut);
        if (filtres.projectId       && filtres.projectId       !== 'tous') f = f.filter((c: any) => this.idsEqual(c.projectId, filtres.projectId));
        if (filtres.typePiece       && filtres.typePiece       !== 'tous') f = f.filter((c: any) => c.typePiece === filtres.typePiece);
        if (filtres.niveau_experience && filtres.niveau_experience !== 'tous') f = f.filter((c: any) => c.niveau_experience === filtres.niveau_experience);
        if (filtres.searchTerm) {
          const t = filtres.searchTerm.toLowerCase();
          f = f.filter((c: any) =>
            c.nom.toLowerCase().includes(t)    ||
            c.prenom.toLowerCase().includes(t) ||
            c.email.toLowerCase().includes(t)
          );
        }
        return f;
      })
    );
  }

  getProjetsPartenaire(partenaireId: number | string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projets?partenaireId=${partenaireId}`).pipe(
      catchError(() => of([]))
    );
  }

  getStats(): Observable<CandidatureStats> {
    return this.getAll().pipe(
      map(list => {
        const par_statut: { [s: string]: number }   = {};
        const par_type_piece = { CNIB: 0, PASSEPORT: 0 };
        list.forEach(c => {
          par_statut[c.statut] = (par_statut[c.statut] || 0) + 1;
          if (c.typePiece) (par_type_piece as any)[c.typePiece]++;
        });
        return {
          total:      list.length,
          en_attente: list.filter(c => c.statut === 'en_attente').length,
          entretien:  list.filter(c => c.statut === 'entretien').length,
          acceptee:   list.filter(c => c.statut === 'acceptee').length,
          refusee:    list.filter(c => c.statut === 'refusee').length,
          par_projet:    this.calculerRepartitionProjet(list),
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

  getCandidaturesAvecProjets(): Observable<any[]> {
    return forkJoin({
      candidatures: this.getAll(),
      projets:      this.http.get<Project[]>(`${this.apiUrl}/projets`)
    }).pipe(
      map(({ candidatures, projets }) => {
        const projetsMap = new Map(projets.map(p => [String(p.id), p]));
        return candidatures.map(c => {
          const p = c.projectId != null ? projetsMap.get(String(c.projectId)) : null;
          return {
            ...c,
            region:       p?.regionAffectation || 'Non assignée',
            projetTitre:  p?.titre             || 'Non spécifié',
            projetStatut: p?.statutProjet      || 'Non spécifié'
          };
        });
      }),
      catchError(() => of([]))
    );
  }

  getStatsDashboard(): Observable<any> {
    return this.getCandidaturesAvecProjets().pipe(
      map(list => ({
        total:      list.length,
        en_attente: list.filter((c: any) => c.statut === 'en_attente').length,
        entretien:  list.filter((c: any) => c.statut === 'entretien').length,
        acceptee:   list.filter((c: any) => c.statut === 'acceptee').length,
        refusee:    list.filter((c: any) => c.statut === 'refusee').length,
        par_region: this.calculerRepartitionRegion(list),
        par_mois:   this.calculerEvolutionMensuelle(list),
        par_type_piece: {
          CNIB:      list.filter((c: any) => c.typePiece === 'CNIB').length,
          PASSEPORT: list.filter((c: any) => c.typePiece === 'PASSEPORT').length
        },
        candidatures_urgentes: this.getCandidaturesUrgentes(list)
      })),
      catchError(() => of({
        total: 0, en_attente: 0, entretien: 0, acceptee: 0, refusee: 0,
        par_region: [], par_mois: [], par_type_piece: { CNIB: 0, PASSEPORT: 0 },
        candidatures_urgentes: []
      }))
    );
  }

  // ==================== UTILITAIRES PRIVÉS ====================

  private calculerRepartitionRegion(list: any[]): any[] {
    const r: { [k: string]: number } = {};
    list.forEach(c => { const k = c.region || 'Non assignée'; r[k] = (r[k] || 0) + 1; });
    return Object.entries(r).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count);
  }

  private calculerEvolutionMensuelle(list: any[]): any[] {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now  = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const date  = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const count = list.filter(c => {
        if (!c.cree_le) return false;
        const d = new Date(c.cree_le);
        return !isNaN(d.getTime()) &&
          d.getMonth()    === date.getMonth()    &&
          d.getFullYear() === date.getFullYear();
      }).length;
      return { mois: `${mois[date.getMonth()]} ${date.getFullYear()}`, count };
    });
  }

  private getCandidaturesUrgentes(list: any[]): any[] {
    const il7j = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return list
      .filter(c => c.statut === 'en_attente' && c.cree_le && new Date(c.cree_le) <= il7j)
      .map(c => ({
        id:              c.id,
        nom:             c.nom,
        prenom:          c.prenom,
        poste_vise:      c.poste_vise,
        date_reception:  c.cree_le,
        region:          c.region,
        typePiece:       c.typePiece
      }))
      .slice(0, 10);
  }

  private calculerRepartitionProjet(list: Candidature[]): { [p: string]: number } {
    const r: { [p: string]: number } = {};
    list.forEach(c => {
      if (c.projectId) { const key = String(c.projectId); r[key] = (r[key] || 0) + 1; }
    });
    return r;
  }

  createCandidature(data: any): Observable<Candidature> { return this.create(data); }

  synchroniserRolesUtilisateurs(): Observable<{ corriges: number; erreurs: number }> {
    return forkJoin({
      volontaires: this.volontaireService.getVolontaires(),
      users:       this.http.get<User[]>(this.usersUrl)
    }).pipe(
      switchMap(({ volontaires, users }) => {
        const aCorrecter = volontaires
          .filter(v => v.statut === 'Actif' && v.userId)
          .filter(v => {
            const user = users.find(u => this.idsEqual(u.id, v.userId));
            return user && user.role === 'candidat';
          });

        if (aCorrecter.length === 0) return of({ corriges: 0, erreurs: 0 });

        const corrections$ = aCorrecter.map(v => {
          const userId = this.resolveId(v.userId);
          return this.http.patch<User>(`${this.usersUrl}/${userId}`,
            { role: 'volontaire' },
            { headers: this.jsonHeaders }
          ).pipe(
            map(() => ({ ok: true })),
            catchError(() => of({ ok: false }))
          );
        });

        return forkJoin(corrections$).pipe(
          map(results => ({
            corriges: results.filter(r => r.ok).length,
            erreurs:  results.filter(r => !r.ok).length
          }))
        );
      }),
      catchError(() => of({ corriges: 0, erreurs: 1 }))
    );
  }
}