// src/app/features/services/service-affecta/affectation.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, catchError, of, throwError, tap } from 'rxjs';
import { environment } from '../../environment/environment';
import { SyncService } from '../../../features/services/sync.service';

export interface Affectation {
  id?: string;
  volontaireId: string;
  projectId: string;
  dateAffectation: string;
  dateFin?: string;
  statut: 'active' | 'terminee' | 'annulee' | 'inactive';
  role: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ✅ Interface Mission avec le même type de statut que Affectation
export interface Mission {
  id: string;
  projetId: string;
  projetTitre: string;
  projetRegion?: string;
  dateAffectation: string;
  dateFin?: string;
  role: string;
  statut: 'active' | 'terminee' | 'annulee' | 'inactive';  // ✅ Même type que Affectation
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class AffectationService {
  // ✅ Utilisation de environment.apiUrl
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private syncService: SyncService
  ) {
    console.log('📡 AffectationService initialisé avec API URL:', this.apiUrl);
  }

  // ==================== UTILITAIRE DE NORMALISATION ====================

  private normaliserStatutProjet(statut: any): string {
    if (!statut) return 'en_attente';
    
    const s = statut.toString().toLowerCase();
    
    if (s === 'cloture' || s === 'clôture' || s === 'closed' || s === 'completed' || 
        s === 'termine' || s === 'terminé' || s === 'finie' || s === 'fin') {
      return 'cloture';
    }
    
    if (s === 'actif' || s === 'active' || s === 'ouvert' || s === 'open' || 
        s === 'en_cours' || s === 'in_progress') {
      return 'actif';
    }
    
    return 'en_attente';
  }

  // ==================== MÉTHODES CRUD DE BASE ====================

  /**
   * Crée une affectation (uniquement pour les projets CLÔTURÉS)
   */
  createAffectation(
    affectation: Omit<Affectation, 'id' | 'created_at' | 'updated_at'>
  ): Observable<Affectation> {
    console.log('📝 [AffectationService] Création affectation:', affectation);
    
    return this.http.get<any>(`${this.apiUrl}/projets/${affectation.projectId}`).pipe(
      switchMap(projet => {
        console.log('📋 [AffectationService] Projet trouvé:', projet);
        
        const statutNormalise = this.normaliserStatutProjet(projet.statutProjet);
        console.log('📋 [AffectationService] Statut normalisé:', statutNormalise);
        
        if (statutNormalise !== 'cloture') {
          return throwError(() => new Error('Impossible d\'affecter à une mission non clôturée'));
        }
        
        return this.http.get<any>(`${this.apiUrl}/volontaires/${affectation.volontaireId}`).pipe(
          switchMap(volontaire => {
            console.log('📋 [AffectationService] Volontaire trouvé:', volontaire);
            
            if (volontaire.statut === 'Candidat') {
              return throwError(() => new Error('Un volontaire avec le statut "Candidat" ne peut pas être affecté'));
            }
            
            return this.estVolontaireAffecte(affectation.volontaireId, affectation.projectId).pipe(
              switchMap(dejaAffecte => {
                if (dejaAffecte) {
                  return throwError(() => new Error(`Ce volontaire est déjà affecté à cette mission`));
                }
                
                const affectationPourServeur = {
                  volontaireId: affectation.volontaireId,
                  projectId: affectation.projectId,
                  dateAffectation: affectation.dateAffectation || new Date().toISOString().split('T')[0],
                  statut: 'active' as const,
                  role: affectation.role || 'Volontaire',
                  notes: affectation.notes || '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };

                console.log('📤 [AffectationService] Envoi affectation:', affectationPourServeur);

                return this.http.post<Affectation>(`${this.apiUrl}/affectations`, affectationPourServeur).pipe(
                  switchMap(nouvelleAffectation => {
                    console.log('✅ [AffectationService] Affectation créée:', nouvelleAffectation);
                    
                    return this.http.patch<any>(
                      `${this.apiUrl}/volontaires/${affectation.volontaireId}`,
                      {
                        statut: 'Actif',
                        updated_at: new Date().toISOString()
                      }
                    ).pipe(
                      map(() => {
                        console.log(`✅ [AffectationService] Statut du volontaire ${affectation.volontaireId} mis à jour: → Actif`);
                        this.syncService.notifierTout();
                        return nouvelleAffectation;
                      }),
                      catchError(err => {
                        console.error('❌ [AffectationService] Erreur mise à jour statut volontaire:', err);
                        this.syncService.notifierTout();
                        return of(nouvelleAffectation);
                      })
                    );
                  }),
                  catchError(err => {
                    console.error('❌ [AffectationService] Erreur POST:', err);
                    return throwError(() => err);
                  })
                );
              })
            );
          })
        );
      }),
      catchError(error => {
        console.error('❌ [AffectationService] Erreur création affectation:', error);
        return throwError(() => error);
      })
    );
  }

  getAllAffectations(): Observable<Affectation[]> {
    return this.http.get<Affectation[]>(`${this.apiUrl}/affectations`).pipe(
      catchError(() => of([]))
    );
  }

  getAffectationsCompletes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/affectations-completes`).pipe(
      catchError(() => of([]))
    );
  }

  getAffectationById(id: number | string): Observable<Affectation> {
    return this.http.get<Affectation>(`${this.apiUrl}/affectations/${id}`).pipe(
      catchError(error => { throw error; })
    );
  }

  getAffectationsByProject(projectId: number | string): Observable<Affectation[]> {
    return this.http.get<Affectation[]>(
      `${this.apiUrl}/affectations?projectId=${projectId}`
    ).pipe(catchError(() => of([])));
  }

  getAffectationsActivesByProject(projectId: number | string): Observable<Affectation[]> {
    return this.http.get<Affectation[]>(
      `${this.apiUrl}/affectations?projectId=${projectId}&statut=active`
    ).pipe(
      catchError(() =>
        this.getAffectationsByProject(projectId).pipe(
          map(a => a.filter(x => x.statut === 'active'))
        )
      )
    );
  }

  getAffectationsByVolontaire(volontaireId: number | string): Observable<Affectation[]> {
    return this.http.get<Affectation[]>(
      `${this.apiUrl}/affectations?volontaireId=${volontaireId}`
    ).pipe(catchError(() => of([])));
  }

  getAffectationsActivesByVolontaire(volontaireId: number | string): Observable<Affectation[]> {
    return this.http.get<Affectation[]>(
      `${this.apiUrl}/affectations?volontaireId=${volontaireId}&statut=active`
    ).pipe(
      catchError(() =>
        this.getAffectationsByVolontaire(volontaireId).pipe(
          map(a => a.filter(x => x.statut === 'active'))
        )
      )
    );
  }

  updateAffectation(
    affectationId: number | string,
    updates: Partial<Affectation>
  ): Observable<Affectation> {
    const { id, created_at, ...safeUpdates } = updates as any;
    return this.http.patch<Affectation>(
      `${this.apiUrl}/affectations/${affectationId}`,
      { ...safeUpdates, updated_at: new Date().toISOString() }
    ).pipe(
      catchError(error => { throw error; })
    );
  }

  // ==================== FIN DE MISSION ====================

  terminerAffectation(
    affectationId: number | string,
    volontaireId?: number | string
  ): Observable<Affectation> {
    const doTerminer = (vId: number | string) => {
      const dateFin = new Date().toISOString();
      return this.http.patch<Affectation>(
        `${this.apiUrl}/affectations/${affectationId}`,
        { statut: 'terminee', dateFin, updated_at: dateFin }
      ).pipe(
        switchMap(affectationTerminee => {
          return this.getAffectationsActivesByVolontaire(vId).pipe(
            switchMap(autresAffectations => {
              const autresActives = autresAffectations.filter(a => String(a.id) !== String(affectationId));
              
              if (autresActives.length === 0) {
                return this.http.patch<any>(
                  `${this.apiUrl}/volontaires/${vId}`,
                  {
                    statut: 'En attente',
                    updated_at: new Date().toISOString()
                  }
                ).pipe(
                  map(() => {
                    console.log(`✅ [AffectationService] Volontaire ${vId} repassé à "En attente" (fin de mission)`);
                    this.syncService.notifierTout();
                    return affectationTerminee;
                  })
                );
              } else {
                console.log(`ℹ️ [AffectationService] Volontaire ${vId} reste "Actif" (${autresActives.length} autre(s) mission(s))`);
                this.syncService.notifierTout();
                return of(affectationTerminee);
              }
            })
          );
        }),
        catchError(error => { throw error; })
      );
    };

    if (volontaireId != null) return doTerminer(volontaireId);

    return this.getAffectationById(affectationId).pipe(
      switchMap(a => doTerminer(a.volontaireId)),
      catchError(error => { throw error; })
    );
  }

  terminerAffectationsExpirees(
    projectId: number | string,
    dateFinProjet: string
  ): Observable<number> {
    return this.getAffectationsActivesByProject(projectId).pipe(
      switchMap(affectations => {
        if (affectations.length === 0) return of(0);

        const terminations$ = affectations.map(a =>
          this.terminerAffectation(a.id!, a.volontaireId).pipe(
            map(() => 1),
            catchError(() => of(0))
          )
        );

        return forkJoin(terminations$).pipe(
          map((results: number[]) => {
            const total = results.reduce((acc, val) => acc + val, 0);
            if (total > 0) this.syncService.notifierTout();
            return total;
          })
        );
      }),
      catchError(() => of(0))
    );
  }

  annulerAffectation(
    affectationId: number | string,
    volontaireId?: number | string
  ): Observable<Affectation> {
    const doAnnuler = (vId: number | string) => {
      const dateFin = new Date().toISOString();
      return this.http.patch<Affectation>(
        `${this.apiUrl}/affectations/${affectationId}`,
        { statut: 'annulee', dateFin, updated_at: dateFin }
      ).pipe(
        switchMap(affectationAnnulee => {
          return this.getAffectationsActivesByVolontaire(vId).pipe(
            switchMap(autresAffectations => {
              const autresActives = autresAffectations.filter(a => String(a.id) !== String(affectationId));
              
              if (autresActives.length === 0) {
                return this.http.patch<any>(
                  `${this.apiUrl}/volontaires/${vId}`,
                  {
                    statut: 'En attente',
                    updated_at: new Date().toISOString()
                  }
                ).pipe(
                  map(() => {
                    console.log(`✅ [AffectationService] Volontaire ${vId} repassé à "En attente" (annulation)`);
                    this.syncService.notifierTout();
                    return affectationAnnulee;
                  })
                );
              } else {
                this.syncService.notifierTout();
                return of(affectationAnnulee);
              }
            })
          );
        }),
        catchError(error => { throw error; })
      );
    };

    if (volontaireId != null) return doAnnuler(volontaireId);

    return this.getAffectationById(affectationId).pipe(
      switchMap(a => doAnnuler(a.volontaireId)),
      catchError(error => { throw error; })
    );
  }

  supprimerAffectation(
    affectationId: number | string,
    volontaireId?: number | string
  ): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/affectations/${affectationId}`).pipe(
      tap(() => this.syncService.notifierTout()),
      catchError(error => { throw error; })
    );
  }

  deleteAffectation(affectationId: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/affectations/${affectationId}`).pipe(
      catchError(error => { throw error; })
    );
  }

  // ==================== MISSIONS ====================

  /**
   * ✅ Récupère toutes les affectations avec les détails des projets
   */
  getAllAffectationsWithDetails(): Observable<Map<string | number, Mission[]>> {
    return forkJoin({
      affectations: this.getAllAffectations(),
      projets: this.http.get<any[]>(`${this.apiUrl}/projets`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ affectations, projets }) => {
        const missionsMap = new Map<string | number, Mission[]>();
        
        affectations.forEach(affectation => {
          const projet = projets.find(p => String(p.id) === String(affectation.projectId));
          
          const mission: Mission = {
            id: affectation.id!,
            projetId: affectation.projectId,
            projetTitre: projet?.titre || 'Mission sans titre',
            projetRegion: projet?.regionAffectation,
            dateAffectation: affectation.dateAffectation,
            dateFin: affectation.dateFin,
            role: affectation.role,
            statut: affectation.statut,  // ✅ Maintenant compatible (même type)
            notes: affectation.notes
          };
          
          const existing = missionsMap.get(affectation.volontaireId) || [];
          missionsMap.set(affectation.volontaireId, [...existing, mission]);
        });
        
        return missionsMap;
      })
    );
  }

  /**
   * ✅ Récupère la mission active d'un volontaire
   */
  getMissionActiveVolontaire(volontaireId: number | string): Observable<Mission | null> {
    return this.getAllAffectationsWithDetails().pipe(
      map(missionsMap => {
        const missions = missionsMap.get(volontaireId) || [];
        return missions.find(m => m.statut === 'active') || null;
      })
    );
  }

  /**
   * ✅ Récupère les missions terminées d'un volontaire
   */
  getMissionsTermineesVolontaire(volontaireId: number | string): Observable<Mission[]> {
    return this.getAllAffectationsWithDetails().pipe(
      map(missionsMap => {
        const missions = missionsMap.get(volontaireId) || [];
        return missions
          .filter(m => m.statut === 'terminee')
          .sort((a, b) => 
            new Date(b.dateFin || b.dateAffectation).getTime() - 
            new Date(a.dateFin || a.dateAffectation).getTime()
          );
      })
    );
  }

  /**
   * ✅ Récupère toutes les missions d'un volontaire
   */
  getMissionsVolontaire(volontaireId: number | string): Observable<Mission[]> {
    return this.getAllAffectationsWithDetails().pipe(
      map(missionsMap => missionsMap.get(volontaireId) || [])
    );
  }

  // ==================== VÉRIFICATIONS ====================

  estVolontaireAffecte(
    volontaireId: number | string,
    projectId: number | string
  ): Observable<boolean> {
    return this.getAffectationsActivesByProject(projectId).pipe(
      map(affectations =>
        affectations.some(
          a => String(a.volontaireId) === String(volontaireId) && a.statut === 'active'
        )
      ),
      catchError(() => of(false))
    );
  }

  estVolontaireDejaActif(volontaireId: number | string): Observable<boolean> {
    return this.getAffectationsActivesByVolontaire(volontaireId).pipe(
      map(affectations => affectations.length > 0),
      catchError(() => of(false))
    );
  }

  peutEtreAffecte(
    volontaireId: number | string,
    projectId: number | string
  ): Observable<boolean> {
    console.log(`🔍 [AffectationService] Vérification affectation - volontaire:${volontaireId}, projet:${projectId}`);
    
    return forkJoin({
      projet: this.http.get<any>(`${this.apiUrl}/projets/${projectId}`).pipe(
        catchError(() => of({ statutProjet: 'inconnu' }))
      ),
      dejaAffecteAceProjet: this.estVolontaireAffecte(volontaireId, projectId).pipe(
        catchError(() => of(false))
      ),
      volontaire: this.http.get<any>(`${this.apiUrl}/volontaires/${volontaireId}`).pipe(
        catchError(() => of({ statut: 'inconnu' }))
      )
    }).pipe(
      map(({ projet, dejaAffecteAceProjet, volontaire }) => {
        const statutNormalise = this.normaliserStatutProjet(projet.statutProjet);
        const projetCloture = statutNormalise === 'cloture';
        const statutValide = volontaire.statut !== 'Candidat';
        const peutEtre = projetCloture && !dejaAffecteAceProjet && statutValide;
        
        return peutEtre;
      })
    );
  }

  // ==================== SYNCHRONISATION ====================

  synchroniserStatutsVolontaires(): Observable<{ corriges: number }> {
    return forkJoin({
      affectations: this.getAllAffectations(),
      tousVolontaires: this.http.get<any[]>(`${this.apiUrl}/volontaires`)
    }).pipe(
      switchMap(({ affectations, tousVolontaires }) => {
        let corriges = 0;
        const updates: Observable<any>[] = [];
        
        affectations.filter(a => a.statut === 'active').forEach(aff => {
          const volontaire = tousVolontaires.find(v => String(v.id) === String(aff.volontaireId));
          if (volontaire && volontaire.statut !== 'Actif') {
            corriges++;
            updates.push(
              this.http.patch(`${this.apiUrl}/volontaires/${aff.volontaireId}`, {
                statut: 'Actif',
                updated_at: new Date().toISOString()
              })
            );
          }
        });
        
        return updates.length > 0 ? forkJoin(updates).pipe(map(() => ({ corriges }))) : of({ corriges });
      }),
      catchError(() => of({ corriges: 0 }))
    );
  }

  // ==================== STATISTIQUES ====================

  countVolontairesAffectesByProject(projectId: number | string): Observable<number> {
    return this.getAffectationsActivesByProject(projectId).pipe(
      map(a => a.length),
      catchError(() => of(0))
    );
  }

  getStatsByProject(projectId: number | string): Observable<{
    total: number; actifs: number; termines: number; annules: number;
  }> {
    return this.getAffectationsByProject(projectId).pipe(
      map(affectations => ({
        total: affectations.length,
        actifs: affectations.filter(a => a.statut === 'active').length,
        termines: affectations.filter(a => a.statut === 'terminee').length,
        annules: affectations.filter(a => a.statut === 'annulee').length
      })),
      catchError(() => of({ total: 0, actifs: 0, termines: 0, annules: 0 }))
    );
  }

  getStatsGlobales(): Observable<{
    total: number; actifs: number; termines: number; projetsAvecAffectations: number;
  }> {
    return this.getAllAffectations().pipe(
      map(affectations => {
        const projetsUniques = new Set(affectations.map(a => a.projectId?.toString()));
        return {
          total: affectations.length,
          actifs: affectations.filter(a => a.statut === 'active').length,
          termines: affectations.filter(a => a.statut === 'terminee').length,
          projetsAvecAffectations: projetsUniques.size
        };
      }),
      catchError(() => of({ total: 0, actifs: 0, termines: 0, projetsAvecAffectations: 0 }))
    );
  }

  rechercherAffectations(filtres: {
    statut?: string; projectId?: number | string;
    volontaireId?: number | string; dateDebut?: string; dateFin?: string;
  }): Observable<Affectation[]> {
    return this.getAllAffectations().pipe(
      map(affectations => {
        let filtered = affectations;
        if (filtres.statut) filtered = filtered.filter(a => a.statut === filtres.statut);
        if (filtres.projectId) filtered = filtered.filter(a => String(a.projectId) === String(filtres.projectId!));
        if (filtres.volontaireId) filtered = filtered.filter(a => String(a.volontaireId) === String(filtres.volontaireId!));
        if (filtres.dateDebut) filtered = filtered.filter(a => a.dateAffectation >= filtres.dateDebut!);
        if (filtres.dateFin) filtered = filtered.filter(a => a.dateAffectation <= filtres.dateFin!);
        return filtered;
      })
    );
  }

  getHistoriqueVolontaire(volontaireId: number | string): Observable<Affectation[]> {
    return this.getAffectationsByVolontaire(volontaireId).pipe(
      map(a => a.sort((x, y) =>
        new Date(y.dateAffectation).getTime() - new Date(x.dateAffectation).getTime()
      ))
    );
  }
}