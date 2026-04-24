// src/app/features/services/service_candidats/admin-candidat.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, catchError, of, throwError, tap } from 'rxjs';
import { User } from '../../models/user.model';
import { 
  Volontaire, 
  InscriptionVolontaire, 
  ProfilVolontaire, 
  VolontaireStatut,
  TypePiece,
  Disponibilite 
} from '../../models/volontaire.model';
import { SyncService } from '../sync.service';
import { estProfilComplet } from '../service_volont/volontaire.service';
import { VolontaireService } from '../service_volont/volontaire.service';
import { environment } from '../../environment/environment';

export interface CreationCandidatCompletData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  sexe: 'M' | 'F';
  nationalite: string;
  typePiece: TypePiece;
  numeroPiece: string;
  motDePasse: string;
  confirmerMotDePasse: string;
  consentementPolitique: boolean;
  
  adresseResidence?: string;
  regionGeographique?: string;
  niveauEtudes?: string;
  domaineEtudes?: string;
  competences?: string[];
  motivation?: string;
  disponibilite?: Disponibilite;
  urlCV?: string;
  urlPieceIdentite?: string;
}

export interface MiseAJourProfilData extends Partial<ProfilVolontaire> {}

@Injectable({
  providedIn: 'root'
})
export class AdminCandidatService {
  // ✅ Utilisation de environment.apiUrl
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private syncService: SyncService,
    private volontaireService: VolontaireService  // ✅ Injecter VolontaireService
  ) {
    console.log('📡 AdminCandidatService initialisé avec API URL:', this.apiUrl);
  }

  // ==================== UTILITAIRES ID ====================

  private resolveId(id: any): number | string {
    if (id === undefined || id === null) return id;
    const str = String(id).trim();
    if (str === '' || str === 'NaN') return id;

    if (/^[a-f0-9]+$/i.test(str) && str.length <= 8) {
      return str;
    }

    if (/^\d+$/.test(str)) return parseInt(str, 10);

    return id;
  }

  private idsEqual(a: any, b: any): boolean {
    if (a == null || b == null) return false;
    return String(a).trim() === String(b).trim();
  }

  // ==================== MÉTHODES PRINCIPALES ====================

  getCandidatsAvecProfils(): Observable<Array<{ user: User; volontaire: Volontaire }>> {
    console.log('📋 [AdminCandidat] Chargement des candidats...');
    
    return forkJoin({
      users: this.http.get<User[]>(`${this.apiUrl}/users`),
      volontaires: this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires`)
    }).pipe(
      tap(({ users, volontaires }) => {
        console.log('📋 [AdminCandidat] Users reçus:', users.length);
        console.log('📋 [AdminCandidat] Volontaires reçus:', volontaires.length);
      }),
      map(({ users, volontaires }) => {
        const candidats = users.filter(u => u.role === 'candidat' || u.role === 'volontaire');
        
        const resultats = candidats.map(user => {
          let volontaire = volontaires.find(v => 
            v.userId && this.idsEqual(v.userId, user.id)
          );
          
          if (!volontaire) {
            volontaire = volontaires.find(v => 
              v.email?.toLowerCase() === user.email.toLowerCase()
            );
          }
          
          return {
            user,
            volontaire: volontaire || this.creerVolontaireVide(user)
          };
        }).filter(item => item.volontaire !== null);

        console.log('📋 [AdminCandidat] Résultats:', resultats.length);
        return resultats;
      }),
      catchError(err => {
        console.error('❌ [AdminCandidat] Erreur chargement candidats:', err);
        return of([]);
      })
    );
  }

  private creerVolontaireVide(user: User): Volontaire {
    return {
      id: undefined,
      nom: user.nom || '',
      prenom: user.prenom || '',
      email: user.email,
      telephone: user.telephone || '',
      dateNaissance: user.dateNaissance || new Date().toISOString().split('T')[0],
      sexe: user.sexe || 'M',
      nationalite: user.nationalite || '',
      typePiece: user.typePiece || 'CNIB',
      numeroPiece: user.numeroPiece || '',
      statut: 'Candidat',
      actif: true,
      dateInscription: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      userId: user.id,
      competences: [],
      regionGeographique: '',
      motivation: '',
      disponibilite: 'Temps plein',
      adresseResidence: '',
      niveauEtudes: '',
      domaineEtudes: '',
      dateValidation: undefined,
      statutAvantInactif: undefined,
      urlCV: undefined,
      urlPieceIdentite: undefined
    };
  }

  getCandidatById(id: number | string): Observable<{ user: User; volontaire: Volontaire }> {
    const resolvedId = this.resolveId(id);
    
    if (!resolvedId || resolvedId === 0 || resolvedId === '0') {
      console.error('❌ [AdminCandidat] getCandidatById appelé avec un ID invalide:', resolvedId);
      return throwError(() => new Error('ID de candidat invalide'));
    }

    console.log(`🔍 [AdminCandidat] Chargement du candidat avec ID: ${resolvedId}`);
    
    return this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires`).pipe(
      switchMap(volontaires => {
        const volontaireParId = volontaires.find(v => this.idsEqual(v.id, resolvedId));
        
        if (volontaireParId) {
          console.log(`✅ [AdminCandidat] ID correspond à volontaireId:`, volontaireParId);
          
          if (volontaireParId.userId) {
            return this.http.get<User>(`${this.apiUrl}/users/${volontaireParId.userId}`).pipe(
              map(user => {
                console.log('✅ [AdminCandidat] Candidat trouvé via volontaireId:', { user, volontaire: volontaireParId });
                return { user, volontaire: volontaireParId };
              }),
              catchError(() => {
                const userVirtuel: User = {
                  id: volontaireParId.userId || resolvedId,
                  username: volontaireParId.email.split('@')[0],
                  email: volontaireParId.email,
                  password: '',
                  role: 'candidat',
                  actif: true,
                  prenom: volontaireParId.prenom,
                  nom: volontaireParId.nom,
                  telephone: volontaireParId.telephone,
                  dateNaissance: volontaireParId.dateNaissance,
                  nationalite: volontaireParId.nationalite,
                  sexe: volontaireParId.sexe,
                  typePiece: volontaireParId.typePiece,
                  numeroPiece: volontaireParId.numeroPiece,
                  profilComplete: false,
                  date_inscription: volontaireParId.dateInscription
                };
                console.log('⚠️ [AdminCandidat] Utilisateur non trouvé, création virtuelle');
                return of({ user: userVirtuel, volontaire: volontaireParId });
              })
            );
          } else {
            const userVirtuel: User = {
              id: resolvedId,
              username: volontaireParId.email.split('@')[0],
              email: volontaireParId.email,
              password: '',
              role: 'candidat',
              actif: true,
              prenom: volontaireParId.prenom,
              nom: volontaireParId.nom,
              telephone: volontaireParId.telephone,
              dateNaissance: volontaireParId.dateNaissance,
              nationalite: volontaireParId.nationalite,
              sexe: volontaireParId.sexe,
              typePiece: volontaireParId.typePiece,
              numeroPiece: volontaireParId.numeroPiece,
              profilComplete: false,
              date_inscription: volontaireParId.dateInscription
            };
            console.log('✅ [AdminCandidat] Volontaire sans userId:', { user: userVirtuel, volontaire: volontaireParId });
            return of({ user: userVirtuel, volontaire: volontaireParId });
          }
        }
        
        console.log(`⚠️ [AdminCandidat] ID ${resolvedId} n'est pas un volontaireId, tentative comme userId...`);
        
        return this.http.get<User>(`${this.apiUrl}/users/${resolvedId}`).pipe(
          switchMap(user => {
            const volontaireAssocie = volontaires.find(v => this.idsEqual(v.userId, user.id));
            
            if (volontaireAssocie) {
              console.log('✅ [AdminCandidat] Candidat trouvé via userId:', { user, volontaire: volontaireAssocie });
              return of({ user, volontaire: volontaireAssocie });
            } else {
              const nouveauVolontaire = this.creerVolontaireVide(user);
              console.log('⚠️ [AdminCandidat] Utilisateur sans volontaire, création virtuelle');
              return of({ user, volontaire: nouveauVolontaire });
            }
          }),
          catchError(userError => {
            console.error('❌ [AdminCandidat] ID non trouvé:', resolvedId);
            return throwError(() => new Error(`Candidat non trouvé avec l'ID: ${resolvedId}`));
          })
        );
      })
    );
  }

  getVolontaireById(id: number | string): Observable<Volontaire> {
    const resolvedId = this.resolveId(id);
    return this.http.get<Volontaire>(`${this.apiUrl}/volontaires/${resolvedId}`).pipe(
      catchError(err => {
        console.error('❌ [AdminCandidat] Erreur chargement volontaire:', err);
        return throwError(() => new Error('Volontaire non trouvé'));
      })
    );
  }

  creerCandidatComplet(
    data: CreationCandidatCompletData, 
    profilData?: MiseAJourProfilData
  ): Observable<{ user: User; volontaire: Volontaire }> {
    return this.http.get<User[]>(`${this.apiUrl}/users?email=${data.email}`).pipe(
      switchMap(existants => {
        if (existants.length > 0) {
          return throwError(() => new Error('Un utilisateur avec cet email existe déjà'));
        }
        
        return this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires?numeroPiece=${data.numeroPiece}`).pipe(
          switchMap(volontairesExistants => {
            if (volontairesExistants.length > 0) {
              return throwError(() => new Error('Ce numéro de pièce d\'identité est déjà utilisé'));
            }
            
            const nouvelUser: Omit<User, 'id'> = {
              username: data.email.split('@')[0],
              email: data.email,
              password: data.motDePasse,
              role: 'candidat',
              actif: true,
              prenom: data.prenom,
              nom: data.nom,
              telephone: data.telephone,
              dateNaissance: data.dateNaissance,
              sexe: data.sexe,
              nationalite: data.nationalite,
              typePiece: data.typePiece,
              numeroPiece: data.numeroPiece,
              profilComplete: false,
              date_inscription: new Date().toISOString()
            };

            return this.http.post<User>(`${this.apiUrl}/users`, nouvelUser).pipe(
              switchMap(userCree => {
                const nouveauVolontaire: Omit<Volontaire, 'id'> = {
                  nom: data.nom,
                  prenom: data.prenom,
                  email: data.email,
                  telephone: data.telephone,
                  dateNaissance: data.dateNaissance,
                  sexe: data.sexe,
                  nationalite: data.nationalite,
                  typePiece: data.typePiece,
                  numeroPiece: data.numeroPiece,
                  adresseResidence: data.adresseResidence,
                  regionGeographique: data.regionGeographique,
                  niveauEtudes: data.niveauEtudes,
                  domaineEtudes: data.domaineEtudes,
                  competences: data.competences,
                  motivation: data.motivation,
                  disponibilite: data.disponibilite,
                  urlCV: data.urlCV,
                  urlPieceIdentite: data.urlPieceIdentite,
                  statut: 'Candidat',
                  actif: true,
                  dateInscription: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  userId: userCree.id
                };

                return this.http.post<Volontaire>(`${this.apiUrl}/volontaires`, nouveauVolontaire).pipe(
                  switchMap(volontaireCree => {
                    if (profilData && Object.keys(profilData).length > 0) {
                      return this.completerProfilCandidat(volontaireCree.id!, profilData).pipe(
                        map(volontaireComplete => {
                          this.syncService.notifierVolontaires();
                          this.syncService.notifierCandidatures();
                          return { user: userCree, volontaire: volontaireComplete };
                        })
                      );
                    }
                    
                    this.syncService.notifierVolontaires();
                    this.syncService.notifierCandidatures();
                    return of({ user: userCree, volontaire: volontaireCree });
                  })
                );
              })
            );
          })
        );
      })
    );
  }

  mettreAJourProfilCandidat(
    userId: number | string,
    data: Partial<CreationCandidatCompletData> | MiseAJourProfilData
  ): Observable<{ user: User; volontaire: Volontaire }> {
    const resolvedUserId = this.resolveId(userId);
    
    const { typePiece, numeroPiece, ...safeData } = data as any;
    
    console.log(`📝 [AdminCandidat] Mise à jour profil pour ID: ${resolvedUserId}`, safeData);
    
    return this.getCandidatById(resolvedUserId).pipe(
      switchMap(candidat => {
        const vraiUserId = candidat.user.id;
        const volontaireId = candidat.volontaire.id;
        
        if (!vraiUserId) {
          return throwError(() => new Error('ID utilisateur non trouvé'));
        }
        
        if (!volontaireId) {
          return throwError(() => new Error('ID volontaire non trouvé'));
        }
        
        const userData: any = {};
        if (safeData.nom !== undefined) userData.nom = safeData.nom;
        if (safeData.prenom !== undefined) userData.prenom = safeData.prenom;
        if (safeData.email !== undefined) userData.email = safeData.email;
        if (safeData.telephone !== undefined) userData.telephone = safeData.telephone;
        if (safeData.dateNaissance !== undefined) userData.dateNaissance = safeData.dateNaissance;
        if (safeData.sexe !== undefined) userData.sexe = safeData.sexe;
        if (safeData.nationalite !== undefined) userData.nationalite = safeData.nationalite;

        const userUpdate$ = Object.keys(userData).length > 0
          ? this.http.patch<User>(`${this.apiUrl}/users/${vraiUserId}`, {
              ...userData,
              updated_at: new Date().toISOString()
            })
          : of(candidat.user);

        return userUpdate$.pipe(
          switchMap(userMisAJour => {
            const volontaireData: any = {};
            if (safeData.nom !== undefined) volontaireData.nom = safeData.nom;
            if (safeData.prenom !== undefined) volontaireData.prenom = safeData.prenom;
            if (safeData.email !== undefined) volontaireData.email = safeData.email;
            if (safeData.telephone !== undefined) volontaireData.telephone = safeData.telephone;
            if (safeData.dateNaissance !== undefined) volontaireData.dateNaissance = safeData.dateNaissance;
            if (safeData.sexe !== undefined) volontaireData.sexe = safeData.sexe;
            if (safeData.nationalite !== undefined) volontaireData.nationalite = safeData.nationalite;
            if (safeData.adresseResidence !== undefined) volontaireData.adresseResidence = safeData.adresseResidence;
            if (safeData.regionGeographique !== undefined) volontaireData.regionGeographique = safeData.regionGeographique;
            if (safeData.niveauEtudes !== undefined) volontaireData.niveauEtudes = safeData.niveauEtudes;
            if (safeData.domaineEtudes !== undefined) volontaireData.domaineEtudes = safeData.domaineEtudes;
            if (safeData.competences !== undefined) volontaireData.competences = safeData.competences;
            if (safeData.motivation !== undefined) volontaireData.motivation = safeData.motivation;
            if (safeData.disponibilite !== undefined) volontaireData.disponibilite = safeData.disponibilite;
            if (safeData.urlCV !== undefined) volontaireData.urlCV = safeData.urlCV;
            if (safeData.urlPieceIdentite !== undefined) volontaireData.urlPieceIdentite = safeData.urlPieceIdentite;

            return this.http.patch<Volontaire>(`${this.apiUrl}/volontaires/${volontaireId}`, {
              ...volontaireData,
              updated_at: new Date().toISOString()
            }).pipe(
              map(volontaire => {
                console.log('✅ [AdminCandidat] Profil mis à jour:', volontaire);
                this.syncService.notifierVolontaires();
                return { user: userMisAJour, volontaire };
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('❌ [AdminCandidat] Erreur mise à jour profil:', err);
        return throwError(() => err);
      })
    );
  }

  completerProfilCandidat(
    volontaireId: number | string,
    data: MiseAJourProfilData
  ): Observable<Volontaire> {
    const resolvedVolontaireId = this.resolveId(volontaireId);
    
    console.log(`📝 [AdminCandidat] Complétion profil pour volontaire: ${resolvedVolontaireId}`, data);
    
    return this.http.get<Volontaire>(`${this.apiUrl}/volontaires/${resolvedVolontaireId}`).pipe(
      switchMap(volontaire => {
        return this.http.patch<Volontaire>(`${this.apiUrl}/volontaires/${resolvedVolontaireId}`, {
          ...data,
          updated_at: new Date().toISOString()
        }).pipe(
          switchMap(volontaireMisAJour => {
            const competencesOk = (data.competences && data.competences.length > 0) || 
                                 (volontaire.competences && volontaire.competences.length > 0);
            
            const champsRequis = [
              volontaire.adresseResidence || data.adresseResidence,
              volontaire.regionGeographique || data.regionGeographique,
              volontaire.niveauEtudes || data.niveauEtudes,
              volontaire.domaineEtudes || data.domaineEtudes,
              competencesOk,
              volontaire.motivation || data.motivation,
              volontaire.disponibilite || data.disponibilite,
              volontaire.urlCV || data.urlCV,
              volontaire.urlPieceIdentite || data.urlPieceIdentite
            ].every(Boolean);

            if (champsRequis && volontaire.statut === 'Candidat') {
              return this.http.patch<Volontaire>(`${this.apiUrl}/volontaires/${resolvedVolontaireId}`, {
                statut: 'En attente',
                updated_at: new Date().toISOString()
              }).pipe(
                map(v => {
                  if (volontaire.userId) {
                    const resolvedUserId = this.resolveId(volontaire.userId);
                    this.http.patch(`${this.apiUrl}/users/${resolvedUserId}`, {
                      role: 'volontaire',
                      profilComplete: true,
                      updated_at: new Date().toISOString()
                    }).subscribe();
                  }
                  console.log('✅ [AdminCandidat] Profil complet, statut → En attente');
                  this.syncService.notifierVolontaires();
                  return v;
                })
              );
            }
            
            this.syncService.notifierVolontaires();
            return of(volontaireMisAJour);
          })
        );
      }),
      catchError(err => {
        console.error('❌ [AdminCandidat] Erreur complétion profil:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * ✅ Désactive un candidat - Utilise l'endpoint dédié /desactiver du VolontaireService
   */
  desactiverCandidat(userId: number | string, volontaireId: number | string, statutActuel: VolontaireStatut): Observable<any> {
    console.log(`🔴 [AdminCandidat] Désactivation - User: ${userId}, Volontaire: ${volontaireId}, Statut actuel: ${statutActuel}`);
    
    const resolvedUserId = this.resolveId(userId);
    const resolvedVolontaireId = this.resolveId(volontaireId);

    // ✅ Utiliser l'endpoint dédié du VolontaireService
    return this.volontaireService.desactiverVolontaire(resolvedVolontaireId.toString()).pipe(
      switchMap(volontaire => {
        // Mettre à jour l'utilisateur également
        return this.http.patch<User>(`${this.apiUrl}/users/${resolvedUserId}`, {
          actif: false,
          updated_at: new Date().toISOString()
        }).pipe(
          tap(user => {
            console.log('✅ [AdminCandidat] Candidat désactivé:', { volontaire, user });
            this.syncService.notifierVolontaires();
          }),
          map(() => volontaire)
        );
      }),
      catchError(err => {
        console.error('❌ [AdminCandidat] Erreur désactivation candidat:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * ✅ Réactive un candidat - Utilise l'endpoint dédié /reactiver du VolontaireService
   */
  reactiverCandidat(volontaireId: number | string): Observable<Volontaire> {
    console.log(`🟢 [AdminCandidat] Réactivation - Volontaire: ${volontaireId}`);
    
    const resolvedVolontaireId = this.resolveId(volontaireId);

    // ✅ Utiliser l'endpoint dédié du VolontaireService
    return this.volontaireService.reactiverVolontaire(resolvedVolontaireId.toString()).pipe(
      switchMap(volontaire => {
        // Récupérer l'utilisateur associé
        return this.getCandidatById(volontaireId).pipe(
          switchMap(candidat => {
            const userId = candidat.user.id;
            
            if (!userId) {
              return throwError(() => new Error('ID utilisateur non trouvé'));
            }
            
            // Mettre à jour l'utilisateur
            return this.http.patch<User>(`${this.apiUrl}/users/${userId}`, {
              actif: true,
              updated_at: new Date().toISOString()
            }).pipe(
              tap(() => {
                console.log(`✅ [AdminCandidat] Candidat réactivé avec statut: ${volontaire.statut}`);
                this.syncService.notifierVolontaires();
              }),
              map(() => volontaire)
            );
          })
        );
      }),
      catchError(err => {
        console.error('❌ [AdminCandidat] Erreur réactivation candidat:', err);
        return throwError(() => err);
      })
    );
  }

  supprimerCandidat(userId: number | string, volontaireId: number | string): Observable<void> {
    console.log(`🗑️ [AdminCandidat] Suppression - User: ${userId}, Volontaire: ${volontaireId}`);
    
    const resolvedUserId = this.resolveId(userId);
    const resolvedVolontaireId = this.resolveId(volontaireId);

    return forkJoin({
      deleteUser: this.http.delete<void>(`${this.apiUrl}/users/${resolvedUserId}`),
      deleteVolontaire: this.http.delete<void>(`${this.apiUrl}/volontaires/${resolvedVolontaireId}`)
    }).pipe(
      map(() => {
        console.log('✅ [AdminCandidat] Candidat supprimé avec succès');
        this.syncService.notifierVolontaires();
        this.syncService.notifierCandidatures();
      }),
      catchError(err => {
        console.error('❌ [AdminCandidat] Erreur suppression candidat:', err);
        return throwError(() => err);
      })
    );
  }

  getStatsCandidats(): Observable<any> {
    return forkJoin({
      volontaires: this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires`),
      users: this.http.get<User[]>(`${this.apiUrl}/users`)
    }).pipe(
      map(({ volontaires, users }) => {
        const usersCandidats = users.filter(u => u.role === 'candidat').length;
        const usersVolontaires = users.filter(u => u.role === 'volontaire').length;
        
        const stats = {
          total: volontaires.length,
          parStatut: {
            candidats: volontaires.filter(v => v.statut === 'Candidat').length,
            enAttente: volontaires.filter(v => v.statut === 'En attente').length,
            actifs: volontaires.filter(v => v.statut === 'Actif').length,
            inactifs: volontaires.filter(v => v.statut === 'Inactif').length,
            refuses: volontaires.filter(v => v.statut === 'Refusé').length
          },
          comptesActifs: volontaires.filter(v => v.actif === true).length,
          comptesInactifs: volontaires.filter(v => v.actif === false).length,
          comptesUtilisateurs: usersCandidats + usersVolontaires,
          comptesCandidats: usersCandidats,
          comptesVolontaires: usersVolontaires,
          sansCompte: volontaires.filter(v => !v.userId).length
        };
        return stats;
      }),
      catchError(() => of({
        total: 0,
        parStatut: { candidats: 0, enAttente: 0, actifs: 0, inactifs: 0, refuses: 0 },
        comptesActifs: 0,
        comptesInactifs: 0,
        comptesUtilisateurs: 0,
        comptesCandidats: 0,
        comptesVolontaires: 0,
        sansCompte: 0
      }))
    );
  }

  verifierEmailExiste(email: string): Observable<boolean> {
    return this.http.get<User[]>(`${this.apiUrl}/users?email=${email}`).pipe(
      map(users => users.length > 0),
      catchError(() => of(false))
    );
  }

  verifierNumeroPieceExiste(numeroPiece: string): Observable<boolean> {
    return this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires?numeroPiece=${numeroPiece}`).pipe(
      map(volontaires => volontaires.length > 0),
      catchError(() => of(false))
    );
  }

  changerStatutVolontaire(volontaireId: string, statut: string): Observable<Volontaire> {
    console.log(`🔄 [AdminCandidat] Changement statut volontaire ${volontaireId} → ${statut}`);
    const resolvedId = this.resolveId(volontaireId);
    
    return this.http.patch<Volontaire>(`${this.apiUrl}/volontaires/${resolvedId}`, {
      statut: statut,
      updated_at: new Date().toISOString()
    }).pipe(
      tap(() => {
        this.syncService.notifierVolontaires();
        console.log(`✅ [AdminCandidat] Statut volontaire ${volontaireId} changé à ${statut}`);
      }),
      catchError(err => {
        console.error(`❌ [AdminCandidat] Erreur changement statut volontaire:`, err);
        return throwError(() => new Error('Erreur lors du changement de statut'));
      })
    );
  }
}