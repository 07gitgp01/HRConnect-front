// src/app/features/partenaires/services/volontaires-structure.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of, switchMap, tap } from 'rxjs';
import { Volontaire } from '../../models/volontaire.model';
import { Project } from '../../models/projects.model';
import { Affectation } from '../../services/service-affecta/affectation.service';
import { environment } from '../../environment/environment';

export interface VolontaireStructure extends Volontaire {
  affectations?: Affectation[];           // ✅ TOUTES les affectations (historique complet)
  affectationActive?: Affectation | null; // ✅ L'affectation active (si existe)
  dateAffectation?: string;
  statutAffectation?: string;
  projetNom?: string;
  projetId?: number | string;
  roleProjet?: string;
  notesStructure?: string;
  moyenneEvaluation?: number;
  dernierEvaluation?: any;
  missionTerminee?: boolean;
  missionsTermineesCount?: number;        // ✅ Nombre de missions terminées
}

export interface StatsVolontairesStructure {
  total: number;
  actifs: number;
  termines: number;
  enAttente: number;
  annules: number;
  parProjet: { [projetId: string]: number };
  parStatutAffectation: { [statut: string]: number };
  parRole: { [role: string]: number };
  tauxRetention: number;
  volontairesAvecCV?: number;
  volontairesAvecPiece?: number;
}

@Injectable({
  providedIn: 'root'
})
export class VolontairesStructureService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ==================== MÉTHODES PRINCIPALES ====================

  /**
   * Récupère les volontaires associés à un partenaire
   * ✅ GARDE : Volontaires avec mission ACTIVE ou TERMINÉE (historique complet)
   * ✅ AFFICHE : La mission en cours (active) si elle existe, sinon la mission terminée la plus récente
   * ✅ HISTORIQUE : Toutes les missions sont conservées
   */
  getVolontairesByStructure(partenaireId: number | string): Observable<VolontaireStructure[]> {
    console.log(`🔍 [VolontairesStructure] Chargement pour partenaire #${partenaireId}`);
    
    return forkJoin({
      projets: this.getProjetsStructure(partenaireId),
      affectations: this.getAffectationsStructure(partenaireId)
    }).pipe(
      tap(({ projets, affectations }) => {
        console.log(`📁 Projets trouvés:`, projets.length);
        console.log(`📋 Affectations trouvées:`, affectations.length);
      }),
      switchMap(({ projets, affectations }) => {
        // ✅ GARDER UNIQUEMENT les affectations ACTIVES ou TERMINÉES
        // ❌ EXCLURE les affectations annulées
        const affectationsValides = affectations.filter(a => 
          a.statut === 'active' || a.statut === 'terminee'
        );
        
        console.log(`✅ Affectations valides (active/terminée):`, affectationsValides.length);
        
        const volontaireIds = [...new Set(
          affectationsValides.map(a => a.volontaireId).filter(id => id !== undefined)
        )];

        console.log(`👥 Volontaires avec missions:`, volontaireIds);

        if (volontaireIds.length === 0) {
          console.log(`ℹ️ Aucun volontaire avec mission`);
          return of([]);
        }

        return this.getVolontairesByIds(volontaireIds).pipe(
          map(volontaires => {
            console.log(`✅ Volontaires chargés:`, volontaires.length);
            
            return volontaires.map(volontaire => {
              // ✅ Récupérer TOUTES les affectations du volontaire (historique complet)
              const affectationsVolontaire = affectationsValides.filter(a =>
                a.volontaireId?.toString() === volontaire.id?.toString()
              );

              // ✅ Compter les missions terminées
              const missionsTermineesCount = affectationsVolontaire.filter(a => 
                a.statut === 'terminee'
              ).length;

              // ✅ Trouver l'affectation active (s'il y en a une)
              const affectationActive = affectationsVolontaire.find(a => a.statut === 'active');
              
              // ✅ Pour l'affichage principal :
              // - S'il y a une mission active, on l'affiche
              // - Sinon, on prend la mission terminée la plus récente
              let affectationPrincipale = affectationActive;
              let missionTerminee = false;
              
              if (!affectationPrincipale) {
                // Prendre la plus récente des missions terminées
                const affectationsTerminees = affectationsVolontaire
                  .filter(a => a.statut === 'terminee')
                  .sort((a, b) => 
                    new Date(b.dateAffectation).getTime() - new Date(a.dateAffectation).getTime()
                  );
                
                if (affectationsTerminees.length > 0) {
                  affectationPrincipale = affectationsTerminees[0];
                  missionTerminee = true;
                }
              }

              if (!affectationPrincipale) {
                return null; // Ne devrait pas arriver
              }

              // Trouver le projet associé à l'affectation principale
              const projet = projets.find(p =>
                p.id?.toString() === affectationPrincipale.projectId?.toString()
              );

              const projetNom = (projet as any)?.titre
                || (projet as any)?.title
                || 'Projet sans nom';

              return {
                ...volontaire,
                affectations: affectationsVolontaire,           // ✅ TOUT l'historique
                affectationActive,                               // ✅ L'active (si existe)
                dateAffectation: affectationPrincipale.dateAffectation,
                statutAffectation: affectationPrincipale.statut,
                projetNom: missionTerminee ? `${projetNom} (terminé)` : projetNom,
                projetId: affectationPrincipale.projectId,
                roleProjet: affectationPrincipale.role || 'Rôle non défini',
                missionTerminee,
                missionsTermineesCount                          // ✅ Nombre de missions terminées
              } as VolontaireStructure;
            }).filter(v => v !== null) as VolontaireStructure[];
          })
        );
      }),
      catchError(error => {
        console.error('❌ Erreur récupération volontaires structure:', error);
        return of([]);
      })
    );
  }

  /**
   * Récupère le détail d'un volontaire spécifique
   */
  getVolontaireDetail(volontaireId: number | string, partenaireId: number | string): Observable<VolontaireStructure | null> {
    return forkJoin({
      volontaire: this.http.get<Volontaire>(`${this.baseUrl}/volontaires/${volontaireId}`).pipe(
        catchError(() => of(null))
      ),
      affectations: this.getAffectationsVolontaireStructure(volontaireId, partenaireId),
      evaluations: this.getEvaluationsVolontaire(volontaireId, partenaireId),
      projets: this.getProjetsStructure(partenaireId)
    }).pipe(
      map(({ volontaire, affectations, evaluations, projets }) => {
        if (!volontaire) return null;

        // ✅ GARDER UNIQUEMENT les affectations ACTIVES ou TERMINÉES
        const affectationsValides = affectations.filter(a => 
          a.statut === 'active' || a.statut === 'terminee'
        );
        
        if (affectationsValides.length === 0) {
          return null; // ❌ Volontaire sans mission active ou terminée
        }
        
        // ✅ Compter les missions terminées
        const missionsTermineesCount = affectationsValides.filter(a => 
          a.statut === 'terminee'
        ).length;
        
        // ✅ Trouver l'affectation active (s'il y en a une)
        const affectationActive = affectationsValides.find(a => a.statut === 'active');
        
        // ✅ Trier par date (plus récente d'abord)
        const affectationsTriees = [...affectationsValides].sort((a, b) => 
          new Date(b.dateAffectation).getTime() - new Date(a.dateAffectation).getTime()
        );

        // ✅ Pour l'affichage principal :
        // - S'il y a une mission active, on l'affiche
        // - Sinon, on prend la mission terminée la plus récente
        const affectationPrincipale = affectationActive || affectationsTriees[0];
        const missionTerminee = affectationPrincipale.statut === 'terminee';

        const projet = projets.find(p =>
          p.id?.toString() === affectationPrincipale.projectId?.toString()
        );

        const projetNom = (projet as any)?.titre
          || (projet as any)?.title
          || 'Projet sans nom';

        return {
          ...volontaire,
          affectations: affectationsValides,                    // ✅ TOUT l'historique
          affectationActive,
          dateAffectation: affectationPrincipale.dateAffectation,
          statutAffectation: affectationPrincipale.statut,
          projetNom: missionTerminee ? `${projetNom} (terminé)` : projetNom,
          projetId: affectationPrincipale.projectId,
          roleProjet: affectationPrincipale.role || 'Rôle non défini',
          missionTerminee,
          missionsTermineesCount,                               // ✅ Nombre de missions terminées
          evaluations,
          moyenneEvaluation: this.calculerMoyenneEvaluation(evaluations),
          dernierEvaluation: evaluations.length > 0
            ? evaluations.sort((a, b) =>
                new Date(b.dateSoumission).getTime() - new Date(a.dateSoumission).getTime()
              )[0]
            : null
        } as VolontaireStructure;
      }),
      catchError(error => {
        console.error('❌ Erreur détail volontaire:', error);
        return of(null);
      })
    );
  }

  getVolontairesFiltres(partenaireId: number | string, filtres: any): Observable<VolontaireStructure[]> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => this.filtrerVolontaires(volontaires, filtres))
    );
  }

  // ==================== MÉTHODES PRIVÉES ====================

  private getProjetsStructure(partenaireId: number | string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projets?partenaireId=${partenaireId}`).pipe(
      switchMap(projets => {
        if (projets && projets.length > 0) {
          return of(projets);
        }
        return this.http.get<Project[]>(`${this.baseUrl}/projets?organisationId=${partenaireId}`).pipe(
          catchError(() => of([]))
        );
      }),
      catchError(() => of([]))
    );
  }

  private getAffectationsStructure(partenaireId: number | string): Observable<Affectation[]> {
    return this.getProjetsStructure(partenaireId).pipe(
      switchMap(projets => {
        const projetIds = projets.map(p => p.id).filter(id => id !== undefined);

        if (projetIds.length === 0) {
          return of([]);
        }

        const affectationsObservables = projetIds.map(projectId =>
          this.http.get<Affectation[]>(`${this.baseUrl}/affectations?projectId=${projectId}`).pipe(
            catchError(() => of([]))
          )
        );

        return forkJoin(affectationsObservables).pipe(
          map(arrays => arrays.flat())
        );
      }),
      catchError(() => of([]))
    );
  }

  private getVolontairesByIds(ids: (number | string)[]): Observable<Volontaire[]> {
    if (ids.length === 0) return of([]);

    const requests = ids.map(id =>
      this.http.get<Volontaire>(`${this.baseUrl}/volontaires/${id}`).pipe(
        catchError(() => of(null))
      )
    );

    return forkJoin(requests).pipe(
      map(volontaires => volontaires.filter(v => v !== null) as Volontaire[])
    );
  }

  private getAffectationsVolontaireStructure(
    volontaireId: number | string,
    partenaireId: number | string
  ): Observable<Affectation[]> {
    return forkJoin({
      affectationsVolontaire: this.http.get<Affectation[]>(
        `${this.baseUrl}/affectations?volontaireId=${volontaireId}`
      ).pipe(catchError(() => of([]))),
      projetsStructure: this.getProjetsStructure(partenaireId)
    }).pipe(
      map(({ affectationsVolontaire, projetsStructure }) => {
        const projetIdsStructure = projetsStructure
          .map(p => p.id?.toString())
          .filter((id): id is string => id !== undefined);

        return affectationsVolontaire.filter(affectation =>
          projetIdsStructure.some(projetId => projetId === affectation.projectId?.toString())
        );
      }),
      catchError(() => of([]))
    );
  }

  private getEvaluationsVolontaire(
    volontaireId: number | string,
    partenaireId: number | string
  ): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/rapports?volontaireId=${volontaireId}&partenaireId=${partenaireId}`
    ).pipe(catchError(() => of([])));
  }

  private calculerMoyenneEvaluation(evaluations: any[]): number {
    if (evaluations.length === 0) return 0;
    const somme = evaluations.reduce((total, e) => total + (e.evaluationGlobale || 0), 0);
    return Math.round((somme / evaluations.length) * 10) / 10;
  }

  // ==================== GESTION ====================

  updateRoleVolontaire(affectationId: number | string, role: string): Observable<Affectation> {
    return this.http.patch<Affectation>(`${this.baseUrl}/affectations/${affectationId}`, {
      role,
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(error => { console.error('❌ Erreur mise à jour rôle:', error); throw error; })
    );
  }

  /**
   * ✅ Termine une mission - le volontaire RESTE dans la liste
   */
  terminerAffectation(affectationId: number | string): Observable<Affectation> {
    return this.http.patch<Affectation>(`${this.baseUrl}/affectations/${affectationId}`, {
      statut: 'terminee',
      dateFin: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).pipe(
      tap(() => console.log(`✅ Mission terminée - le volontaire reste visible`)),
      catchError(error => { console.error('❌ Erreur terminaison mission:', error); throw error; })
    );
  }

  /**
   * ✅ Annule/retire une affectation - le volontaire DISPARAÎT
   */
  annulerAffectation(affectationId: number | string): Observable<Affectation> {
    return this.http.patch<Affectation>(`${this.baseUrl}/affectations/${affectationId}`, {
      statut: 'annulee',
      dateFin: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).pipe(
      tap(() => console.log(`✅ Affectation annulée - le volontaire disparaît`)),
      catchError(error => { console.error('❌ Erreur annulation affectation:', error); throw error; })
    );
  }

  ajouterNotesStructure(
    volontaireId: number | string,
    partenaireId: number | string,
    notes: string
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/volontaires-structure/notes`, {
      volontaireId, partenaireId, notes,
      date: new Date().toISOString()
    }).pipe(catchError(() => of(null)));
  }

  // ==================== FILTRAGE ====================

  filtrerVolontaires(volontaires: VolontaireStructure[], filtres: any): VolontaireStructure[] {
    let filtered = [...volontaires];

    if (filtres.statutAffectation && filtres.statutAffectation !== 'tous') {
      filtered = filtered.filter(v => v.statutAffectation === filtres.statutAffectation);
    }
    if (filtres.projetId && filtres.projetId !== 'tous') {
      filtered = filtered.filter(v => v.projetId?.toString() === filtres.projetId.toString());
    }
    if (filtres.role && filtres.role !== 'tous') {
      filtered = filtered.filter(v => v.roleProjet === filtres.role);
    }
    if (filtres.missionTerminee !== undefined) {
      filtered = filtered.filter(v => v.missionTerminee === filtres.missionTerminee);
    }
    if (filtres.searchTerm?.trim()) {
      const term = filtres.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(v =>
        v.nom.toLowerCase().includes(term) ||
        v.prenom.toLowerCase().includes(term) ||
        v.email.toLowerCase().includes(term) ||
        v.telephone?.includes(term) ||
        v.projetNom?.toLowerCase().includes(term) ||
        v.roleProjet?.toLowerCase().includes(term) ||
        v.competences?.some(c => c.toLowerCase().includes(term))
      );
    }
    if (filtres.competence && filtres.competence !== 'toutes') {
      filtered = filtered.filter(v =>
        v.competences?.some(c => c.toLowerCase() === filtres.competence.toLowerCase())
      );
    }
    if (filtres.disponibilite && filtres.disponibilite !== 'toutes') {
      filtered = filtered.filter(v => v.disponibilite === filtres.disponibilite);
    }
    if (filtres.dateDebut) {
      const dateDebut = new Date(filtres.dateDebut);
      filtered = filtered.filter(v =>
        v.dateAffectation && new Date(v.dateAffectation) >= dateDebut
      );
    }
    if (filtres.dateFin) {
      const dateFin = new Date(filtres.dateFin);
      dateFin.setHours(23, 59, 59, 999);
      filtered = filtered.filter(v =>
        v.dateAffectation && new Date(v.dateAffectation) <= dateFin
      );
    }
    if (filtres.typePiece && filtres.typePiece !== 'tous') {
      filtered = filtered.filter(v => v.typePiece === filtres.typePiece);
    }
    if (filtres.niveauEtudes && filtres.niveauEtudes !== 'tous') {
      filtered = filtered.filter(v => v.niveauEtudes === filtres.niveauEtudes);
    }

    return filtered;
  }

  // ==================== STATISTIQUES ====================

  getStatsStructure(partenaireId: number | string): Observable<StatsVolontairesStructure> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => ({
        total: volontaires.length,
        actifs: volontaires.filter(v => v.statutAffectation === 'active').length,
        termines: volontaires.filter(v => v.statutAffectation === 'terminee').length,
        enAttente: volontaires.filter(v => v.statutAffectation === 'en_attente').length,
        annules: volontaires.filter(v => v.statutAffectation === 'annulee').length,
        parProjet: this.calculerParProjet(volontaires),
        parStatutAffectation: this.calculerParStatutAffectation(volontaires),
        parRole: this.calculerParRole(volontaires),
        tauxRetention: this.calculerTauxRetention(volontaires),
        volontairesAvecCV: volontaires.filter(v => v.urlCV?.trim()).length,
        volontairesAvecPiece: volontaires.filter(v => v.urlPieceIdentite?.trim()).length
      })),
      catchError(() => of({
        total: 0, actifs: 0, termines: 0, enAttente: 0, annules: 0,
        parProjet: {}, parStatutAffectation: {}, parRole: {},
        tauxRetention: 0, volontairesAvecCV: 0, volontairesAvecPiece: 0
      }))
    );
  }

  private calculerParProjet(volontaires: VolontaireStructure[]): { [k: string]: number } {
    const map: { [k: string]: number } = {};
    volontaires.forEach(v => {
      if (v.projetId) {
        const key = v.projetId.toString();
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }

  private calculerParStatutAffectation(volontaires: VolontaireStructure[]): { [k: string]: number } {
    const map: { [k: string]: number } = {};
    volontaires.forEach(v => {
      const statut = v.statutAffectation || 'non_affecte';
      map[statut] = (map[statut] || 0) + 1;
    });
    return map;
  }

  private calculerParRole(volontaires: VolontaireStructure[]): { [k: string]: number } {
    const map: { [k: string]: number } = {};
    volontaires.forEach(v => {
      const role = v.roleProjet || 'Non défini';
      map[role] = (map[role] || 0) + 1;
    });
    return map;
  }

  private calculerTauxRetention(volontaires: VolontaireStructure[]): number {
    const total = volontaires.filter(v => v.statutAffectation).length;
    if (total === 0) return 0;
    const termines = volontaires.filter(v => v.statutAffectation === 'terminee').length;
    return Math.round(((total - termines) / total) * 100);
  }

  // ==================== EXPORT ====================

  exportVolontairesStructure(partenaireId: number | string, format: 'excel' | 'pdf' = 'excel'): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/volontaires-structure/export/${partenaireId}?format=${format}`,
      { responseType: 'blob' }
    ).pipe(
      catchError(error => { console.error('❌ Erreur export:', error); throw error; })
    );
  }

  // ==================== OPTIONS FILTRES ====================

  getOptionsFiltres(partenaireId: number | string): Observable<{
    projets: { id: string, nom: string }[],
    roles: string[],
    competences: string[],
    niveauxEtudes: string[],
    typesPiece: string[],
    disponibilites: string[]
  }> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => {
        const projetsSet = new Set<string>();
        const rolesSet = new Set<string>();
        const competencesSet = new Set<string>();
        const niveauxEtudesSet = new Set<string>();
        const typesPieceSet = new Set<string>();
        const disponibilitesSet = new Set<string>();

        volontaires.forEach(v => {
          if (v.projetId && v.projetNom) {
            projetsSet.add(JSON.stringify({ id: v.projetId.toString(), nom: v.projetNom }));
          }
          if (v.roleProjet) rolesSet.add(v.roleProjet);
          v.competences?.forEach(c => competencesSet.add(c));
          if (v.niveauEtudes) niveauxEtudesSet.add(v.niveauEtudes);
          if (v.typePiece) typesPieceSet.add(v.typePiece);
          if (v.disponibilite) disponibilitesSet.add(v.disponibilite);
        });

        return {
          projets: Array.from(projetsSet).map(str => JSON.parse(str)),
          roles: Array.from(rolesSet).sort(),
          competences: Array.from(competencesSet).sort(),
          niveauxEtudes: Array.from(niveauxEtudesSet).sort(),
          typesPiece: Array.from(typesPieceSet).sort(),
          disponibilites: Array.from(disponibilitesSet).sort()
        };
      }),
      catchError(() => of({
        projets: [], roles: [], competences: [],
        niveauxEtudes: [], typesPiece: [], disponibilites: []
      }))
    );
  }

  // ==================== GRAPHIQUES ====================

  getDataGraphiqueProjets(partenaireId: number | string): Observable<{ nom: string, count: number }[]> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => {
        const map = new Map<string, number>();
        volontaires.forEach(v => {
          if (v.projetNom) {
            const nomPropre = v.projetNom.replace(' (terminé)', '');
            map.set(nomPropre, (map.get(nomPropre) || 0) + 1);
          }
        });
        return Array.from(map.entries()).map(([nom, count]) => ({ nom, count }));
      })
    );
  }

  getDataGraphiqueStatuts(partenaireId: number | string): Observable<{ statut: string, count: number }[]> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => {
        const map = new Map<string, number>();
        volontaires.forEach(v => {
          const statut = v.missionTerminee ? 'Mission terminée' : 'Mission en cours';
          map.set(statut, (map.get(statut) || 0) + 1);
        });
        return Array.from(map.entries()).map(([statut, count]) => ({ statut, count }));
      })
    );
  }

  getEvolutionVolontaires(partenaireId: number | string): Observable<{ mois: string, count: number }[]> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => {
        const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const aujourdhui = new Date();

        return Array.from({ length: 6 }, (_, i) => {
          const date = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - (5 - i), 1);
          const count = volontaires.filter(v => {
            if (!v.dateAffectation) return false;
            const d = new Date(v.dateAffectation);
            return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
          }).length;
          return { mois: `${mois[date.getMonth()]} ${date.getFullYear()}`, count };
        });
      })
    );
  }
}