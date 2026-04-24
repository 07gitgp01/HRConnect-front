import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, throwError, tap } from 'rxjs';
import {
  Volontaire,
  InscriptionVolontaire,
  ProfilVolontaire,
  VolontaireStatut
} from '../../models/volontaire.model';
import { environment } from '../../environment/environment';

export const CHAMPS_PROFIL: (keyof ProfilVolontaire)[] = [
  'adresseResidence',
  'regionGeographique',
  'niveauEtudes',
  'domaineEtudes',
  'competences',
  'motivation',
  'disponibilite',
  'urlCV',
  'urlPieceIdentite'
];

export function calculerCompletionProfil(volontaire: Volontaire | null): number {
  if (!volontaire) return 0;
  
  const remplis = CHAMPS_PROFIL.filter(champ => {
    const val = volontaire[champ as keyof Volontaire];
    if (champ === 'competences') return Array.isArray(val) && (val as string[]).length > 0;
    return val != null && val.toString().trim() !== '';
  }).length;
  
  return Math.round((remplis / CHAMPS_PROFIL.length) * 100);
}

export function estProfilComplet(volontaire: Volontaire): boolean {
  return calculerCompletionProfil(volontaire) >= 100;
}

@Injectable({ providedIn: 'root' })
export class VolontaireService {
  private apiUrl = `${environment.apiUrl}/volontaires`;

  constructor(private http: HttpClient) {
    console.log('📡 VolontaireService initialisé avec API URL:', this.apiUrl);
  }

  // ==================== GET ====================
  
  getVolontaires(): Observable<Volontaire[]> {
    return this.http.get<Volontaire[]>(this.apiUrl).pipe(
      catchError(err => { console.error('❌ getVolontaires:', err); return of([]); })
    );
  }

  getVolontaire(id: string): Observable<Volontaire> {
    return this.http.get<Volontaire>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => throwError(() => new Error(`Volontaire #${id} non trouvé`)))
    );
  }

  // ==================== POST ====================

  createVolontaire(volontaire: Omit<Volontaire, 'id'>): Observable<Volontaire> {
    const nouveauVolontaire = {
      ...volontaire,
      statut: 'Candidat' as VolontaireStatut,
      actif: true,
      dateInscription: volontaire.dateInscription || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return this.http.post<Volontaire>(this.apiUrl, nouveauVolontaire).pipe(
      catchError(() => throwError(() => new Error('Erreur création volontaire')))
    );
  }

  inscrireVolontaire(inscription: InscriptionVolontaire): Observable<Volontaire> {
    const volontaire: Omit<Volontaire, 'id'> = {
      nom: inscription.nom,
      prenom: inscription.prenom,
      email: inscription.email,
      telephone: inscription.telephone,
      dateNaissance: inscription.dateNaissance,
      sexe: inscription.sexe,
      nationalite: inscription.nationalite,
      typePiece: inscription.typePiece,
      numeroPiece: inscription.numeroPiece,
      statut: 'Candidat',
      actif: true,
      dateInscription: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return this.createVolontaire(volontaire);
  }

  // ==================== PATCH (Mise à jour profil - sans changement statut) ====================

  mettreAJourProfil(id: string, donneesMAJ: Partial<ProfilVolontaire>): Observable<Volontaire> {
    console.log('📤 Sauvegarde profil - ID:', id);
    console.log('📤 Données à sauvegarder:', donneesMAJ);
    
    // ❌ NE PAS CHANGER LE STATUT AUTOMATIQUEMENT
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, donneesMAJ).pipe(
      tap(response => {
        console.log('✅ Réponse backend:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur backend:', error);
        return throwError(() => new Error(error.error?.message || 'Erreur mise à jour profil'));
      })
    );
  }

  updateVolontaire(id: string, volontaire: Partial<Volontaire>): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      ...volontaire,
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(() => throwError(() => new Error('Erreur mise à jour volontaire')))
    );
  }

  // ==================== GESTION DES STATUTS (Admin uniquement) ====================

  /**
   * ✅ Valider le profil (Candidat → En attente)
   * Admin vérifie les documents et valide le profil
   */
  validerProfil(id: string): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}/valider-profil`, {}).pipe(
      catchError(error => throwError(() => new Error(error.error?.message || 'Erreur validation profil')))
    );
  }

  /**
   * ✅ Changer le statut d'un volontaire
   */
  changerStatut(id: string, statut: VolontaireStatut): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, { statut }).pipe(
      catchError(() => throwError(() => new Error('Erreur changement statut')))
    );
  }

  /**
   * ✅ Désactiver un volontaire
   */
  // ==================== GESTION DES STATUTS (Admin uniquement) ====================

/**
 * ✅ Désactiver un volontaire - Utilise l'endpoint dédié
 */
desactiverVolontaire(id: string): Observable<Volontaire> {
  console.log('📤 Désactivation volontaire - ID:', id);
  
  // ✅ Utiliser le bon endpoint /desactiver
  return this.http.patch<Volontaire>(`${this.apiUrl}/${id}/desactiver`, {}).pipe(
    tap(response => {
      console.log('✅ Volontaire désactivé, nouveau statut:', response.statut);
    }),
    catchError(error => {
      console.error('❌ Erreur désactivation:', error);
      return throwError(() => new Error(error.error?.message || 'Erreur lors de la désactivation'));
    })
  );
}

/**
 * ✅ Réactiver un volontaire - Utilise l'endpoint dédié
 */
reactiverVolontaire(id: string): Observable<Volontaire> {
  console.log('📤 Réactivation volontaire - ID:', id);
  
  return this.http.patch<Volontaire>(`${this.apiUrl}/${id}/reactiver`, {}).pipe(
    tap(response => {
      console.log('✅ Volontaire réactivé:', response);
    }),
    catchError(error => {
      console.error('❌ Erreur réactivation:', error);
      return throwError(() => new Error(error.error?.message || 'Erreur lors de la réactivation'));
    })
  );
}

  /**
   * ✅ Refuser un volontaire
   */
  refuserVolontaire(id: string, raison?: string): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      statut: 'Refusé',
      actif: false,
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(() => throwError(() => new Error('Erreur refus volontaire')))
    );
  }

  // ==================== DELETE ====================

  deleteVolontaire(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => throwError(() => new Error('Erreur suppression volontaire')))
    );
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  estProfilComplet(id: string): Observable<boolean> {
    return this.getVolontaire(id).pipe(
      map(v => calculerCompletionProfil(v) >= 100),
      catchError(() => of(false))
    );
  }

  getPourcentageCompletion(id: string): Observable<number> {
    return this.getVolontaire(id).pipe(
      map(v => calculerCompletionProfil(v)),
      catchError(() => of(0))
    );
  }

  verifierEmailExiste(email: string): Observable<boolean> {
    return this.getVolontaires().pipe(
      map(list => list.some(v => v.email?.toLowerCase() === email.toLowerCase()))
    );
  }

  verifierNumeroPieceExiste(numeroPiece: string): Observable<boolean> {
    return this.getVolontaires().pipe(
      map(list => list.some(v => v.numeroPiece === numeroPiece))
    );
  }

  getVolontaireParEmail(email: string): Observable<Volontaire | null> {
    return this.getVolontaires().pipe(
      map(list => list.find(v => v.email?.toLowerCase() === email.toLowerCase()) || null)
    );
  }

  rechercherVolontaires(term: string): Observable<Volontaire[]> {
    if (!term.trim()) return this.getVolontaires();
    return this.getVolontaires().pipe(
      map(list => {
        const t = term.toLowerCase();
        return list.filter(v =>
          v.nom?.toLowerCase().includes(t) ||
          v.prenom?.toLowerCase().includes(t) ||
          v.email?.toLowerCase().includes(t) ||
          (v.numeroPiece || '').toLowerCase().includes(t) ||
          (v.telephone || '').includes(t)
        );
      })
    );
  }

  getVolontairesParStatut(statut: VolontaireStatut): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(map(list => list.filter(v => v.statut === statut)));
  }

  getVolontairesActifs(): Observable<Volontaire[]> { 
    return this.getVolontaires().pipe(map(list => list.filter(v => v.actif === true))); 
  }
  
  getVolontairesEnAttente(): Observable<Volontaire[]> { 
    return this.getVolontairesParStatut('En attente'); 
  }
  
  getVolontairesCandidats(): Observable<Volontaire[]> { 
    return this.getVolontairesParStatut('Candidat'); 
  }

  getVolontairesAvecProfilComplet(): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(map(list => list.filter(v => estProfilComplet(v))));
  }

  getVolontairesAvecProfilIncomplet(): Observable<Volontaire[]> {
    return this.getVolontaires().pipe(map(list => list.filter(v => !estProfilComplet(v))));
  }

  getStats(): Observable<any> {
    return this.getVolontaires().pipe(
      map(list => ({
        total: list.length,
        candidats: list.filter(v => v.statut === 'Candidat').length,
        enAttente: list.filter(v => v.statut === 'En attente').length,
        actifs: list.filter(v => v.statut === 'Actif').length,
        inactifs: list.filter(v => v.statut === 'Inactif').length,
        refuses: list.filter(v => v.statut === 'Refusé').length,
        profilsComplets: list.filter(v => estProfilComplet(v)).length,
        profilsIncomplets: list.filter(v => !estProfilComplet(v)).length
      }))
    );
  }
}