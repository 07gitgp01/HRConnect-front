// src/app/core/services/admin-candidat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, of } from 'rxjs';
import { User } from '../../models/user.model';
import { Volontaire, InscriptionVolontaire, ProfilVolontaire } from '../../models/volontaire.model';

interface CandidatComplet {
  user: User;
  volontaire: Volontaire;
}

@Injectable({
  providedIn: 'root'
})
export class AdminCandidatService {
  private usersUrl = 'http://localhost:3000/users';
  private volontairesUrl = 'http://localhost:3000/volontaires';

  constructor(private http: HttpClient) {}

  /**
   * 🆕 Créer un compte candidat complet (User + Volontaire)
   */
  creerCandidatComplet(inscriptionData: InscriptionVolontaire, profilData?: ProfilVolontaire): Observable<{user: User, volontaire: Volontaire}> {
  const username = this.generateUsername(inscriptionData.prenom, inscriptionData.nom);
  
  const userData: User = {
    username: username,
    email: inscriptionData.email,
    password: inscriptionData.motDePasse,
    role: 'candidat',
    prenom: inscriptionData.prenom,
    nom: inscriptionData.nom,
    telephone: inscriptionData.telephone,
    date_inscription: new Date().toISOString(),
    profilComplete: !!profilData
  };

  return this.http.post<User>(this.usersUrl, userData).pipe(
    switchMap(user => {
      const volontaireData: Volontaire = {
        nom: inscriptionData.nom,
        prenom: inscriptionData.prenom,
        email: inscriptionData.email,
        telephone: inscriptionData.telephone,
        dateNaissance: inscriptionData.dateNaissance,
        nationalite: inscriptionData.nationalite,
        sexe: inscriptionData.sexe,
        statut: 'Candidat',
        dateInscription: new Date().toISOString(),
        userId: user.id,
        // Données du profil si fournies
        ...(profilData && {
          adresseResidence: profilData.adresseResidence,
          regionGeographique: profilData.regionGeographique,
          niveauEtudes: profilData.niveauEtudes,
          domaineEtudes: profilData.domaineEtudes,
          competences: profilData.competences,
          motivation: profilData.motivation,
          disponibilite: profilData.disponibilite,
          urlCV: profilData.urlCV,
          typePiece: profilData.typePiece,
          numeroPiece: profilData.numeroPiece,
          urlPieceIdentite: profilData.urlPieceIdentite
        })
      };

      return this.http.post<Volontaire>(this.volontairesUrl, volontaireData).pipe(
        switchMap(volontaire => {
          return this.http.patch<User>(`${this.usersUrl}/${user.id}`, {
            volontaireId: volontaire.id
          }).pipe(
            map(updatedUser => ({
              user: updatedUser,
              volontaire: volontaire
            }))
          );
        })
      );
    })
  );
}

  /**
   * 📝 Compléter le profil d'un candidat existant
   */
  completerProfilCandidat(volontaireId: number | string, profilData: ProfilVolontaire): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.volontairesUrl}/${volontaireId}`, {
      ...profilData,
      statut: 'En attente'
    }).pipe(
      switchMap(volontaire => {
        if (volontaire.userId) {
          return this.http.patch<User>(`${this.usersUrl}/${volontaire.userId}`, {
            profilComplete: true
          }).pipe(
            map(() => volontaire)
          );
        }
        return of(volontaire);
      })
    );
  }

  /**
   * 🚫 Désactiver un compte candidat
   */
  desactiverCandidat(userId: number | string, volontaireId: number | string): Observable<{user: User, volontaire: Volontaire}> {
    return forkJoin({
      user: this.http.patch<User>(`${this.usersUrl}/${userId}`, {}),
      volontaire: this.http.patch<Volontaire>(`${this.volontairesUrl}/${volontaireId}`, {
        statut: 'Inactif'
      })
    });
  }

  /**
   * ✅ Réactiver un compte candidat
   */
  reactiverCandidat(volontaireId: number | string): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.volontairesUrl}/${volontaireId}`, {
      statut: 'Actif'
    });
  }

  /**
   * ❌ Supprimer complètement un candidat
   */
  supprimerCandidat(userId: number | string, volontaireId: number | string): Observable<void> {
    return forkJoin({
      user: this.http.delete<void>(`${this.usersUrl}/${userId}`),
      volontaire: this.http.delete<void>(`${this.volontairesUrl}/${volontaireId}`)
    }).pipe(
      map(() => {})
    );
  }

  /**
   * 🔍 Récupérer tous les candidats avec leurs profils
   */
  getCandidatsAvecProfils(): Observable<CandidatComplet[]> {
    return forkJoin({
      users: this.http.get<User[]>(`${this.usersUrl}?role=candidat`),
      volontaires: this.http.get<Volontaire[]>(this.volontairesUrl)
    }).pipe(
      map(data => {
        const candidatsComplets: CandidatComplet[] = [];
        
        data.users.forEach(user => {
          const volontaire = data.volontaires.find(v => v.userId === user.id);
          if (volontaire) {
            candidatsComplets.push({
              user: user,
              volontaire: volontaire
            });
          }
        });
        
        return candidatsComplets;
      })
    );
  }

  /**
   * 🔍 Récupérer un candidat spécifique
   */
  getCandidatById(volontaireId: number | string): Observable<CandidatComplet | null> {
    return forkJoin({
      volontaire: this.http.get<Volontaire>(`${this.volontairesUrl}/${volontaireId}`),
      users: this.http.get<User[]>(this.usersUrl)
    }).pipe(
      map(data => {
        if (!data.volontaire) return null;
        
        const user = data.users.find(u => u.id === data.volontaire.userId);
        if (!user) return null;

        return {
          user: user,
          volontaire: data.volontaire
        };
      })
    );
  }

  /**
   * ✏️ Mettre à jour le profil d'un candidat
   */
  mettreAJourProfilCandidat(volontaireId: number | string, profilData: ProfilVolontaire): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.volontairesUrl}/${volontaireId}`, profilData);
  }

  /**
   * 🔄 Mettre à jour le statut d'un candidat
   */
  mettreAJourStatutCandidat(volontaireId: number | string, nouveauStatut: Volontaire['statut']): Observable<Volontaire> {
    return this.http.patch<Volontaire>(`${this.volontairesUrl}/${volontaireId}`, {
      statut: nouveauStatut
    });
  }

  /**
   * 📧 Vérifier si l'email existe déjà
   */
  verifierEmailExiste(email: string): Observable<boolean> {
    return forkJoin({
      users: this.http.get<User[]>(`${this.usersUrl}?email=${email}`),
      volontaires: this.http.get<Volontaire[]>(`${this.volontairesUrl}?email=${email}`)
    }).pipe(
      map(data => {
        return data.users.length > 0 || data.volontaires.length > 0;
      })
    );
  }

  /**
   * 🆔 Générer un username unique
   */
  private generateUsername(prenom: string, nom: string): string {
    const baseUsername = `${prenom.toLowerCase()}.${nom.toLowerCase()}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const timestamp = new Date().getTime().toString().slice(-4);
    return `${baseUsername}.${timestamp}`;
  }
}