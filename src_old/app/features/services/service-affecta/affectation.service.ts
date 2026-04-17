// src/app/services/affectation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, catchError, of } from 'rxjs';

// src/app/models/affectation.model.ts
export interface Affectation {
  id?: number | string;
  volontaireId: number | string;
  projectId: number | string;
  dateAffectation: string;
  dateFin?: string;
  statut: 'active' | 'terminee' | 'annulee' | 'inactive'; // ✅ Unifier les statuts
  role: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AffectationService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // ==================== MÉTHODES CRUD DE BASE ====================

  /**
   * Créer une affectation
   */
  createAffectation(affectation: Affectation): Observable<Affectation> {
    const affectationAvecDates = {
      ...affectation,
      dateAffectation: affectation.dateAffectation || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      statut: affectation.statut || 'active'
    };
    
    return this.http.post<Affectation>(`${this.apiUrl}/affectations`, affectationAvecDates).pipe(
      catchError(error => {
        console.error('❌ Erreur création affectation:', error);
        throw error;
      })
    );
  }

  /**
   * Obtenir toutes les affectations
   */
  getAllAffectations(): Observable<Affectation[]> {
    return this.http.get<Affectation[]>(`${this.apiUrl}/affectations`).pipe(
      catchError(error => {
        console.error('❌ Erreur récupération affectations:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtenir une affectation par ID
   */
  getAffectationById(id: number | string): Observable<Affectation> {
    return this.http.get<Affectation>(`${this.apiUrl}/affectations/${id}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur récupération affectation ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Obtenir les affectations d'un projet
   */
  getAffectationsByProject(projectId: number | string): Observable<Affectation[]> {
    return this.http.get<Affectation[]>(`${this.apiUrl}/affectations?projectId=${projectId}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur affectations projet ${projectId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Obtenir les affectations actives d'un projet
   */
  getAffectationsActivesByProject(projectId: number | string): Observable<Affectation[]> {
    return this.getAffectationsByProject(projectId).pipe(
      map(affectations => affectations.filter(a => a.statut === 'active'))
    );
  }

  /**
   * Obtenir les affectations d'un volontaire
   */
  getAffectationsByVolontaire(volontaireId: number | string): Observable<Affectation[]> {
    return this.http.get<Affectation[]>(`${this.apiUrl}/affectations?volontaireId=${volontaireId}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur affectations volontaire ${volontaireId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Obtenir les affectations actives d'un volontaire
   */
  getAffectationsActivesByVolontaire(volontaireId: number | string): Observable<Affectation[]> {
    return this.getAffectationsByVolontaire(volontaireId).pipe(
      map(affectations => affectations.filter(a => a.statut === 'active'))
    );
  }

  /**
   * Mettre à jour une affectation
   */
  updateAffectation(affectationId: number | string, updates: Partial<Affectation>): Observable<Affectation> {
    const updatesAvecDate = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return this.http.patch<Affectation>(`${this.apiUrl}/affectations/${affectationId}`, updatesAvecDate).pipe(
      catchError(error => {
        console.error(`❌ Erreur mise à jour affectation ${affectationId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Terminer une affectation
   */
  terminerAffectation(affectationId: number | string): Observable<Affectation> {
    return this.updateAffectation(affectationId, {
      statut: 'terminee',
      dateFin: new Date().toISOString()
    });
  }

  /**
   * Annuler une affectation
   */
  annulerAffectation(affectationId: number | string): Observable<Affectation> {
    return this.updateAffectation(affectationId, {
      statut: 'annulee',
      dateFin: new Date().toISOString()
    });
  }

  /**
   * Supprimer une affectation
   */
  deleteAffectation(affectationId: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/affectations/${affectationId}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur suppression affectation ${affectationId}:`, error);
        throw error;
      })
    );
  }

  // ==================== MÉTHODES DE VÉRIFICATION ====================

  /**
   * Vérifier si un volontaire est déjà affecté à un projet
   */
  estVolontaireAffecte(volontaireId: number | string, projectId: number | string): Observable<boolean> {
    return this.getAffectationsByProject(projectId).pipe(
      map(affectations => {
        return affectations.some(affectation => {
          // ✅ Comparaison sécurisée des IDs
          const affectVolontaireId = affectation.volontaireId?.toString();
          const searchVolontaireId = volontaireId?.toString();
          return affectVolontaireId === searchVolontaireId && affectation.statut === 'active';
        });
      }),
      catchError(error => {
        console.error('❌ Erreur vérification affectation:', error);
        return of(false);
      })
    );
  }

  /**
   * Vérifier si un volontaire peut être affecté à un projet
   */
  peutEtreAffecte(volontaireId: number | string, projectId: number | string): Observable<boolean> {
    return this.estVolontaireAffecte(volontaireId, projectId).pipe(
      map(estDejaAffecte => !estDejaAffecte)
    );
  }

  // ==================== MÉTHODES STATISTIQUES ====================

  /**
   * Compter les volontaires actifs par projet
   */
  countVolontairesActifsByProject(projectId: number | string): Observable<number> {
    return this.getAffectationsActivesByProject(projectId).pipe(
      map(affectations => affectations.length),
      catchError(error => {
        console.error(`❌ Erreur comptage volontaires projet ${projectId}:`, error);
        return of(0);
      })
    );
  }

  /**
   * Obtenir les statistiques d'affectation par projet
   */
  getStatsByProject(projectId: number | string): Observable<{ total: number; actifs: number; termines: number; annules: number }> {
    return this.getAffectationsByProject(projectId).pipe(
      map(affectations => ({
        total: affectations.length,
        actifs: affectations.filter(a => a.statut === 'active').length,
        termines: affectations.filter(a => a.statut === 'terminee').length,
        annules: affectations.filter(a => a.statut === 'annulee').length
      })),
      catchError(error => {
        console.error(`❌ Erreur stats projet ${projectId}:`, error);
        return of({ total: 0, actifs: 0, termines: 0, annules: 0 });
      })
    );
  }

  /**
   * Obtenir les statistiques globales
   */
  getStatsGlobales(): Observable<{ total: number; actifs: number; termines: number; projetsAvecAffectations: number }> {
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
      catchError(error => {
        console.error('❌ Erreur stats globales:', error);
        return of({ total: 0, actifs: 0, termines: 0, projetsAvecAffectations: 0 });
      })
    );
  }

  // ==================== MÉTHODES DE RECHERCHE ====================

  /**
   * Rechercher des affectations avec filtres
   */
  rechercherAffectations(filtres: {
    statut?: string;
    projectId?: number | string;
    volontaireId?: number | string;
    dateDebut?: string;
    dateFin?: string;
  }): Observable<Affectation[]> {
    return this.getAllAffectations().pipe(
      map(affectations => {
        let filtered = affectations;

        if (filtres.statut) {
          filtered = filtered.filter(a => a.statut === filtres.statut);
        }

        if (filtres.projectId) {
          const projectIdStr = filtres.projectId.toString();
          filtered = filtered.filter(a => a.projectId?.toString() === projectIdStr);
        }

        if (filtres.volontaireId) {
          const volontaireIdStr = filtres.volontaireId.toString();
          filtered = filtered.filter(a => a.volontaireId?.toString() === volontaireIdStr);
        }

        if (filtres.dateDebut) {
          filtered = filtered.filter(a => a.dateAffectation >= filtres.dateDebut!);
        }

        if (filtres.dateFin) {
          filtered = filtered.filter(a => a.dateAffectation <= filtres.dateFin!);
        }

        return filtered;
      })
    );
  }

  /**
   * Obtenir l'historique des affectations d'un volontaire
   */
  getHistoriqueVolontaire(volontaireId: number | string): Observable<Affectation[]> {
    return this.getAffectationsByVolontaire(volontaireId).pipe(
      map(affectations => 
        affectations.sort((a, b) => 
          new Date(b.dateAffectation).getTime() - new Date(a.dateAffectation).getTime()
        )
      )
    );
  }

  /**
   * Obtenir les projets actifs d'un volontaire
   */
  getProjetsActifsVolontaire(volontaireId: number | string): Observable<Affectation[]> {
    return this.getAffectationsActivesByVolontaire(volontaireId);
  }
}