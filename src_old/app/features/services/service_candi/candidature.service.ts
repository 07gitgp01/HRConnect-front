import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of, switchMap, throwError } from 'rxjs';
import { Candidature, CandidatureStats, CandidatureFiltres } from '../../models/candidature.model';
import { Volontaire } from '../../models/volontaire.model';
import { AffectationService } from '../service-affecta/affectation.service';
import { VolontaireService } from '../service_volont/volontaire.service';
import { Project } from '../../models/projects.model';

@Injectable({
  providedIn: 'root'
})
export class CandidatureService {
  private apiUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private affectationService: AffectationService,
    private volontaireService: VolontaireService
  ) { }

  // ==================== MÉTHODES CRUD DE BASE ====================

  getAll(): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/candidatures`).pipe(
      map(candidatures => this.normalizeCandidatures(candidatures)),
      catchError(error => {
        console.error('❌ Erreur récupération candidatures:', error);
        return of([]);
      })
    );
  }

  getById(id: number | string): Observable<Candidature> {
    return this.http.get<Candidature>(`${this.apiUrl}/candidatures/${id}`).pipe(
      map(candidature => this.normalizeCandidature(candidature)),
      catchError(error => {
        console.error(`❌ Erreur récupération candidature ${id}:`, error);
        return throwError(() => new Error('Candidature non trouvée'));
      })
    );
  }

  /**
   * ✅ CORRIGÉ: Normalisation AVANT envoi HTTP
   */
  create(candidature: Candidature): Observable<Candidature> {
    // ✅ VALIDATION: Vérifier que le volontaireId est présent
    if (!candidature.volontaireId) {
      return throwError(() => new Error('Le volontaireId est requis pour créer une candidature'));
    }

    // ✅ Normaliser AVANT d'envoyer à l'API
    const candidatureNormalisee = this.normalizeCandidature({
      ...candidature,
      cree_le: new Date().toISOString(),
      mis_a_jour_le: new Date().toISOString(),
      statut: candidature.statut || 'en_attente'
    });
    
    console.log('📤 Création candidature normalisée:', {
      volontaireId: candidatureNormalisee.volontaireId,
      projectId: candidatureNormalisee.projectId,
      nom: candidatureNormalisee.nom
    });
    
    return this.http.post<Candidature>(`${this.apiUrl}/candidatures`, candidatureNormalisee).pipe(
      map(newCandidature => this.normalizeCandidature(newCandidature)),
      catchError(error => {
        console.error('❌ Erreur création candidature:', error);
        return throwError(() => new Error('Erreur lors de la création de la candidature'));
      })
    );
  }

  update(id: number | string, candidature: Candidature): Observable<Candidature> {
    const candidatureAvecDate = {
      ...candidature,
      mis_a_jour_le: new Date().toISOString()
    };
    return this.http.put<Candidature>(`${this.apiUrl}/candidatures/${id}`, candidatureAvecDate).pipe(
      map(updatedCandidature => this.normalizeCandidature(updatedCandidature)),
      catchError(error => {
        console.error(`❌ Erreur mise à jour candidature ${id}:`, error);
        return throwError(() => new Error('Erreur lors de la mise à jour de la candidature'));
      })
    );
  }

  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/candidatures/${id}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur suppression candidature ${id}:`, error);
        return throwError(() => new Error('Erreur lors de la suppression de la candidature'));
      })
    );
  }

  // ==================== NORMALISATION DES DONNÉES ====================

  /**
   * ✅ Normaliser une candidature pour s'assurer de la cohérence des données
   */
  private normalizeCandidature(candidature: Candidature): Candidature {
    return {
      ...candidature,
      volontaireId: this.normalizeVolontaireId(candidature.volontaireId),
      projectId: this.normalizeProjectId(candidature.projectId), // ✅ Ajouté
      competences: this.normalizeCompetences(candidature.competences),
      statut: candidature.statut || 'en_attente',
      typePiece: candidature.typePiece || 'CNIB'
    };
  }

  /**
   * ✅ Normaliser un tableau de candidatures
   */
  private normalizeCandidatures(candidatures: Candidature[]): Candidature[] {
    return candidatures.map(candidature => this.normalizeCandidature(candidature));
  }

  /**
   * ✅ Normaliser volontaireId (string | number → number)
   */
  private normalizeVolontaireId(id: string | number): number {
    if (typeof id === 'number') {
      return id;
    }
    
    const idNumber = Number(id);
    if (isNaN(idNumber)) {
      throw new Error(`ID volontaire invalide: ${id}`);
    }
    
    return idNumber;
  }

  /**
   * ✅ NOUVEAU: Normaliser projectId (assurer que c'est un number)
   */
  private normalizeProjectId(id: number): number {
    if (typeof id === 'number') {
      return id;
    }
    
    const idNumber = Number(id);
    if (isNaN(idNumber)) {
      throw new Error(`ID projet invalide: ${id}`);
    }
    
    return idNumber;
  }

  /**
   * ✅ Normaliser les compétences (assurer que c'est un tableau)
   */
  private normalizeCompetences(competences: any): string[] {
    if (Array.isArray(competences)) {
      return competences;
    }
    if (typeof competences === 'string') {
      return competences.split(',').map(c => c.trim()).filter(c => c.length > 0);
    }
    return [];
  }

  // ==================== MÉTHODES POUR LES STATUTS ====================

  changerStatut(id: number | string, statut: Candidature['statut']): Observable<Candidature> {
    return this.http.patch<Candidature>(`${this.apiUrl}/candidatures/${id}`, {
      statut,
      mis_a_jour_le: new Date().toISOString()
    }).pipe(
      map(candidature => this.normalizeCandidature(candidature)),
      catchError(error => {
        console.error(`❌ Erreur changement statut ${id}:`, error);
        return throwError(() => new Error('Erreur lors du changement de statut'));
      })
    );
  }

  accepterCandidature(id: number | string): Observable<Candidature> {
    return this.changerStatut(id, 'acceptee');
  }

  refuserCandidature(id: number | string): Observable<Candidature> {
    return this.changerStatut(id, 'refusee');
  }

  mettreEnEntretien(id: number | string): Observable<Candidature> {
    return this.changerStatut(id, 'entretien');
  }

  // ==================== MÉTHODE ACCEPTER ET AFFECTER (AMÉLIORÉE) ====================

  accepterEtAffecterCandidature(candidatureId: number | string): Observable<any> {
    return this.getById(candidatureId).pipe(
      switchMap(candidature => {
        // ✅ VALIDATION: Vérifications renforcées
        if (!candidature.projectId) {
          throw new Error('Candidature non liée à un projet');
        }
        if (!candidature.volontaireId) {
          throw new Error('Candidature non liée à un volontaire');
        }

        console.log('🚀 Début acceptation candidature:', {
          candidatureId,
          projet: candidature.projectId,
          volontaire: candidature.volontaireId,
          candidat: `${candidature.prenom} ${candidature.nom}`
        });

        // 1. Mettre à jour le statut de la candidature
        const updateCandidature$ = this.changerStatut(candidatureId, 'acceptee');
        
        // 2. Récupérer le volontaire existant
        const volontaireAction$ = this.volontaireService.getVolontaire(candidature.volontaireId).pipe(
          catchError(error => {
            console.error('❌ Volontaire non trouvé, tentative de création...');
            return this.creerVolontaireDepuisCandidature(candidature);
          })
        );
        
        return forkJoin([updateCandidature$, volontaireAction$]);
      }),
      switchMap(([candidatureUpdate, volontaire]) => {
        console.log('✅ Candidature mise à jour, volontaire prêt:', volontaire);

        if (!volontaire.id || !candidatureUpdate.projectId) {
          throw new Error('ID du volontaire ou du projet non défini');
        }

        const volontaireId = volontaire.id;
        const projectId = candidatureUpdate.projectId;

        return this.affectationService.estVolontaireAffecte(volontaireId, projectId).pipe(
          switchMap(estDejaAffecte => {
            if (estDejaAffecte) {
              console.log('⚠️ Volontaire déjà affecté à ce projet');
              return of({
                candidature: candidatureUpdate,
                volontaire: volontaire,
                affectation: null,
                message: 'Volontaire déjà affecté à ce projet'
              });
            }

            // 3. Créer l'affectation
            const affectationData = {
              volontaireId: volontaireId,
              projectId: projectId,
              dateAffectation: new Date().toISOString(),
              statut: 'active' as const,
              role: candidatureUpdate.poste_vise,
              notes: `Affectation automatique depuis candidature #${candidatureId}`
            };
            
            console.log('📝 Création affectation:', affectationData);
            
            return this.affectationService.createAffectation(affectationData).pipe(
              map(affectation => ({
                candidature: candidatureUpdate,
                volontaire: volontaire,
                affectation: affectation,
                message: 'Candidature acceptée et volontaire affecté avec succès'
              }))
            );
          })
        );
      }),
      catchError(error => {
        console.error('❌ Erreur lors de l\'acceptation et affectation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Créer un volontaire à partir d'une candidature (méthode de secours)
   */
  private creerVolontaireDepuisCandidature(candidature: Candidature): Observable<Volontaire> {
    const nouveauVolontaire: Volontaire = {
      nom: candidature.nom,
      prenom: candidature.prenom,
      email: candidature.email,
      telephone: candidature.telephone || '',
      dateNaissance: '',
      nationalite: '',
      sexe: 'M',
      typePiece: candidature.typePiece,
      numeroPiece: candidature.numeroPiece,
      statut: 'Candidat',
      dateInscription: new Date().toISOString(),
      competences: this.normalizeCompetences(candidature.competences),
      regionGeographique: 'À définir',
      motivation: candidature.lettre_motivation,
      disponibilite: 'Temps plein'
    };

    console.log('🆕 Création nouveau volontaire depuis candidature:', nouveauVolontaire);
    return this.volontaireService.createVolontaire(nouveauVolontaire);
  }

  // ==================== MÉTHODES SPÉCIFIQUES ====================

  getByProject(projectId: number | string): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/candidatures?projectId=${projectId}`).pipe(
      map(candidatures => this.normalizeCandidatures(candidatures)),
      catchError(error => {
        console.error(`❌ Erreur candidatures projet ${projectId}:`, error);
        return of([]);
      })
    );
  }

  getByVolontaire(volontaireId: number | string): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/candidatures?volontaireId=${volontaireId}`).pipe(
      map(candidatures => this.normalizeCandidatures(candidatures)),
      catchError(error => {
        console.error(`❌ Erreur candidatures volontaire ${volontaireId}:`, error);
        return of([]);
      })
    );
  }

  // Upload CV
  uploadCV(candidatureId: number | string, file: File): Observable<{ cv_url: string }> {
    const formData = new FormData();
    formData.append('cv', file);
    return this.http.post<{ cv_url: string }>(`${this.apiUrl}/candidatures/${candidatureId}/upload-cv`, formData).pipe(
      catchError(error => {
        console.error(`❌ Erreur upload CV ${candidatureId}:`, error);
        return throwError(() => new Error('Erreur lors de l\'upload du CV'));
      })
    );
  }

  /** Récupère les statistiques précises pour un projet */
  getStatsByProject(projectId: number | string): Observable<any> {
    return forkJoin({
      candidatures: this.getByProject(projectId),
      affectations: this.affectationService.getAffectationsActivesByProject(projectId)
    }).pipe(
      map(({ candidatures, affectations }) => {
        const stats = {
          total: candidatures.length,
          en_attente: candidatures.filter(c => c.statut === 'en_attente').length,
          entretien: candidatures.filter(c => c.statut === 'entretien').length,
          acceptee: candidatures.filter(c => c.statut === 'acceptee').length,
          refusee: candidatures.filter(c => c.statut === 'refusee').length,
          volontaires_affectes: affectations.length,
          volontaires_actifs: affectations.filter(a => a.statut === 'active').length,
          par_type_piece: {
            CNIB: candidatures.filter(c => c.typePiece === 'CNIB').length,
            PASSEPORT: candidatures.filter(c => c.typePiece === 'PASSEPORT').length
          }
        };

        console.log(`📊 Stats projet ${projectId}:`, stats);
        return stats;
      }),
      catchError(error => {
        console.error(`❌ Erreur stats projet ${projectId}:`, error);
        return of({
          total: 0, en_attente: 0, entretien: 0, acceptee: 0, refusee: 0,
          volontaires_affectes: 0, volontaires_actifs: 0,
          par_type_piece: { CNIB: 0, PASSEPORT: 0 }
        });
      })
    );
  }

  /** Récupère les candidatures avec les données des affectations */
  getCandidaturesAvecAffectations(projectId: number | string): Observable<any[]> {
    return forkJoin({
      candidatures: this.getByProject(projectId),
      affectations: this.affectationService.getAffectationsByProject(projectId),
      volontaires: this.volontaireService.getVolontaires()
    }).pipe(
      map(({ candidatures, affectations, volontaires }) => {
        return candidatures.map(candidature => {
          const volontaire = volontaires.find(v => 
            v.id?.toString() === candidature.volontaireId.toString()
          );

          const affectation = volontaire ?
            affectations.find(a => a.volontaireId?.toString() === volontaire.id?.toString()) : null;

          return {
            ...candidature,
            volontaire: volontaire,
            estAffecte: !!affectation,
            dateAffectation: affectation?.dateAffectation,
            statutAffectation: affectation?.statut,
            roleAffectation: affectation?.role
          };
        });
      }),
      catchError(error => {
        console.error(`❌ Erreur candidatures avec affectations ${projectId}:`, error);
        return of([]);
      })
    );
  }

  // ==================== MÉTHODES POUR LES PARTENAIRES ====================

  getCandidaturesByPartenaire(partenaireId: number | string): Observable<any[]> {
    return forkJoin({
      projets: this.http.get<Project[]>(`${this.apiUrl}/projets?partenaireId=${partenaireId}`),
      candidatures: this.getAll()
    }).pipe(
      map(({ projets, candidatures }) => {
        const projetIds = projets.map(p => p.id).filter(id => id !== undefined);

        const candidaturesPartenaire = candidatures.filter(c =>
          c.projectId && projetIds.includes(c.projectId)
        );

        return candidaturesPartenaire.map(candidature => {
          const projet = projets.find(p => p.id === candidature.projectId);
          return {
            ...candidature,
            projetTitre: projet?.titre || 'Projet inconnu',
            projetRegion: projet?.regionAffectation || 'Non spécifiée',
            projetStatut: projet?.statutProjet || 'Inconnu'
          };
        });
      }),
      catchError(error => {
        console.error('❌ Erreur chargement candidatures partenaire:', error);
        return of([]);
      })
    );
  }

  getCandidaturesFiltreesPartenaire(partenaireId: number | string, filtres: any): Observable<any[]> {
    return this.getCandidaturesByPartenaire(partenaireId).pipe(
      map(candidatures => {
        let filtered = candidatures;

        // Filtre par statut
        if (filtres.statut && filtres.statut !== 'tous') {
          filtered = filtered.filter(c => c.statut === filtres.statut);
        }

        // Filtre par projet
        if (filtres.projectId && filtres.projectId !== 'tous') {
          filtered = filtered.filter(c => c.projectId?.toString() === filtres.projectId.toString());
        }

        // Filtre par recherche texte
        if (filtres.searchTerm) {
          const term = filtres.searchTerm.toLowerCase();
          filtered = filtered.filter(c =>
            c.nom.toLowerCase().includes(term) ||
            c.prenom.toLowerCase().includes(term) ||
            c.poste_vise.toLowerCase().includes(term) ||
            c.email.toLowerCase().includes(term) ||
            (c.projetTitre && c.projetTitre.toLowerCase().includes(term)) ||
            c.numeroPiece.toLowerCase().includes(term)
          );
        }

        // Filtre par niveau d'expérience
        if (filtres.niveau_experience && filtres.niveau_experience !== 'tous') {
          filtered = filtered.filter(c => c.niveau_experience === filtres.niveau_experience);
        }

        // Filtre par type de pièce
        if (filtres.typePiece && filtres.typePiece !== 'tous') {
          filtered = filtered.filter(c => c.typePiece === filtres.typePiece);
        }

        return filtered;
      })
    );
  }

  getProjetsPartenaire(partenaireId: number | string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projets?partenaireId=${partenaireId}`).pipe(
      catchError(error => {
        console.error('❌ Erreur chargement projets partenaire:', error);
        return of([]);
      })
    );
  }

  updateNotes(id: number | string, notes: string): Observable<Candidature> {
    return this.http.patch<Candidature>(`${this.apiUrl}/candidatures/${id}`, {
      notes_interne: notes,
      mis_a_jour_le: new Date().toISOString()
    }).pipe(
      map(candidature => this.normalizeCandidature(candidature)),
      catchError(error => {
        console.error(`❌ Erreur mise à jour notes ${id}:`, error);
        return throwError(() => new Error('Erreur lors de la mise à jour des notes'));
      })
    );
  }

  planifierEntretien(id: number | string, dateEntretien: string, notes?: string): Observable<Candidature> {
    return this.http.patch<Candidature>(`${this.apiUrl}/candidatures/${id}`, {
      statut: 'entretien',
      date_entretien: dateEntretien,
      notes_interne: notes,
      mis_a_jour_le: new Date().toISOString()
    }).pipe(
      map(candidature => this.normalizeCandidature(candidature)),
      catchError(error => {
        console.error(`❌ Erreur planification entretien ${id}:`, error);
        return throwError(() => new Error('Erreur lors de la planification de l\'entretien'));
      })
    );
  }

  // ==================== MÉTHODES STATISTIQUES ====================

  getStats(): Observable<CandidatureStats> {
    return this.getAll().pipe(
      map(candidatures => {
        const par_statut: { [statut: string]: number } = {};
        const par_type_piece: { [typePiece: string]: number } = {
          CNIB: 0,
          PASSEPORT: 0
        };

        candidatures.forEach(candidature => {
          const statut = candidature.statut;
          par_statut[statut] = (par_statut[statut] || 0) + 1;

          // Statistiques par type de pièce
          if (candidature.typePiece) {
            par_type_piece[candidature.typePiece] = (par_type_piece[candidature.typePiece] || 0) + 1;
          }
        });

        const stats: CandidatureStats = {
          total: candidatures.length,
          en_attente: candidatures.filter(c => c.statut === 'en_attente').length,
          entretien: candidatures.filter(c => c.statut === 'entretien').length,
          acceptee: candidatures.filter(c => c.statut === 'acceptee').length,
          refusee: candidatures.filter(c => c.statut === 'refusee').length,
          par_projet: this.calculerRepartitionProjet(candidatures),
          par_statut: par_statut,
          par_type_piece: par_type_piece
        };
        return stats;
      }),
      catchError(error => {
        console.error('❌ Erreur calcul stats:', error);
        return of({
          total: 0, en_attente: 0, entretien: 0, acceptee: 0, refusee: 0,
          par_projet: {}, par_statut: {}, par_type_piece: { CNIB: 0, PASSEPORT: 0 }
        });
      })
    );
  }

  getCandidaturesAvecProjets(): Observable<any[]> {
    return forkJoin({
      candidatures: this.getAll(),
      projets: this.http.get<Project[]>(`${this.apiUrl}/projets`)
    }).pipe(
      map(({ candidatures, projets }) => {
        const projetsMap = new Map();
        projets.forEach(projet => projetsMap.set(projet.id, projet));

        return candidatures.map(candidature => {
          const projet = candidature.projectId ? projetsMap.get(candidature.projectId) : null;
          return {
            ...candidature,
            region: projet?.regionAffectation || 'Non assignée',
            projetTitre: projet?.titre || 'Projet non spécifié',
            projetStatut: projet?.statutProjet || 'Non spécifié'
          };
        });
      }),
      catchError(error => {
        console.error('❌ Erreur candidatures avec projets:', error);
        return of([]);
      })
    );
  }

  getStatsDashboard(): Observable<any> {
    return this.getCandidaturesAvecProjets().pipe(
      map(candidatures => {
        return {
          total: candidatures.length,
          en_attente: candidatures.filter(c => c.statut === 'en_attente').length,
          entretien: candidatures.filter(c => c.statut === 'entretien').length,
          acceptee: candidatures.filter(c => c.statut === 'acceptee').length,
          refusee: candidatures.filter(c => c.statut === 'refusee').length,
          par_region: this.calculerRepartitionRegion(candidatures),
          par_mois: this.calculerEvolutionMensuelle(candidatures),
          par_type_piece: {
            CNIB: candidatures.filter(c => c.typePiece === 'CNIB').length,
            PASSEPORT: candidatures.filter(c => c.typePiece === 'PASSEPORT').length
          },
          candidatures_urgentes: this.getCandidaturesUrgentes(candidatures)
        };
      }),
      catchError(error => {
        console.error('❌ Erreur stats dashboard:', error);
        return of({
          total: 0, en_attente: 0, entretien: 0, acceptee: 0, refusee: 0,
          par_region: [], par_mois: [], par_type_piece: { CNIB: 0, PASSEPORT: 0 },
          candidatures_urgentes: []
        });
      })
    );
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * ✅ Vérifier si un email a déjà postulé à un projet
   */
  emailDejaPostule(email: string, projectId: number | string): Observable<boolean> {
    return this.getByProject(projectId).pipe(
      map(candidatures => 
        candidatures.some(c => 
          c.email.toLowerCase() === email.toLowerCase()
        )
      ),
      catchError(error => {
        console.error('❌ Erreur vérification email:', error);
        return of(false);
      })
    );
  }

  /**
   * ✅ Récupérer les candidatures récentes (7 derniers jours)
   */
  getCandidaturesRecentes(): Observable<Candidature[]> {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - 7);

    return this.getAll().pipe(
      map(candidatures => 
        candidatures.filter(c => {
          if (!c.cree_le) return false;
          const dateCreation = new Date(c.cree_le);
          return dateCreation >= dateLimite;
        })
      )
    );
  }

  // ==================== MÉTHODES PRIVÉES ====================

  private calculerRepartitionRegion(candidatures: any[]): any[] {
    const regions: { [key: string]: number } = {};
    candidatures.forEach(candidature => {
      const region = candidature.region || 'Non assignée';
      regions[region] = (regions[region] || 0) + 1;
    });
    return Object.entries(regions).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count);
  }

  private calculerEvolutionMensuelle(candidatures: any[]): any[] {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const aujourdhui = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - i, 1);
      const moisKey = mois[date.getMonth()];
      const annee = date.getFullYear();

      const count = candidatures.filter(c => {
        if (!c.cree_le) return false;
        const dateCandidature = new Date(c.cree_le);
        return !isNaN(dateCandidature.getTime()) &&
          dateCandidature.getMonth() === date.getMonth() &&
          dateCandidature.getFullYear() === annee;
      }).length;

      result.push({ mois: `${moisKey} ${annee}`, count });
    }
    return result;
  }

  private getCandidaturesUrgentes(candidatures: any[]): any[] {
    const aujourdhui = new Date();
    const ilYa7Jours = new Date(aujourdhui.getTime() - 7 * 24 * 60 * 60 * 1000);

    return candidatures
      .filter(c => {
        if (c.statut !== 'en_attente') return false;
        if (!c.cree_le) return false;
        const dateCandidature = new Date(c.cree_le);
        return !isNaN(dateCandidature.getTime()) && dateCandidature <= ilYa7Jours;
      })
      .map(c => ({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        poste_vise: c.poste_vise,
        date_reception: c.cree_le,
        region: c.region,
        typePiece: c.typePiece
      }))
      .slice(0, 10);
  }

  private calculerRepartitionProjet(candidatures: Candidature[]): { [projectId: number]: number } {
    const repartition: { [projectId: number]: number } = {};
    candidatures.forEach(candidature => {
      if (candidature.projectId) {
        repartition[candidature.projectId] = (repartition[candidature.projectId] || 0) + 1;
      }
    });
    return repartition;
  }

  // ==================== MÉTHODE POUR PROJETS DISPONIBLES ====================

  createCandidature(candidatureData: any): Observable<Candidature> {
    return this.create(candidatureData);
  }
}