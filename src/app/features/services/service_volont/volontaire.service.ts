// src/app/features/services/service_volontaires/volontaire.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, throwError, switchMap } from 'rxjs';
import {
  Volontaire,
  InscriptionVolontaire,
  ProfilVolontaire,
  VolontaireStatut
} from '../../models/volontaire.model';

// ✅ Constantes et fonctions utilitaires EXPORTÉES pour réutilisation
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
  private apiUrl = 'http://localhost:3000/volontaires';

  constructor(private http: HttpClient) {}

  // ==================== CRUD DE BASE ====================

  getVolontaires(): Observable<Volontaire[]> {
    return this.http.get<Volontaire[]>(this.apiUrl).pipe(
      catchError(err => { console.error('❌ getVolontaires:', err); return of([]); })
    );
  }

  getVolontaire(id: number | string): Observable<Volontaire> {
    return this.http.get<Volontaire>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => throwError(() => new Error(`Volontaire #${id} non trouvé`)))
    );
  }

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

  updateVolontaire(id: number | string, volontaire: Partial<Volontaire>): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      ...volontaire,
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(() => throwError(() => new Error('Erreur mise à jour volontaire')))
    );
  }

  deleteVolontaire(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => throwError(() => new Error('Erreur suppression volontaire')))
    );
  }

  // ==================== INSCRIPTION ====================

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

  // ==================== MISE À JOUR DU PROFIL ====================

  mettreAJourProfil(id: number | string, donneesMAJ: Partial<ProfilVolontaire>): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      switchMap(volontaire => {
        const volontaireMisAJour: Volontaire = {
          ...volontaire,
          ...donneesMAJ,
          updated_at: new Date().toISOString()
        };

        const completion = calculerCompletionProfil(volontaireMisAJour);
        const complet = completion >= 100;
        
        let nouveauStatut: VolontaireStatut = volontaire.statut;

        if (complet && volontaire.statut === 'Candidat') {
          nouveauStatut = 'En attente';
        } else if (!complet && volontaire.statut === 'En attente') {
          nouveauStatut = 'Candidat';
        }

        const donneesFinales: any = {
          ...donneesMAJ,
          statut: nouveauStatut,
          updated_at: new Date().toISOString()
        };

        return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, donneesFinales);
      }),
      catchError(() => throwError(() => new Error('Erreur mise à jour profil')))
    );
  }

  // ==================== GESTION DES STATUTS ====================

  desactiverVolontaire(id: number | string): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      switchMap(volontaire => {
        if (volontaire.statut === 'Inactif') {
          return of(volontaire);
        }
        
        return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
          statut: 'Inactif',
          actif: false,
          statutAvantInactif: volontaire.statut,
          updated_at: new Date().toISOString()
        });
      }),
      catchError(() => throwError(() => new Error('Erreur désactivation volontaire')))
    );
  }

  reactiverVolontaire(id: number | string): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      switchMap(volontaire => {
        if (volontaire.actif === true && volontaire.statut !== 'Inactif') {
          return of(volontaire);
        }
        
        const statutARestaurer = volontaire.statutAvantInactif || 'En attente';
        
        return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
          statut: statutARestaurer,
          actif: true,
          statutAvantInactif: undefined,
          updated_at: new Date().toISOString()
        });
      }),
      catchError(() => throwError(() => new Error('Erreur réactivation volontaire')))
    );
  }

  activerVolontaire(id: number | string): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      switchMap(volontaire => {
        if (volontaire.statut === 'Actif') {
          return of(volontaire);
        }
        if (volontaire.statut !== 'En attente') {
          return throwError(() => new Error(`Le volontaire doit être en 'En attente' pour être activé`));
        }
        if (!estProfilComplet(volontaire)) {
          return throwError(() => new Error('Le profil doit être complet à 100% pour être activé'));
        }
        
        return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
          statut: 'Actif',
          actif: true,
          dateValidation: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }),
      catchError(() => throwError(() => new Error('Erreur activation volontaire')))
    );
  }

  refuserVolontaire(id: number | string, raison?: string): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, {
      statut: 'Refusé',
      actif: false,
      notesInterne: raison ? `Refusé : ${raison}` : 'Volontaire refusé',
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(() => throwError(() => new Error('Erreur refus volontaire')))
    );
  }

  changerStatut(id: number | string, statut: VolontaireStatut): Observable<Volontaire> {
    return this.getVolontaire(id).pipe(
      switchMap(volontaire => {
        if (statut === volontaire.statut) {
          return of(volontaire);
        }

        const updateData: any = {
          statut,
          updated_at: new Date().toISOString()
        };

        switch(statut) {
          case 'Actif':
            if (volontaire.statut !== 'En attente') {
              return throwError(() => new Error(`Impossible de passer de ${volontaire.statut} à Actif`));
            }
            if (!estProfilComplet(volontaire)) {
              return throwError(() => new Error('Le profil doit être complet à 100%'));
            }
            updateData.dateValidation = new Date().toISOString();
            updateData.actif = true;
            break;
            
          case 'Inactif':
            updateData.actif = false;
            updateData.statutAvantInactif = volontaire.statut;
            break;
            
          case 'Refusé':
            updateData.actif = false;
            break;
            
          default:
            updateData.actif = true;
            break;
        }

        return this.http.patch<Volontaire>(`${this.apiUrl}/${id}`, updateData);
      }),
      catchError(err => throwError(() => err))
    );
  }

  // ==================== VÉRIFICATIONS ====================

  estProfilComplet(id: number | string): Observable<boolean> {
    return this.getVolontaire(id).pipe(
      map(v => calculerCompletionProfil(v) >= 100),
      catchError(() => of(false))
    );
  }

  getPourcentageCompletion(id: number | string): Observable<number> {
    return this.getVolontaire(id).pipe(
      map(v => calculerCompletionProfil(v)),
      catchError(() => of(0))
    );
  }

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

  // ==================== RECHERCHE ====================

  rechercherVolontaires(term: string): Observable<Volontaire[]> {
    if (!term.trim()) return this.getVolontaires();
    return this.getVolontaires().pipe(
      map(list => {
        const t = term.toLowerCase();
        return list.filter(v =>
          v.nom.toLowerCase().includes(t) ||
          v.prenom.toLowerCase().includes(t) ||
          v.email.toLowerCase().includes(t) ||
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

  // ==================== STATISTIQUES ====================

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
        profilsIncomplets: list.filter(v => !estProfilComplet(v)).length,
        actifsVsInactifs: {
          actifs: list.filter(v => v.actif === true).length,
          inactifs: list.filter(v => v.actif === false).length
        }
      }))
    );
  }
}