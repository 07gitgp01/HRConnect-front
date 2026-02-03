import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of, throwError, switchMap } from 'rxjs';
import { 
  Volontaire, 
  InscriptionVolontaire, 
  ProfilVolontaire, 
  VolontaireStats 
} from '../../models/volontaire.model';

@Injectable({
  providedIn: 'root'
})
export class VolontaireService {
  private apiUrl = 'http://localhost:3000/volontaires';

  constructor(private http: HttpClient) { }

  // ==================== MÉTHODES CRUD DE BASE ====================

  getVolontaires(): Observable<Volontaire[]> {
    return this.http.get<Volontaire[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des volontaires:', error);
        return of([]);
      })
    );
  }

  getVolontaire(id: number | string): Observable<Volontaire> {
    return this.http.get<Volontaire>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur lors de la récupération du volontaire ${id}:`, error);
        return throwError(() => new Error('Volontaire non trouvé'));
      })
    );
  }

  createVolontaire(volontaire: Volontaire): Observable<Volontaire> {
    const volontaireAvecDates = {
      ...volontaire,
      dateInscription: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      statut: volontaire.statut || 'Candidat'
    };

    return this.http.post<Volontaire>(this.apiUrl, volontaireAvecDates).pipe(
      catchError(error => {
        console.error('❌ Erreur lors de la création du volontaire:', error);
        return throwError(() => new Error('Erreur lors de la création du volontaire'));
      })
    );
  }

  updateVolontaire(id: number | string, volontaire: Volontaire): Observable<Volontaire> {
    const volontaireAvecDate = {
      ...volontaire,
      updated_at: new Date().toISOString()
    };

    return this.http.put<Volontaire>(`${this.apiUrl}/${id}`, volontaireAvecDate).pipe(
      catchError(error => {
        console.error(`❌ Erreur lors de la mise à jour du volontaire ${id}:`, error);
        return throwError(() => new Error('Erreur lors de la mise à jour du volontaire'));
      })
    );
  }

  deleteVolontaire(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur lors de la suppression du volontaire ${id}:`, error);
        return throwError(() => new Error('Erreur lors de la suppression du volontaire'));
      })
    );
  }

  // ==================== MÉTHODES SPÉCIFIQUES ====================

  /**
   * Inscription d'un nouveau volontaire (SANS type de pièce)
   */
  inscrireVolontaire(inscription: InscriptionVolontaire): Observable<Volontaire> {
    const volontaire: Volontaire = {
      nom: inscription.nom,
      prenom: inscription.prenom,
      email: inscription.email,
      telephone: inscription.telephone,
      dateNaissance: inscription.dateNaissance,
      sexe: inscription.sexe,
      nationalite: inscription.nationalite,
      // typePiece et numeroPiece seront complétés plus tard dans le profil
      statut: 'Candidat',
      dateInscription: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.createVolontaire(volontaire);
  }

  /**
   * Complète le profil d'un volontaire (AVEC type de pièce)
   */
  completerProfil(id: number | string, profil: ProfilVolontaire): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      ...profil,
      updated_at: new Date().toISOString(),
      statut: 'En attente' // Passe en attente de validation après complétion
    }).pipe(
      catchError(error => {
        console.error(`❌ Erreur lors de la complétion du profil ${id}:`, error);
        return throwError(() => new Error('Erreur lors de la complétion du profil'));
      })
    );
  }

  /**
   * Change le statut d'un volontaire
   */
  changerStatut(id: number | string, statut: Volontaire['statut']): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      statut,
      updated_at: new Date().toISOString(),
      ...(statut === 'Actif' && { dateValidation: new Date().toISOString() })
    }).pipe(
      catchError(error => {
        console.error(`❌ Erreur lors du changement de statut ${id}:`, error);
        return throwError(() => new Error('Erreur lors du changement de statut'));
      })
    );
  }

  /**
   * Valide un volontaire (passe de "En attente" à "Actif")
   */
  validerVolontaire(id: number | string): Observable<Volontaire> {
    return this.changerStatut(id, 'Actif');
  }

  /**
   * Refuse un volontaire
   */
  refuserVolontaire(id: number | string, raison?: string): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      statut: 'Refusé',
      notesInterne: raison ? `Refusé: ${raison}` : 'Volontaire refusé',
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error(`❌ Erreur lors du refus du volontaire ${id}:`, error);
        return throwError(() => new Error('Erreur lors du refus du volontaire'));
      })
    );
  }

  // ==================== MÉTHODES DE RECHERCHE ET FILTRES ====================

  rechercherVolontaires(term: string): Observable<Volontaire[]> {
    if (!term.trim()) {
      return this.getVolontaires();
    }

    return this.getVolontaires().pipe(
      map(volontaires => {
        const searchTerm = term.toLowerCase();
        return volontaires.filter(volontaire =>
          volontaire.nom.toLowerCase().includes(searchTerm) ||
          volontaire.prenom.toLowerCase().includes(searchTerm) ||
          volontaire.email.toLowerCase().includes(searchTerm) ||
          (volontaire.numeroPiece && volontaire.numeroPiece.toLowerCase().includes(searchTerm)) ||
          volontaire.telephone.includes(searchTerm)
        );
      })
    );
  }

  getVolontairesParStatut(statut: Volontaire['statut']): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(
      map(volontaires => volontaires.filter(v => v.statut === statut))
    );
  }

  getVolontairesParRegion(region: string): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(
      map(volontaires => volontaires.filter(v => 
        v.regionGeographique?.toLowerCase() === region.toLowerCase()
      ))
    );
  }

  getVolontairesParCompetence(competence: string): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(
      map(volontaires => volontaires.filter(v => 
        v.competences?.some(c => 
          c.toLowerCase().includes(competence.toLowerCase())
        )
      ))
    );
  }

  /**
   * Filtrer par type de pièce (seulement pour les profils complétés)
   */
  getVolontairesParTypePiece(typePiece: 'CNIB' | 'PASSEPORT'): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(
      map(volontaires => volontaires.filter(v => v.typePiece === typePiece))
    );
  }

  getVolontairesActifs(): Observable<Volontaire[]> {
    return this.getVolontairesParStatut('Actif');
  }

  getVolontairesEnAttente(): Observable<Volontaire[]> {
    return this.getVolontairesParStatut('En attente');
  }

  /**
   * Récupère les volontaires avec profil complet (type de pièce renseigné)
   */
  getVolontairesAvecProfilComplet(): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(
      map(volontaires => volontaires.filter(v => 
        v.typePiece && v.numeroPiece && 
        v.adresseResidence && v.regionGeographique
      ))
    );
  }

  // ==================== MÉTHODES DE STATISTIQUES ====================

  getStats(): Observable<VolontaireStats> {
    return this.getVolontaires().pipe(
      map(volontaires => this.calculerStats(volontaires))
    );
  }

  private calculerStats(volontaires: Volontaire[]): VolontaireStats {
    const stats: VolontaireStats = {
      total: volontaires.length,
      candidats: volontaires.filter(v => v.statut === 'Candidat').length,
      enAttente: volontaires.filter(v => v.statut === 'En attente').length,
      actifs: volontaires.filter(v => v.statut === 'Actif').length,
      inactifs: volontaires.filter(v => v.statut === 'Inactif').length,
      refuses: volontaires.filter(v => v.statut === 'Refusé').length,
      parRegion: {},
      parDomaine: {},
      parSexe: {},
      parTypePiece: {
        'CNIB': volontaires.filter(v => v.typePiece === 'CNIB').length,
        'PASSEPORT': volontaires.filter(v => v.typePiece === 'PASSEPORT').length,
        'Non renseigné': volontaires.filter(v => !v.typePiece).length
      }
    };

    // Calcul des répartitions
    volontaires.forEach(volontaire => {
      // Par région
      const region = volontaire.regionGeographique || 'Non spécifiée';
      stats.parRegion[region] = (stats.parRegion[region] || 0) + 1;

      // Par domaine d'études
      const domaine = volontaire.domaineEtudes || 'Non spécifié';
      stats.parDomaine[domaine] = (stats.parDomaine[domaine] || 0) + 1;

      // Par sexe
      const sexe = volontaire.sexe;
      stats.parSexe[sexe] = (stats.parSexe[sexe] || 0) + 1;
    });

    return stats;
  }

  getStatsDashboard(): Observable<{
    total: number;
    actifs: number;
    enAttente: number;
    nouveauxCeMois: number;
    profilsComplets: number;
    parTypePiece: { CNIB: number; PASSEPORT: number; Non_renseigne: number };
  }> {
    return this.getVolontaires().pipe(
      map(volontaires => {
        const maintenant = new Date();
        const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
        
        const nouveauxCeMois = volontaires.filter(v => {
          if (!v.dateInscription) return false;
          const dateInscription = new Date(v.dateInscription);
          return dateInscription >= debutMois;
        }).length;

        const profilsComplets = volontaires.filter(v => 
          v.typePiece && v.numeroPiece && 
          v.adresseResidence && v.regionGeographique
        ).length;

        return {
          total: volontaires.length,
          actifs: volontaires.filter(v => v.statut === 'Actif').length,
          enAttente: volontaires.filter(v => v.statut === 'En attente').length,
          nouveauxCeMois: nouveauxCeMois,
          profilsComplets: profilsComplets,
          parTypePiece: {
            CNIB: volontaires.filter(v => v.typePiece === 'CNIB').length,
            PASSEPORT: volontaires.filter(v => v.typePiece === 'PASSEPORT').length,
            Non_renseigne: volontaires.filter(v => !v.typePiece).length
          }
        };
      })
    );
  }

  /**
   * Statistiques de complétion des profils
   */
  getStatsCompletions(): Observable<{
    total: number;
    profilsComplets: number;
    profilsIncomplets: number;
    tauxCompletion: number;
  }> {
    return this.getVolontaires().pipe(
      map(volontaires => {
        const profilsComplets = volontaires.filter(v => 
          v.typePiece && v.numeroPiece && 
          v.adresseResidence && v.regionGeographique &&
          v.niveauEtudes && v.domaineEtudes &&
          v.competences && v.competences.length > 0 &&
          v.motivation && v.disponibilite &&
          v.urlCV
        ).length;

        return {
          total: volontaires.length,
          profilsComplets: profilsComplets,
          profilsIncomplets: volontaires.length - profilsComplets,
          tauxCompletion: Math.round((profilsComplets / volontaires.length) * 100)
        };
      })
    );
  }

  // ==================== MÉTHODES DE GESTION DES COMPÉTENCES ====================

  ajouterCompetence(id: number | string, competence: string): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      map(volontaire => {
        const competences = [...(volontaire.competences || [])];
        if (!competences.includes(competence)) {
          competences.push(competence);
        }
        return { ...volontaire, competences };
      }),
      switchMap(volontaireMaj => this.updateVolontaire(id, volontaireMaj))
    );
  }

  supprimerCompetence(id: number | string, competence: string): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      map(volontaire => {
        const competences = (volontaire.competences || []).filter(c => c !== competence);
        return { ...volontaire, competences };
      }),
      switchMap(volontaireMaj => this.updateVolontaire(id, volontaireMaj))
    );
  }

  // ==================== MÉTHODES DE VÉRIFICATION ====================

  verifierEmailExiste(email: string): Observable<boolean> {
    return this.getVolontaires().pipe(
      map(volontaires => 
        volontaires.some(v => v.email.toLowerCase() === email.toLowerCase())
      )
    );
  }

  /**
   * Vérifier si un numéro de pièce existe déjà
   */
  verifierNumeroPieceExiste(numeroPiece: string): Observable<boolean> {
    return this.getVolontaires().pipe(
      map(volontaires => 
        volontaires.some(v => v.numeroPiece === numeroPiece)
      )
    );
  }

  getVolontaireParEmail(email: string): Observable<Volontaire | null> {
    return this.getVolontaires().pipe(
      map(volontaires => 
        volontaires.find(v => v.email.toLowerCase() === email.toLowerCase()) || null
      )
    );
  }

  // ==================== MÉTHODES DE MISE À JOUR ====================

  mettreAJourDerniereConnexion(id: number | string): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      dateDerniereConnexion: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error(`❌ Erreur mise à jour connexion ${id}:`, error);
        return throwError(() => new Error('Erreur mise à jour connexion'));
      })
    );
  }

  ajouterProjetAffecte(id: number | string, projetId: number): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      map(volontaire => {
        const projetsAffectes = [...(volontaire.projetsAffectes || [])];
        if (!projetsAffectes.includes(projetId)) {
          projetsAffectes.push(projetId);
        }
        return { ...volontaire, projetsAffectes };
      }),
      switchMap(volontaireMaj => this.updateVolontaire(id, volontaireMaj))
    );
  }

  supprimerProjetAffecte(id: number | string, projetId: number): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      map(volontaire => {
        const projetsAffectes = (volontaire.projetsAffectes || []).filter(p => p !== projetId);
        return { ...volontaire, projetsAffectes };
      }),
      switchMap(volontaireMaj => this.updateVolontaire(id, volontaireMaj))
    );
  }

  /**
   * Vérifie si un volontaire a un profil complet
   */
  estProfilComplet(volontaireId: number | string): Observable<boolean> {
    return this.getVolontaire(volontaireId).pipe(
      map(volontaire => {
        return !!(
          volontaire.typePiece &&
          volontaire.numeroPiece &&
          volontaire.adresseResidence &&
          volontaire.regionGeographique &&
          volontaire.niveauEtudes &&
          volontaire.domaineEtudes &&
          volontaire.competences &&
          volontaire.competences.length > 0 &&
          volontaire.motivation &&
          volontaire.disponibilite &&
          volontaire.urlCV
        );
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Récupère le pourcentage de complétion du profil
   */
  getPourcentageCompletion(volontaireId: number | string): Observable<number> {
    return this.getVolontaire(volontaireId).pipe(
      map(volontaire => {
        const champs = [
          volontaire.adresseResidence,
          volontaire.regionGeographique,
          volontaire.niveauEtudes,
          volontaire.domaineEtudes,
          volontaire.competences && volontaire.competences.length > 0,
          volontaire.motivation,
          volontaire.disponibilite,
          volontaire.urlCV,
          volontaire.typePiece,
          volontaire.numeroPiece
        ];

        const champsRemplis = champs.filter(champ => 
          champ && (typeof champ !== 'boolean' ? champ.toString().length > 0 : champ)
        ).length;

        return Math.round((champsRemplis / champs.length) * 100);
      }),
      catchError(() => of(0))
    );
  }
}