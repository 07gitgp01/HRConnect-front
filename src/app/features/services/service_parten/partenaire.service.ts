import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  Partenaire,
  PartenaireDashboardStats,
  InscriptionPartenaire,
  PartenairePermissionsService,
  TypeStructurePNVB,
  Alerte
} from '../../models/partenaire.model';
import { environment } from '../../environment/environment';

@Injectable({ providedIn: 'root' })
export class PartenaireService {
  // ✅ Utilisation de environment.apiUrl
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('📡 PartenaireService initialisé avec API URL:', this.apiUrl);
  }

  // ============================================================================
  // CRUD PARTENAIRES
  // ============================================================================

  getAll(): Observable<Partenaire[]> {
    return this.http.get<Partenaire[]>(`${this.apiUrl}/partenaires`);
  }

  getById(id: string | number): Observable<Partenaire> {
    return this.http.get<Partenaire>(`${this.apiUrl}/partenaires/${id}`).pipe(
      catchError((error) => { console.error('❌ Erreur chargement partenaire:', error); throw error; })
    );
  }

  inscrirePartenaire(data: InscriptionPartenaire): Observable<Partenaire> {
    const partenaire = PartenairePermissionsService.creerPartenaireAvecPermissions(data);
    return this.http.post<Partenaire>(`${this.apiUrl}/partenaires`, partenaire).pipe(
      tap(p => console.log('✅ Partenaire créé:', p)),
      catchError((error) => { console.error('❌ Erreur création partenaire:', error); throw error; })
    );
  }

  create(partenaire: Partenaire): Observable<Partenaire> {
    return this.http.post<Partenaire>(`${this.apiUrl}/partenaires`, {
      ...partenaire,
      cree_le:       new Date().toISOString(),
      mis_a_jour_le: new Date().toISOString()
    });
  }

  update(id: string | number, partenaire: Partial<Partenaire>): Observable<Partenaire> {
    return this.http.put<Partenaire>(`${this.apiUrl}/partenaires/${id}`, {
      ...partenaire,
      mis_a_jour_le: new Date().toISOString()
    });
  }

  delete(id: string | number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partenaires/${id}`);
  }

  toggleAccountStatus(id: string | number, active: boolean): Observable<Partenaire> {
    const patch: any = {
      estActive:     active,
      compteActive:  active,
      mis_a_jour_le: new Date().toISOString()
    };
    if (active) patch.dateActivation = new Date().toISOString();
    return this.http.patch<Partenaire>(`${this.apiUrl}/partenaires/${id}`, patch);
  }

  // ============================================================================
  // PROJETS DU PARTENAIRE
  // ============================================================================

  /**
   * Retourne les projets bruts filtrés par partenaireId.
   * ✅ Filtre côté client pour fiabilité avec json-server.
   */
  getProjetsByPartenaire(partenaireId: number | string): Observable<any[]> {
    const idStr = partenaireId.toString();
    return this.http.get<any[]>(`${this.apiUrl}/projets`).pipe(
      map(projets => projets.filter(p =>
        p.partenaireId != null && p.partenaireId.toString() === idStr
      )),
      catchError(() => of([]))
    );
  }

  /**
   * Retourne les projets enrichis avec stats candidatures + affectations.
   * ✅ Utilise statutProjet (champ normalisé) partout.
   */
  getProjetsAvecCandidatures(partenaireId: number | string): Observable<any[]> {
    const idStr = partenaireId.toString();

    return forkJoin({
      projets:      this.getProjetsByPartenaire(idStr),
      candidatures: this.http.get<any[]>(`${this.apiUrl}/candidatures`).pipe(catchError(() => of([]))),
      affectations: this.http.get<any[]>(`${this.apiUrl}/affectations`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ projets, candidatures, affectations }) =>
        projets.map(projet => {
          const pid = projet.id?.toString();

          const cands      = candidatures.filter(c => c.projectId?.toString() === pid);
          const affecActives = affectations.filter(a =>
            a.projectId?.toString() === pid && a.statut === 'active'
          );

          // ✅ Normaliser statutProjet ici aussi pour cohérence
          const statutProjet = this.normaliserStatut(
            projet.statutProjet ?? projet.status
          );

          return {
            ...projet,
            statutProjet,                                            // ✅ toujours présent
            total_candidatures:       cands.length,
            candidatures_en_attente:  cands.filter(c => c.statut === 'en_attente').length,
            candidatures_entretien:   cands.filter(c => c.statut === 'entretien').length,
            candidatures_acceptees:   cands.filter(c => c.statut === 'acceptee').length,
            candidatures_refusees:    cands.filter(c => c.statut === 'refusee').length,
            volontairesAffectes:      affecActives.length,
            nouvellesCandidatures:    cands.filter(c => c.statut === 'en_attente').length,
            _candidatures:            cands,
            _affectations:            affecActives
          };
        })
      ),
      catchError(() => of([]))
    );
  }

  getProjetDetail(partenaireId: number | string, projetId: number | string): Observable<any> {
    const idStr    = partenaireId.toString();
    const projIdStr = projetId.toString();

    return forkJoin({
      projets:      this.getProjetsAvecCandidatures(idStr),
      candidatures: this.http.get<any[]>(`${this.apiUrl}/candidatures`).pipe(catchError(() => of([]))),
      affectations: this.http.get<any[]>(`${this.apiUrl}/affectations`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ projets, candidatures, affectations }) => {
        const projet = projets.find(p => p.id?.toString() === projIdStr);
        if (!projet) throw new Error(`Projet ${projIdStr} non trouvé`);

        const cands       = candidatures.filter(c => c.projectId?.toString() === projIdStr);
        const affecActives = affectations.filter(a =>
          a.projectId?.toString() === projIdStr && a.statut === 'active'
        );

        return {
          ...projet,
          total_candidatures:      cands.length,
          candidatures_en_attente: cands.filter(c => c.statut === 'en_attente').length,
          candidatures_entretien:  cands.filter(c => c.statut === 'entretien').length,
          candidatures_acceptees:  cands.filter(c => c.statut === 'acceptee').length,
          candidatures_refusees:   cands.filter(c => c.statut === 'refusee').length,
          volontairesAffectes:     affecActives.length,
          _candidatures:           cands,
          _affectations:           affecActives
        };
      }),
      catchError(error => { console.error('❌ Erreur getProjetDetail:', error); throw error; })
    );
  }

  createProjet(projet: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/projets`, {
      ...projet,
      cree_le:       new Date().toISOString(),
      mis_a_jour_le: new Date().toISOString()
    }).pipe(
      catchError(error => { console.error('❌ Erreur création projet:', error); throw error; })
    );
  }

  updateProjet(id: number | string, projet: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/projets/${id}`, {
      ...projet,
      mis_a_jour_le: new Date().toISOString()
    }).pipe(
      catchError(error => { console.error('❌ Erreur mise à jour projet:', error); throw error; })
    );
  }

  deleteProjet(projetId: number | string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/projets/${projetId}`).pipe(
      catchError(error => { console.error('❌ Erreur suppression projet:', error); throw error; })
    );
  }

  // ============================================================================
  // STATISTIQUES
  // ============================================================================

  getDashboardStats(partenaireId: string | number): Observable<PartenaireDashboardStats> {
    return this.getProjetsAvecCandidatures(partenaireId).pipe(
      map(projets => this.calculerStatsDashboard(projets)),
      catchError(() => of(this.getStatsParDefaut()))
    );
  }

  /**
   * ✅ FIX PRINCIPAL : filtre sur statutProjet (champ normalisé)
   * et non plus sur p.status qui n'existe pas dans les données normalisées.
   */
  getStatsCompletesPartenaire(partenaireId: string | number): Observable<any> {
    const idStr = partenaireId.toString();

    return forkJoin({
      partenaire: this.getById(idStr),
      projets:    this.getProjetsAvecCandidatures(idStr)
    }).pipe(
      map(({ partenaire, projets }) => {
        if (!projets?.length) {
          return {
            totalProjets:        0,
            projetsActifs:       0,
            projetsTermines:     0,
            projetsEnAttente:    0,
            volontairesAffectes: 0,
            dateDernierProjet:   undefined,
            statsParType:        this.initialiserStatsParType(partenaire.typeStructures)
          };
        }

        // ✅ statutProjet est maintenant toujours présent (normalisé dans getProjetsAvecCandidatures)
        return {
          totalProjets:        projets.length,
          projetsActifs:       projets.filter(p => p.statutProjet === 'actif').length,
          projetsTermines:     projets.filter(p => p.statutProjet === 'cloture').length,
          projetsEnAttente:    projets.filter(p => p.statutProjet === 'en_attente').length,
          volontairesAffectes: projets.reduce((s, p) =>
            s + (p.volontairesAffectes ?? p.nombreVolontairesActuels ?? 0), 0
          ),
          dateDernierProjet: this.getDernierProjetDate(projets),
          statsParType:      this.calculerStatsParType(partenaire.typeStructures, projets)
        };
      }),
      catchError(() => of({
        totalProjets: 0, projetsActifs: 0, projetsTermines: 0,
        projetsEnAttente: 0, volontairesAffectes: 0,
        dateDernierProjet: undefined, statsParType: {}
      }))
    );
  }

  getStatsGlobales(): Observable<any> {
    return this.getAll().pipe(
      map(partenaires => ({
        totalPartenaires:    partenaires.length,
        partenairesActifs:   partenaires.filter(p => p.estActive || p.compteActive).length,
        partenairesInactifs: partenaires.filter(p => !p.estActive && !p.compteActive).length,
        types:               this.compterTypesMultiples(partenaires),
        domaines:            this.compterDomaines(partenaires),
        statsRoles: {
          totalPTF:               partenaires.filter(p => PartenairePermissionsService.estPTF(p)).length,
          totalStructuresAccueil: partenaires.filter(p => PartenairePermissionsService.estStructureAccueil(p)).length,
          totalMixtes:            partenaires.filter(p =>
            PartenairePermissionsService.estPTF(p) && PartenairePermissionsService.estStructureAccueil(p)
          ).length
        }
      }))
    );
  }

  getStatsByPartenaire(partenaireId: string | number): Observable<any> {
    return this.getProjetsAvecCandidatures(partenaireId).pipe(
      map(projets => ({
        total:               projets.length,
        en_attente:          projets.filter(p => p.statutProjet === 'en_attente').length,
        actifs:              projets.filter(p => p.statutProjet === 'actif').length,
        clotures:            projets.filter(p => p.statutProjet === 'cloture').length,
        volontairesAffectes: projets.reduce((t, p) => t + (p.volontairesAffectes ?? 0), 0)
      })),
      catchError(() => of({ total: 0, en_attente: 0, actifs: 0, clotures: 0, volontairesAffectes: 0 }))
    );
  }

  getStatistiquesPartenaire(partenaireId: string | number): Observable<any> {
    return forkJoin({
      projets:      this.getProjetsAvecCandidatures(partenaireId),
      candidatures: this.http.get<any[]>(`${this.apiUrl}/candidatures`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ projets, candidatures }) => {
        const projetIds      = projets.map(p => String(p.id)).filter(Boolean);
        const candPartenaire = candidatures.filter(c => projetIds.includes(String(c.projectId)));
        return {
          totalProjets:          projets.length,
          projetsActifs:         projets.filter(p => p.statutProjet === 'actif').length,
          projetsEnAttente:      projets.filter(p => p.statutProjet === 'en_attente').length,
          projetsTermines:       projets.filter(p => p.statutProjet === 'cloture').length,
          volontairesAffectes:   projets.reduce((s, p) => s + (p.volontairesAffectes ?? 0), 0),
          candidatures:          candPartenaire.length,
          nouvellesCandidatures: candPartenaire.filter(c =>
            c.statut === 'en_attente' && this.isRecent(c.cree_le)
          ).length
        };
      }),
      catchError(() => of({
        totalProjets: 0, projetsActifs: 0, projetsEnAttente: 0,
        projetsTermines: 0, volontairesAffectes: 0,
        candidatures: 0, nouvellesCandidatures: 0
      }))
    );
  }

  verifierPermissionsPartenaire(partenaireId: string | number): Observable<any> {
    return this.getById(partenaireId).pipe(
      map(partenaire => ({
        peutCreerProjets:     partenaire.permissions?.peutCreerProjets     ?? false,
        peutGererVolontaires: partenaire.permissions?.peutGererVolontaires ?? false,
        peutVoirStatistiques: partenaire.permissions?.peutVoirStatistiques ?? true,
        peutVoirRapports:     partenaire.permissions?.peutVoirRapports     ?? false,
        accesZonePTF:         partenaire.permissions?.accesZonePTF         ?? false,
        typeStructures:       partenaire.typeStructures || [],
        estPTF:               PartenairePermissionsService.estPTF(partenaire),
        estStructureAccueil:  PartenairePermissionsService.estStructureAccueil(partenaire),
        permissionsParType:   partenaire.permissions?.permissionsParType || {}
      })),
      catchError(() => of({
        peutCreerProjets: true, peutGererVolontaires: true,
        peutVoirStatistiques: true, peutVoirRapports: false,
        accesZonePTF: false, typeStructures: [],
        estPTF: false, estStructureAccueil: true, permissionsParType: {}
      }))
    );
  }

  getDashboardAdapte(partenaireId: string | number): Observable<any> {
    return forkJoin({
      partenaire: this.getById(partenaireId),
      projets:    this.getProjetsAvecCandidatures(partenaireId)
    }).pipe(
      map(({ partenaire, projets }) => {
        const estPTF             = PartenairePermissionsService.estPTF(partenaire);
        const estStructureAccueil = PartenairePermissionsService.estStructureAccueil(partenaire);

        let data: any = {
          partenaireInfo: {
            nomStructure: partenaire.nomStructure,
            typeStructures: partenaire.typeStructures,
            estPTF,
            estStructureAccueil
          }
        };

        if (estPTF)             data = { ...data, ...this.genererDashboardPTF(partenaire, projets) };
        if (estStructureAccueil) data = { ...data, ...this.genererDashboardStructureAccueil(projets) };
        if (estPTF && estStructureAccueil) data.dashboardMixte = this.genererDashboardMixte(partenaire, projets);

        return data;
      }),
      catchError(() => of(this.getDashboardParDefaut()))
    );
  }

  peutCreerProjet(partenaireId: string | number): Observable<boolean> {
    return this.getProjetsAvecCandidatures(partenaireId).pipe(
      map(projets => projets.filter(p =>
        p.statutProjet === 'en_attente' || p.statutProjet === 'actif'
      ).length < 10),
      catchError(() => of(true))
    );
  }

  // ============================================================================
  // AFFECTATIONS & VOLONTAIRES
  // ============================================================================

  getAffectationsByPartenaire(partenaireId: string | number): Observable<any[]> {
    return forkJoin({
      projets:      this.getProjetsByPartenaire(partenaireId),
      affectations: this.http.get<any[]>(`${this.apiUrl}/affectations`)
    }).pipe(
      map(({ projets, affectations }) => {
        const projetIds = projets.map((p: any) => String(p.id));
        return affectations.filter(a => projetIds.includes(String(a.projectId)));
      }),
      catchError(() => of([]))
    );
  }

  getVolontairesDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/volontaires`).pipe(catchError(() => of([])));
  }

  // ============================================================================
  // RAPPORTS & OFFRES
  // ============================================================================

  soumettreRapportEvaluation(rapport: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/rapports-evaluation`, {
      ...rapport,
      dateSoumission: new Date().toISOString(),
      cree_le:        new Date().toISOString()
    });
  }

  getRapportsEvaluation(partenaireId: string | number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/rapports-evaluation`).pipe(
      map(rapports => rapports.filter(r => r.partenaireId === partenaireId.toString())),
      catchError(() => of([]))
    );
  }

  getOffresMission(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/offresMission`).pipe(catchError(() => of([])));
  }

  getOffresMissionByPartenaire(partenaireId: string): Observable<any[]> {
    return this.getOffresMission().pipe(
      map(offres => offres.filter(o => o.partenaireId === partenaireId)),
      catchError(() => of([]))
    );
  }

  creerOffreMission(offre: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/offresMission`, {
      ...offre,
      id:            this.generateId(),
      dateCreation:  new Date().toISOString(),
      cree_le:       new Date().toISOString(),
      mis_a_jour_le: new Date().toISOString()
    }).pipe(catchError(error => { throw error; }));
  }

  updateOffreMission(id: string, offre: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/offresMission/${id}`, {
      ...offre,
      mis_a_jour_le: new Date().toISOString()
    }).pipe(catchError(error => { throw error; }));
  }

  deleteOffreMission(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/offresMission/${id}`).pipe(
      catchError(error => { throw error; })
    );
  }

  updateStatutOffreMission(offreId: number, statut: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/offres-mission/${offreId}`, {
      statut,
      mis_a_jour_le: new Date().toISOString()
    });
  }

  getDonneesFinancieresPTF(partenaireId: string | number): Observable<any> {
    return forkJoin({
      projets:  this.getProjetsByPartenaire(partenaireId),
      rapports: this.http.get<any[]>(`${this.apiUrl}/rapports-financiers`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ projets, rapports }) => {
        const projetsPTF   = projets.filter(p => p.type === 'finance_ptf' || p.financeParPTF === true);
        const montantTotal = projetsPTF.reduce((t, p) => t + (p.budget || 0), 0);
        const rapportsPTF  = rapports.filter(r => r.partenaireId === partenaireId.toString());
        return {
          montantTotal,
          projetsFinances:       projetsPTF.length,
          rapportsFinanciers:    rapportsPTF,
          decompositionBudget:   this.calculerDecompositionBudget(projetsPTF)
        };
      }),
      catchError(() => of({ montantTotal: 0, projetsFinances: 0, rapportsFinanciers: [], decompositionBudget: {} }))
    );
  }

  marquerAlerteCommeLue(alerteId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/alertes/${alerteId}`, { lu: true }).pipe(
      catchError(() => of({ success: true }))
    );
  }

  // ============================================================================
  // RECHERCHE PARTENAIRE
  // ============================================================================

  getPartenaireByEmail(email: string): Observable<Partenaire | null> {
    if (!email) return of(null);
    return this.http.get<Partenaire[]>(`${this.apiUrl}/partenaires`).pipe(
      map(partenaires =>
        partenaires.find(p => p.email?.toLowerCase() === email.toLowerCase()) ?? null
      ),
      catchError(() => this.getPartenaireFromLocalStorage(email))
    );
  }

  getCurrentPartenaire(): any {
    try {
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role === 'partenaire') return user;
      }
      return null;
    } catch { return null; }
  }

  getPartenaireFromJson(partenaireId: string): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/partenaires`).pipe(
      map(partenaires => {
        const p = partenaires.find(x => x.id === partenaireId);
        if (!p) throw new Error('Partenaire non trouvé');
        return p;
      }),
      catchError(error => { throw error; })
    );
  }

  private getPartenaireFromLocalStorage(email: string): Observable<Partenaire | null> {
    try {
      const raw = localStorage.getItem('currentPartenaire') ?? localStorage.getItem('currentUser');
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj.email === email) return of(obj);
      }
      return of(null);
    } catch { return of(null); }
  }

  // ============================================================================
  // MÉTHODES PRIVÉES — NORMALISATION
  // ============================================================================

  /**
   * ✅ Normalise le statut d'un projet vers les valeurs canoniques
   * 'actif' | 'en_attente' | 'cloture'
   */
  private normaliserStatut(statut: any): 'actif' | 'en_attente' | 'cloture' {
    if (!statut) return 'en_attente';
    const s = statut.toString().toLowerCase().trim();
    const map: { [k: string]: 'actif' | 'en_attente' | 'cloture' } = {
      'actif':        'actif',
      'active':       'actif',
      'en_cours':     'actif',
      'in_progress':  'actif',
      'ouvert':       'actif',
      'open':         'actif',
      'en_attente':   'en_attente',
      'en attente':   'en_attente',
      'pending':      'en_attente',
      'soumis':       'en_attente',
      'submitted':    'en_attente',
      'planifié':     'en_attente',
      'planifie':     'en_attente',
      'cloture':      'cloture',
      'clôturé':      'cloture',
      'cloturé':      'cloture',
      'closed':       'cloture',
      'completed':    'cloture',
      'terminé':      'cloture',
      'termine':      'cloture'
    };
    return map[s] ?? 'en_attente';
  }

  // ============================================================================
  // MÉTHODES PRIVÉES — CALCULS STATS
  // ============================================================================

  private calculerStatsDashboard(projets: any[]): PartenaireDashboardStats {
    if (!projets?.length) return this.getStatsParDefaut();

    return {
      totalProjets:     projets.length,
      projetsActifs:    projets.filter(p => p.statutProjet === 'actif').length,
      projetsEnAttente: projets.filter(p => p.statutProjet === 'en_attente').length,
      projetsTermines:  projets.filter(p => p.statutProjet === 'cloture').length,
      totalCandidatures: projets.reduce((t, p) => t + (p.total_candidatures || 0), 0),
      nouvellesCandidatures: projets.reduce((t, p) =>
        t + (p.candidatures_en_attente || 0), 0
      ),
      volontairesActuels: projets.reduce((t, p) => t + (p.volontairesAffectes || 0), 0),
      evolutionCandidatures: this.genererEvolutionCandidatures(
        projets.reduce((t, p) => t + (p.total_candidatures || 0), 0)
      ),
      alertes: this.genererAlertesDashboard(projets)
    };
  }

  private initialiserStatsParType(typeStructures: TypeStructurePNVB[]): any {
    const stats: any = {};
    (typeStructures || []).forEach(type => {
      stats[type] = { projets: 0, volontaires: 0, budgetTotal: 0 };
    });
    return stats;
  }

  private calculerStatsParType(typeStructures: TypeStructurePNVB[], projets: any[]): any {
    const stats = this.initialiserStatsParType(typeStructures);
    if (!typeStructures?.length) return stats;

    const projetsParType    = Math.floor(projets.length / typeStructures.length) || 0;
    const volontairesParType = Math.floor(
      projets.reduce((t, p) => t + (p.volontairesAffectes || 0), 0) / typeStructures.length
    ) || 0;

    typeStructures.forEach(type => {
      stats[type] = { projets: projetsParType, volontaires: volontairesParType, budgetTotal: 0 };
    });
    return stats;
  }

  private compterTypesMultiples(partenaires: Partenaire[]): any {
    const types: any = {};
    partenaires.forEach(p => {
      p.typeStructures?.forEach(type => { types[type] = (types[type] || 0) + 1; });
    });
    return types;
  }

  private compterDomaines(partenaires: Partenaire[]): any {
    const domaines: any = {};
    partenaires.forEach(p => {
      const d = p.domaineActivite || 'Non spécifié';
      domaines[d] = (domaines[d] || 0) + 1;
    });
    return domaines;
  }

  private getDernierProjetDate(projets: any[]): string | undefined {
    if (!projets.length) return undefined;
    const dates = projets
      .map(p => new Date(p.cree_le || p.dateDebut || p.created_at || ''))
      .filter(d => !isNaN(d.getTime()));
    if (!dates.length) return undefined;
    return new Date(Math.max(...dates.map(d => d.getTime())))
      .toLocaleDateString('fr-FR');
  }

  private isRecent(dateString: string): boolean {
    if (!dateString) return false;
    try {
      return (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24) <= 7;
    } catch { return false; }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // ============================================================================
  // MÉTHODES PRIVÉES — DASHBOARDS
  // ============================================================================

  private getStatutProjet(projet: any): 'actif' | 'termine' | 'en_attente' {
    const s = projet.statutProjet;
    if (s === 'actif')      return 'actif';
    if (s === 'cloture')    return 'termine';
    return 'en_attente';
  }

  private genererDashboardPTF(partenaire: Partenaire, projets: any[]): any {
    const projetsFinances = projets.map(p => ({
      id:               p.id,
      titre:            p.titre,
      structurePorteuse: p.structurePorteuse || 'PNVB',
      montantFinance:   p.budget || 0,
      dateDebut:        p.dateDebut,
      dateFin:          p.dateFin,
      statut:           this.getStatutProjet(p),
      volontairesAffectes: p.volontairesAffectes || 0
    }));

    const totalInvesti       = projetsFinances.reduce((t, p) => t + p.montantFinance, 0);
    const volontairesSupportes = projetsFinances.reduce((t, p) => t + p.volontairesAffectes, 0);

    return {
      dashboardPTF: {
        projetsFinances,
        statistiquesFinancement: {
          totalInvesti,
          projetsActifs:         projetsFinances.filter(p => p.statut === 'actif').length,
          projetsTermines:       projetsFinances.filter(p => p.statut === 'termine').length,
          impactCommunautaire:   Math.round((volontairesSupportes / 100) * 75),
          volontairesSupportes
        },
        rapports: this.genererRapportsPTF(partenaire.id!),
        alertes:  this.genererAlertesPTF(projetsFinances)
      }
    };
  }

  private genererDashboardStructureAccueil(projets: any[]): any {
    return {
      dashboardStructure: {
        ...this.calculerStatsDashboard(projets),
        projetsRecents: [...projets]
          .sort((a, b) =>
            new Date(b.cree_le || '').getTime() - new Date(a.cree_le || '').getTime()
          )
          .slice(0, 5)
      }
    };
  }

  private genererDashboardMixte(partenaire: Partenaire, projets: any[]): any {
    const ptf       = this.genererDashboardPTF(partenaire, projets);
    const structure = this.genererDashboardStructureAccueil(projets);
    return {
      resume: {
        totalProjets:        structure.dashboardStructure.totalProjets,
        totalInvestissements: ptf.dashboardPTF.statistiquesFinancement.totalInvesti,
        volontairesTotal:    structure.dashboardStructure.volontairesActuels +
                             ptf.dashboardPTF.statistiquesFinancement.volontairesSupportes
      },
      alertesCombinees: [
        ...(ptf.dashboardPTF.alertes || []),
        ...(structure.dashboardStructure.alertes || [])
      ].slice(0, 10)
    };
  }

  private getDashboardParDefaut(): any {
    return {
      partenaireInfo: { nomStructure: '', typeStructures: [], estPTF: false, estStructureAccueil: false },
      dashboardStructure: this.getStatsParDefaut()
    };
  }

  private getStatsParDefaut(): PartenaireDashboardStats {
    return {
      totalProjets: 0, projetsActifs: 0, projetsEnAttente: 0, projetsTermines: 0,
      totalCandidatures: 0, nouvellesCandidatures: 0, volontairesActuels: 0,
      evolutionCandidatures: [], alertes: []
    };
  }

  private genererEvolutionCandidatures(total: number): { date: string; count: number }[] {
    const today = new Date();
    const base  = Math.max(1, Math.floor(total / 30));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      return { date: d.toISOString().split('T')[0], count: Math.floor(Math.random() * base * 1.5) + 1 };
    });
  }

  private genererAlertesDashboard(projets: any[]): any[] {
    const alertes: any[] = [];

    projets.forEach(p => {
      const nb = p.candidatures_en_attente || 0;
      if (nb > 0) {
        alertes.push({
          id:      Date.now() + alertes.length,
          type:    'nouvelle_candidature',
          titre:   'Nouvelles candidatures',
          message: `${nb} nouvelle(s) candidature(s) pour "${p.titre || 'Projet'}"`,
          date:    new Date().toISOString(),
          lu:      false,
          lien:    `/features/partenaires/candidatures?projet=${p.id}`
        });
      }
    });

    const dans7j = new Date();
    dans7j.setDate(dans7j.getDate() + 7);
    projets.forEach(p => {
      if (p.dateFin && p.statutProjet === 'actif' && new Date(p.dateFin) < dans7j) {
        alertes.push({
          id:      Date.now() + alertes.length,
          type:    'projet_echeance',
          titre:   'Projet arrivant à échéance',
          message: `Le projet "${p.titre}" se termine le ${new Date(p.dateFin).toLocaleDateString()}`,
          date:    new Date().toISOString(),
          lu:      false,
          lien:    `/features/partenaires/projets/${p.id}`
        });
      }
    });

    return alertes.slice(0, 5);
  }

  private genererRapportsPTF(partenaireId: string | number): any[] {
    return [
      { id: 1, titre: 'Rapport Trimestriel Q1 2024', type: 'rapport_trimestriel', date: '2024-03-31', url: `/rapports/q1-2024-${partenaireId}` },
      { id: 2, titre: "Rapport d'Impact Annuel 2023",  type: 'rapport_annuel',      date: '2024-01-15', url: `/rapports/impact-2023-${partenaireId}` }
    ];
  }

  private genererAlertesPTF(projetsFinances: any[]): any[] {
    const alertes: any[] = [{
      id: 1, type: 'rapport_a_soumettre',
      titre: 'Rapport trimestriel à soumettre',
      message: 'Votre rapport trimestriel pour Q2 2024 est attendu avant le 30 juin',
      date: new Date().toISOString(), lu: false, lien: '/rapports/soumettre'
    }];

    const dans30j = new Date();
    dans30j.setDate(dans30j.getDate() + 30);
    projetsFinances.forEach(p => {
      if (p.statut === 'actif' && p.dateFin && new Date(p.dateFin) < dans30j) {
        alertes.push({
          id:      alertes.length + 1,
          type:    'projet_echeance',
          titre:   'Projet arrivant à échéance',
          message: `Le projet "${p.titre}" se termine le ${new Date(p.dateFin).toLocaleDateString()}`,
          date:    new Date().toISOString(),
          lu:      false,
          lien:    `/projets/${p.id}`
        });
      }
    });
    return alertes;
  }

  private calculerDecompositionBudget(projets: any[]): any {
    const d: any = { salaires: 0, equipement: 0, formation: 0, logistique: 0, autres: 0 };
    projets.forEach(p => {
      if (p.decompositionBudget) {
        Object.keys(p.decompositionBudget).forEach(k => {
          if (d[k] !== undefined) d[k] += p.decompositionBudget[k];
        });
      }
    });
    return d;
  }
  
}