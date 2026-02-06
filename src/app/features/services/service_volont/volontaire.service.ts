import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, throwError, switchMap } from 'rxjs';
import { 
  Volontaire, 
  InscriptionVolontaire, 
  ProfilVolontaire, 
  VolontaireStats 
} from '../../models/volontaire.model';

// ============================================================
// ✅ SOURCE DE VÉRITÉ UNIQUE — liste des 11 champs du profil.
// Exportée pour être réutilisée dans le dashboard et le profil
// component. Toute modification ici se répercute partout.
// ============================================================
export const CHAMPS_PROFIL: (keyof Volontaire)[] = [
  'adresseResidence',
  'regionGeographique',
  'niveauEtudes',
  'domaineEtudes',
  'competences',          // cas spécial : vérifié avec length > 0
  'motivation',
  'disponibilite',
  'urlCV',
  'typePiece',
  'numeroPiece',
  'urlPieceIdentite'      // ✅ était manquant dans le service et le dashboard
];

/**
 * Fonction utilitaire exportée : calcule le pourcentage (0-100)
 * de complétion du profil selon CHAMPS_PROFIL.
 * Utilisable dans un service ET dans un component sans doublon.
 */
export function calculerCompletionProfil(volontaire: Volontaire | null): number {
  if (!volontaire) return 0;

  const remplis = CHAMPS_PROFIL.filter(champ => {
    const valeur = volontaire[champ];
    if (champ === 'competences') {
      return Array.isArray(valeur) && valeur.length > 0;
    }
    return valeur != null && valeur.toString().trim() !== '';
  }).length;

  return Math.round((remplis / CHAMPS_PROFIL.length) * 100);
}

@Injectable({
  providedIn: 'root'
})
export class VolontaireService {
  private apiUrl = 'http://localhost:3000/volontaires';

  constructor(private http: HttpClient) {}

  // ==================== CRUD ====================

  getVolontaires(): Observable<Volontaire[]> {
    return this.http.get<Volontaire[]>(this.apiUrl).pipe(
      catchError(err => {
        console.error('❌ getVolontaires:', err);
        return of([]);
      })
    );
  }

  getVolontaire(id: number | string): Observable<Volontaire> {
    return this.http.get<Volontaire>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => {
        console.error(`❌ getVolontaire(${id}):`, err);
        return throwError(() => new Error('Volontaire non trouvé'));
      })
    );
  }

  createVolontaire(volontaire: Volontaire): Observable<Volontaire> {
    return this.http.post<Volontaire>(this.apiUrl, {
      ...volontaire,
      dateInscription: new Date().toISOString(),
      created_at:      new Date().toISOString(),
      updated_at:      new Date().toISOString(),
      statut: volontaire.statut || 'Candidat'
    }).pipe(
      catchError(err => {
        console.error('❌ createVolontaire:', err);
        return throwError(() => new Error('Erreur création volontaire'));
      })
    );
  }

  updateVolontaire(id: number | string, volontaire: Volontaire): Observable<Volontaire> {
    return this.http.put<Volontaire>(`${this.apiUrl}/${id}`, {
      ...volontaire,
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(err => {
        console.error(`❌ updateVolontaire(${id}):`, err);
        return throwError(() => new Error('Erreur mise à jour volontaire'));
      })
    );
  }

  deleteVolontaire(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => {
        console.error(`❌ deleteVolontaire(${id}):`, err);
        return throwError(() => new Error('Erreur suppression volontaire'));
      })
    );
  }

  // ==================== INSCRIPTION / PROFIL ====================

  inscrireVolontaire(inscription: InscriptionVolontaire): Observable<Volontaire> {
    const volontaire: Volontaire = {
      nom:             inscription.nom,
      prenom:          inscription.prenom,
      email:           inscription.email,
      telephone:       inscription.telephone,
      dateNaissance:   inscription.dateNaissance,
      sexe:            inscription.sexe,
      nationalite:     inscription.nationalite,
      statut:          'Candidat',
      dateInscription: new Date().toISOString(),
      created_at:      new Date().toISOString(),
      updated_at:      new Date().toISOString()
    };
    return this.createVolontaire(volontaire);
  }

  completerProfil(id: number | string, profil: ProfilVolontaire): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      ...profil,
      updated_at: new Date().toISOString(),
      statut: 'En attente'
    }).pipe(
      catchError(err => {
        console.error(`❌ completerProfil(${id}):`, err);
        return throwError(() => new Error('Erreur complétion profil'));
      })
    );
  }

  changerStatut(id: number | string, statut: Volontaire['statut']): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      statut,
      updated_at: new Date().toISOString(),
      ...(statut === 'Actif' && { dateValidation: new Date().toISOString() })
    }).pipe(
      catchError(err => {
        console.error(`❌ changerStatut(${id}):`, err);
        return throwError(() => new Error('Erreur changement statut'));
      })
    );
  }

  validerVolontaire(id: number | string): Observable<Volontaire> {
    return this.changerStatut(id, 'Actif');
  }

  refuserVolontaire(id: number | string, raison?: string): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      statut: 'Refusé',
      notesInterne: raison ? `Refusé: ${raison}` : 'Volontaire refusé',
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(err => {
        console.error(`❌ refuserVolontaire(${id}):`, err);
        return throwError(() => new Error('Erreur refus volontaire'));
      })
    );
  }

  // ==================== RECHERCHE / FILTRES ====================

  rechercherVolontaires(term: string): Observable<Volontaire[]> {
    if (!term.trim()) return this.getVolontaires();

    return this.getVolontaires().pipe(
      map(list => {
        const t = term.toLowerCase();
        return list.filter(v =>
          v.nom.toLowerCase().includes(t)        ||
          v.prenom.toLowerCase().includes(t)     ||
          v.email.toLowerCase().includes(t)      ||
          (v.numeroPiece?.toLowerCase().includes(t) ?? false) ||
          v.telephone.includes(t)
        );
      })
    );
  }

  getVolontairesParStatut(statut: Volontaire['statut']): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(
      map(list => list.filter(v => v.statut === statut))
    );
  }

  getVolontairesParRegion(region: string): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(
      map(list => list.filter(v => v.regionGeographique?.toLowerCase() === region.toLowerCase()))
    );
  }

  getVolontairesParCompetence(competence: string): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(
      map(list => list.filter(v =>
        v.competences?.some(c => c.toLowerCase().includes(competence.toLowerCase()))
      ))
    );
  }

  getVolontairesParTypePiece(typePiece: 'CNIB' | 'PASSEPORT'): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(
      map(list => list.filter(v => v.typePiece === typePiece))
    );
  }

  getVolontairesActifs(): Observable<Volontaire[]> {
    return this.getVolontairesParStatut('Actif');
  }

  getVolontairesEnAttente(): Observable<Volontaire[]> {
    return this.getVolontairesParStatut('En attente');
  }

  // ✅ utilise calculerCompletionProfil exportée
  getVolontairesAvecProfilComplet(): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(
      map(list => list.filter(v => calculerCompletionProfil(v) >= 100))
    );
  }

  // ==================== STATISTIQUES ====================

  getStats(): Observable<VolontaireStats> {
    return this.getVolontaires().pipe(map(list => this.calculerStats(list)));
  }

  private calculerStats(volontaires: Volontaire[]): VolontaireStats {
    const stats: VolontaireStats = {
      total:     volontaires.length,
      candidats: volontaires.filter(v => v.statut === 'Candidat').length,
      enAttente: volontaires.filter(v => v.statut === 'En attente').length,
      actifs:    volontaires.filter(v => v.statut === 'Actif').length,
      inactifs:  volontaires.filter(v => v.statut === 'Inactif').length,
      refuses:   volontaires.filter(v => v.statut === 'Refusé').length,
      parRegion: {},
      parDomaine: {},
      parSexe: {},
      parTypePiece: {
        'CNIB':          volontaires.filter(v => v.typePiece === 'CNIB').length,
        'PASSEPORT':     volontaires.filter(v => v.typePiece === 'PASSEPORT').length,
        'Non renseigné': volontaires.filter(v => !v.typePiece).length
      }
    };

    volontaires.forEach(v => {
      const region  = v.regionGeographique || 'Non spécifiée';
      const domaine = v.domaineEtudes      || 'Non spécifié';
      stats.parRegion[region]   = (stats.parRegion[region]   || 0) + 1;
      stats.parDomaine[domaine] = (stats.parDomaine[domaine] || 0) + 1;
      stats.parSexe[v.sexe]     = (stats.parSexe[v.sexe]     || 0) + 1;
    });

    return stats;
  }

  // ✅ profilsComplets utilise calculerCompletionProfil
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
        const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        return {
          total:     volontaires.length,
          actifs:    volontaires.filter(v => v.statut === 'Actif').length,
          enAttente: volontaires.filter(v => v.statut === 'En attente').length,
          nouveauxCeMois: volontaires.filter(v =>
            v.dateInscription && new Date(v.dateInscription) >= debutMois
          ).length,
          profilsComplets: volontaires.filter(v => calculerCompletionProfil(v) >= 100).length,
          parTypePiece: {
            CNIB:          volontaires.filter(v => v.typePiece === 'CNIB').length,
            PASSEPORT:     volontaires.filter(v => v.typePiece === 'PASSEPORT').length,
            Non_renseigne: volontaires.filter(v => !v.typePiece).length
          }
        };
      })
    );
  }

  // ✅ utilise calculerCompletionProfil
  getStatsCompletions(): Observable<{
    total: number;
    profilsComplets: number;
    profilsIncomplets: number;
    tauxCompletion: number;
  }> {
    return this.getVolontaires().pipe(
      map(volontaires => {
        const complets = volontaires.filter(v => calculerCompletionProfil(v) >= 100).length;
        return {
          total:             volontaires.length,
          profilsComplets:   complets,
          profilsIncomplets: volontaires.length - complets,
          tauxCompletion:    volontaires.length > 0
            ? Math.round((complets / volontaires.length) * 100)
            : 0
        };
      })
    );
  }

  // ==================== COMPÉTENCES ====================

  ajouterCompetence(id: number | string, competence: string): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      map(v => {
        const competences = [...(v.competences || [])];
        if (!competences.includes(competence)) competences.push(competence);
        return { ...v, competences };
      }),
      switchMap(v => this.updateVolontaire(id, v))
    );
  }

  supprimerCompetence(id: number | string, competence: string): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      map(v => ({ ...v, competences: (v.competences || []).filter(c => c !== competence) })),
      switchMap(v => this.updateVolontaire(id, v))
    );
  }

  // ==================== VÉRIFICATIONS ====================

  verifierEmailExiste(email: string): Observable<boolean> {
    return this.getVolontaires().pipe(
      map(list => list.some(v => v.email.toLowerCase() === email.toLowerCase()))
    );
  }

  verifierNumeroPieceExiste(numeroPiece: string): Observable<boolean> {
    return this.getVolontaires().pipe(
      map(list => list.some(v => v.numeroPiece === numeroPiece))
    );
  }

  getVolontaireParEmail(email: string): Observable<Volontaire | null> {
    return this.getVolontaires().pipe(
      map(list => list.find(v => v.email.toLowerCase() === email.toLowerCase()) || null)
    );
  }

  // ==================== MISES À JOUR PONCTUELLES ====================

  mettreAJourDerniereConnexion(id: number | string): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      dateDerniereConnexion: new Date().toISOString(),
      updated_at:            new Date().toISOString()
    }).pipe(
      catchError(err => {
        console.error(`❌ mettreAJourDerniereConnexion(${id}):`, err);
        return throwError(() => new Error('Erreur mise à jour connexion'));
      })
    );
  }

  ajouterProjetAffecte(id: number | string, projetId: number): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      map(v => {
        const projets = [...(v.projetsAffectes || [])];
        if (!projets.includes(projetId)) projets.push(projetId);
        return { ...v, projetsAffectes: projets };
      }),
      switchMap(v => this.updateVolontaire(id, v))
    );
  }

  supprimerProjetAffecte(id: number | string, projetId: number): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      map(v => ({ ...v, projetsAffectes: (v.projetsAffectes || []).filter(p => p !== projetId) })),
      switchMap(v => this.updateVolontaire(id, v))
    );
  }

  // ==================== COMPLÉTION DU PROFIL ====================
  // ✅ Les deux méthodes delèguent à calculerCompletionProfil()

  estProfilComplet(volontaireId: number | string): Observable<boolean> {
    return this.getVolontaire(volontaireId).pipe(
      map(v  => calculerCompletionProfil(v) >= 100),
      catchError(() => of(false))
    );
  }

  getPourcentageCompletion(volontaireId: number | string): Observable<number> {
    return this.getVolontaire(volontaireId).pipe(
      map(v  => calculerCompletionProfil(v)),
      catchError(() => of(0))
    );
  }
}