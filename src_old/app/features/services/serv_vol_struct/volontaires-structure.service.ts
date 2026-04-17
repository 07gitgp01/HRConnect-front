import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of, switchMap } from 'rxjs';
import { Volontaire } from '../../models/volontaire.model';
import { Project } from '../../models/projects.model';
import { Affectation } from '../service-affecta/affectation.service';
import { environment } from '../../environment/environment';

export interface VolontaireStructure extends Volontaire {
  affectations?: Affectation[];
  affectationActive?: Affectation;
  dateAffectation?: string;
  statutAffectation?: string;
  projetNom?: string;
  projetId?: number | string;
  roleProjet?: string;
  notesStructure?: string;
  moyenneEvaluation?: number;
  dernierEvaluation?: any;
}

export interface StatsVolontairesStructure {
  total: number;
  actifs: number;
  enAttente: number;
  termines: number;
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
   * Récupérer tous les volontaires affectés aux projets de la structure
   */
  getVolontairesByStructure(partenaireId: number | string): Observable<VolontaireStructure[]> {
    return forkJoin({
      projets: this.getProjetsStructure(partenaireId),
      affectations: this.getAffectationsStructure(partenaireId)
    }).pipe(
      switchMap(({ projets, affectations }) => {
        const volontaireIds = [...new Set(
          affectations.map(a => a.volontaireId).filter(id => id !== undefined)
        )];
        
        if (volontaireIds.length === 0) {
          return of([]);
        }
        
        return this.getVolontairesByIds(volontaireIds).pipe(
          map(volontaires => {
            return volontaires.map(volontaire => {
              const affectationsVolontaire = affectations.filter(a => 
                a.volontaireId?.toString() === volontaire.id?.toString()
              );
              
              const affectationActive = affectationsVolontaire.find(a => a.statut === 'active');
              const projet = projets.find(p => p.id === affectationActive?.projectId);
              
              return {
                ...volontaire,
                affectations: affectationsVolontaire,
                affectationActive: affectationActive,
                dateAffectation: affectationActive?.dateAffectation,
                statutAffectation: affectationActive?.statut,
                projetNom: projet?.titre,
                projetId: affectationActive?.projectId,
                roleProjet: affectationActive?.role
              } as VolontaireStructure;
            });
          })
        );
      }),
      catchError(error => {
        console.error('Erreur récupération volontaires structure:', error);
        return of([]);
      })
    );
  }

  /**
   * Récupérer un volontaire spécifique avec détails de la structure
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
        
        const affectationActive = affectations.find(a => a.statut === 'active');
        const projet = affectationActive ? projets.find(p => p.id === affectationActive.projectId) : null;
        
        return {
          ...volontaire,
          affectations: affectations,
          affectationActive: affectationActive,
          dateAffectation: affectationActive?.dateAffectation,
          statutAffectation: affectationActive?.statut,
          projetNom: projet?.titre,
          projetId: affectationActive?.projectId,
          roleProjet: affectationActive?.role,
          evaluations: evaluations,
          moyenneEvaluation: this.calculerMoyenneEvaluation(evaluations),
          dernierEvaluation: evaluations.length > 0 ? 
            evaluations.sort((a, b) => new Date(b.dateSoumission).getTime() - new Date(a.dateSoumission).getTime())[0] : 
            null
        } as VolontaireStructure;
      }),
      catchError(error => {
        console.error('Erreur détail volontaire:', error);
        return of(null);
      })
    );
  }

  /**
   * Récupérer les volontaires avec filtre avancé
   */
  getVolontairesFiltres(partenaireId: number | string, filtres: any): Observable<VolontaireStructure[]> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => this.filtrerVolontaires(volontaires, filtres))
    );
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  private getProjetsStructure(partenaireId: number | string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projets?partenaireId=${partenaireId}`).pipe(
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
    if (ids.length === 0) {
      return of([]);
    }
    
    const requests = ids.map(id => 
      this.http.get<Volontaire>(`${this.baseUrl}/volontaires/${id}`).pipe(
        catchError(() => of(null))
      )
    );
    
    return forkJoin(requests).pipe(
      map(volontaires => volontaires.filter(v => v !== null) as Volontaire[])
    );
  }

  private getAffectationsVolontaireStructure(volontaireId: number | string, partenaireId: number | string): Observable<Affectation[]> {
  return forkJoin({
    affectationsVolontaire: this.http.get<Affectation[]>(`${this.baseUrl}/affectations?volontaireId=${volontaireId}`).pipe(
      catchError(() => of([]))
    ),
    projetsStructure: this.getProjetsStructure(partenaireId)
  }).pipe(
    map(({ affectationsVolontaire, projetsStructure }) => {
      // ✅ Conversion en string pour éviter les problèmes de type
      const projetIdsStructure = projetsStructure.map(p => p.id?.toString()).filter(id => id !== undefined);
      
      return affectationsVolontaire.filter(affectation => 
        // ✅ Vérification avec conversion en string
        projetIdsStructure.some(projetId => 
          projetId === affectation.projectId?.toString()
        )
      );
    }),
    catchError(() => of([]))
  );
}

  private getEvaluationsVolontaire(volontaireId: number | string, partenaireId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/rapports?volontaireId=${volontaireId}&partenaireId=${partenaireId}`).pipe(
      catchError(() => of([]))
    );
  }

  private calculerMoyenneEvaluation(evaluations: any[]): number {
    if (evaluations.length === 0) return 0;
    const somme = evaluations.reduce((total, evalItem) => total + (evalItem.evaluationGlobale || 0), 0);
    return Math.round((somme / evaluations.length) * 10) / 10;
  }

  // ==================== MÉTHODES DE GESTION ====================

  /**
   * Ajouter des notes spécifiques à la structure
   */
  ajouterNotesStructure(volontaireId: number | string, partenaireId: number | string, notes: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/volontaires-structure/notes`, {
      volontaireId,
      partenaireId,
      notes,
      date: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error('Erreur ajout notes structure:', error);
        return of(null);
      })
    );
  }

  /**
   * Mettre à jour le rôle d'un volontaire dans un projet
   */
  updateRoleVolontaire(affectationId: number | string, role: string): Observable<Affectation> {
    return this.http.patch<Affectation>(`${this.baseUrl}/affectations/${affectationId}`, {
      role,
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error('Erreur mise à jour rôle:', error);
        throw error;
      })
    );
  }

  /**
   * Terminer une affectation
   */
  terminerAffectation(affectationId: number | string): Observable<Affectation> {
    return this.http.patch<Affectation>(`${this.baseUrl}/affectations/${affectationId}`, {
      statut: 'terminee',
      dateFin: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error('Erreur terminaison affectation:', error);
        throw error;
      })
    );
  }

  /**
   * Annuler une affectation
   */
  annulerAffectation(affectationId: number | string): Observable<Affectation> {
    return this.http.patch<Affectation>(`${this.baseUrl}/affectations/${affectationId}`, {
      statut: 'annulee',
      dateFin: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error('Erreur annulation affectation:', error);
        throw error;
      })
    );
  }

  // ==================== MÉTHODES DE FILTRAGE ====================

  /**
   * Filtrer les volontaires selon plusieurs critères
   */
  filtrerVolontaires(volontaires: VolontaireStructure[], filtres: any): VolontaireStructure[] {
    let filtered = [...volontaires];

    // Filtre par statut d'affectation
    if (filtres.statutAffectation && filtres.statutAffectation !== 'tous') {
      filtered = filtered.filter(v => v.statutAffectation === filtres.statutAffectation);
    }

    // Filtre par projet
    if (filtres.projetId && filtres.projetId !== 'tous') {
      filtered = filtered.filter(v => v.projetId?.toString() === filtres.projetId.toString());
    }

    // Filtre par rôle
    if (filtres.role && filtres.role !== 'tous') {
      filtered = filtered.filter(v => v.roleProjet === filtres.role);
    }

    // Filtre par recherche texte
    if (filtres.searchTerm && filtres.searchTerm.trim()) {
      const term = filtres.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(v =>
        v.nom.toLowerCase().includes(term) ||
        v.prenom.toLowerCase().includes(term) ||
        v.email.toLowerCase().includes(term) ||
        (v.telephone && v.telephone.includes(term)) ||
        (v.projetNom && v.projetNom.toLowerCase().includes(term)) ||
        (v.roleProjet && v.roleProjet.toLowerCase().includes(term)) ||
        (v.competences && v.competences.some(c => c.toLowerCase().includes(term)))
      );
    }

    // Filtre par compétence
    if (filtres.competence && filtres.competence !== 'toutes') {
      filtered = filtered.filter(v => 
        v.competences && v.competences.some(c => 
          c.toLowerCase() === filtres.competence.toLowerCase()
        )
      );
    }

    // Filtre par disponibilité
    if (filtres.disponibilite && filtres.disponibilite !== 'toutes') {
      filtered = filtered.filter(v => v.disponibilite === filtres.disponibilite);
    }

    // Filtre par date d'affectation
    if (filtres.dateDebut) {
      const dateDebut = new Date(filtres.dateDebut);
      filtered = filtered.filter(v => {
        if (!v.dateAffectation) return false;
        return new Date(v.dateAffectation) >= dateDebut;
      });
    }

    if (filtres.dateFin) {
      const dateFin = new Date(filtres.dateFin);
      dateFin.setHours(23, 59, 59, 999);
      filtered = filtered.filter(v => {
        if (!v.dateAffectation) return false;
        return new Date(v.dateAffectation) <= dateFin;
      });
    }

    // Filtre par type de pièce
    if (filtres.typePiece && filtres.typePiece !== 'tous') {
      filtered = filtered.filter(v => v.typePiece === filtres.typePiece);
    }

    // Filtre par niveau d'études
    if (filtres.niveauEtudes && filtres.niveauEtudes !== 'tous') {
      filtered = filtered.filter(v => v.niveauEtudes === filtres.niveauEtudes);
    }

    return filtered;
  }

  // ==================== MÉTHODES DE STATISTIQUES ====================

  /**
   * Récupérer les statistiques des volontaires de la structure
   */
  getStatsStructure(partenaireId: number | string): Observable<StatsVolontairesStructure> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => {
        const stats: StatsVolontairesStructure = {
          total: volontaires.length,
          actifs: volontaires.filter(v => v.statutAffectation === 'active').length,
          enAttente: volontaires.filter(v => v.statutAffectation === 'en_attente').length,
          termines: volontaires.filter(v => v.statutAffectation === 'terminee').length,
          annules: volontaires.filter(v => v.statutAffectation === 'annulee').length,
          parProjet: this.calculerParProjet(volontaires),
          parStatutAffectation: this.calculerParStatutAffectation(volontaires),
          parRole: this.calculerParRole(volontaires),
          tauxRetention: this.calculerTauxRetention(volontaires),
          volontairesAvecCV: volontaires.filter(v => v.urlCV && v.urlCV.trim() !== '').length,
          volontairesAvecPiece: volontaires.filter(v => v.urlPieceIdentite && v.urlPieceIdentite.trim() !== '').length
        };
        
        return stats;
      }),
      catchError(() => of({
        total: 0, actifs: 0, enAttente: 0, termines: 0, annules: 0,
        parProjet: {}, parStatutAffectation: {}, parRole: {}, tauxRetention: 0,
        volontairesAvecCV: 0, volontairesAvecPiece: 0
      }))
    );
  }

  private calculerParProjet(volontaires: VolontaireStructure[]): { [projetId: string]: number } {
    const parProjet: { [key: string]: number } = {};
    volontaires.forEach(v => {
      if (v.projetId) {
        const key = v.projetId.toString();
        parProjet[key] = (parProjet[key] || 0) + 1;
      }
    });
    return parProjet;
  }

  private calculerParStatutAffectation(volontaires: VolontaireStructure[]): { [statut: string]: number } {
    const parStatut: { [key: string]: number } = {};
    volontaires.forEach(v => {
      const statut = v.statutAffectation || 'non_affecte';
      parStatut[statut] = (parStatut[statut] || 0) + 1;
    });
    return parStatut;
  }

  private calculerParRole(volontaires: VolontaireStructure[]): { [role: string]: number } {
    const parRole: { [key: string]: number } = {};
    volontaires.forEach(v => {
      const role = v.roleProjet || 'Non défini';
      parRole[role] = (parRole[role] || 0) + 1;
    });
    return parRole;
  }

  private calculerTauxRetention(volontaires: VolontaireStructure[]): number {
    const affectationsTerminees = volontaires.filter(v => v.statutAffectation === 'terminee').length;
    const totalAffectations = volontaires.filter(v => v.statutAffectation).length;
    
    if (totalAffectations === 0) return 0;
    return Math.round(((totalAffectations - affectationsTerminees) / totalAffectations) * 100);
  }

  // ==================== MÉTHODES D'EXPORT ====================

  /**
   * Exporter les volontaires de la structure
   */
  exportVolontairesStructure(partenaireId: number | string, format: 'excel' | 'pdf' = 'excel'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/volontaires-structure/export/${partenaireId}?format=${format}`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Erreur export volontaires:', error);
        throw error;
      })
    );
  }

  // ==================== MÉTHODES POUR LES OPTIONS DE FILTRES ====================

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

        volontaires.forEach(volontaire => {
          // Projets
          if (volontaire.projetId && volontaire.projetNom) {
            projetsSet.add(JSON.stringify({ id: volontaire.projetId.toString(), nom: volontaire.projetNom }));
          }
          
          // Rôles
          if (volontaire.roleProjet) {
            rolesSet.add(volontaire.roleProjet);
          }
          
          // Compétences
          if (volontaire.competences) {
            volontaire.competences.forEach(competence => competencesSet.add(competence));
          }
          
          // Niveaux d'études
          if (volontaire.niveauEtudes) {
            niveauxEtudesSet.add(volontaire.niveauEtudes);
          }
          
          // Types de pièce
          if (volontaire.typePiece) {
            typesPieceSet.add(volontaire.typePiece);
          }
          
          // Disponibilités
          if (volontaire.disponibilite) {
            disponibilitesSet.add(volontaire.disponibilite);
          }
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

  // ==================== MÉTHODES POUR LES GRAPHIQUES ====================

  /**
   * Données pour graphique répartition par projet
   */
  getDataGraphiqueProjets(partenaireId: number | string): Observable<{ nom: string, count: number }[]> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => {
        const projetsMap = new Map<string, number>();
        
        volontaires.forEach(volontaire => {
          if (volontaire.projetId && volontaire.projetNom) {
            const key = `${volontaire.projetNom}`;
            projetsMap.set(key, (projetsMap.get(key) || 0) + 1);
          }
        });
        
        return Array.from(projetsMap.entries()).map(([nom, count]) => ({ nom, count }));
      })
    );
  }

  /**
   * Données pour graphique répartition par statut
   */
  getDataGraphiqueStatuts(partenaireId: number | string): Observable<{ statut: string, count: number }[]> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => {
        const statutsMap = new Map<string, number>();
        
        volontaires.forEach(volontaire => {
          const statut = volontaire.statutAffectation || 'Non affecté';
          statutsMap.set(statut, (statutsMap.get(statut) || 0) + 1);
        });
        
        return Array.from(statutsMap.entries()).map(([statut, count]) => ({ 
          statut, 
          count 
        }));
      })
    );
  }

  /**
   * Évolution du nombre de volontaires (derniers 6 mois)
   */
  getEvolutionVolontaires(partenaireId: number | string): Observable<{ mois: string, count: number }[]> {
    return this.getVolontairesByStructure(partenaireId).pipe(
      map(volontaires => {
        const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const aujourdhui = new Date();
        const evolution = [];
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - i, 1);
          const moisKey = mois[date.getMonth()];
          const annee = date.getFullYear();
          
          const count = volontaires.filter(v => {
            if (!v.dateAffectation) return false;
            const dateAffectation = new Date(v.dateAffectation);
            return dateAffectation.getMonth() === date.getMonth() && 
                   dateAffectation.getFullYear() === annee;
          }).length;
          
          evolution.push({ mois: `${moisKey} ${annee}`, count });
        }
        
        return evolution;
      })
    );
  }
}