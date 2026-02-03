// AJOUTS ET CORRECTIONS pour project.service.ts
// Ajouter ces méthodes à votre ProjectService existant

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin, BehaviorSubject, interval, Subscription } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { Project, ProjectStatus, ProjectWorkflow } from '../../models/projects.model';
import { Volontaire } from '../../models/volontaire.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/service_auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectService implements OnDestroy {
  private apiUrl = 'http://localhost:3000';
  private notificationSubject = new BehaviorSubject<string[]>([]);
  private isAdminUser = false;
  private monitoringSubscription: Subscription | null = null;
  private userSubscription: Subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.initializeService();
  }

  ngOnDestroy(): void {
    this.stopEcheanceMonitoring();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  // ===== ✅ NOUVELLE MÉTHODE: Statistiques détaillées pour le partenaire =====
  /**
   * Récupère les statistiques détaillées pour un partenaire
   * Inclut les projets ET les candidatures
   */
  getStatistiquesPartenaire(partenaireId: string | number): Observable<{
    totalProjets: number;
    projetsActifs: number;
    projetsEnAttente: number;
    projetsTermines: number;
    volontairesAffectes: number;
    candidatures: number;
    nouvellesCandidatures: number;
  }> {
    console.log('📊 Calcul statistiques pour partenaire:', partenaireId);
    
    return forkJoin({
      projets: this.getProjetsByPartenaire(partenaireId),
      candidatures: this.http.get<any[]>(`${this.apiUrl}/candidatures`).pipe(
        map(allCandidatures => {
          // Filtrer les candidatures liées aux projets du partenaire
          return allCandidatures.filter(c => {
            // Vous pouvez ajuster cette logique selon votre structure de données
            return c.partenaireId === partenaireId.toString() || 
                   c.partenaireId === Number(partenaireId);
          });
        }),
        catchError(error => {
          console.warn('⚠️ Erreur chargement candidatures:', error);
          return of([]);
        })
      )
    }).pipe(
      map(({ projets, candidatures }) => {
        const stats = {
          totalProjets: projets.length,
          projetsActifs: projets.filter(p => p.statutProjet === 'actif').length,
          projetsEnAttente: projets.filter(p => p.statutProjet === 'en_attente').length,
          projetsTermines: projets.filter(p => p.statutProjet === 'cloture').length,
          volontairesAffectes: projets.reduce((sum, p) => sum + (p.nombreVolontairesActuels ?? 0), 0),
          candidatures: candidatures.length,
          nouvellesCandidatures: candidatures.filter(c => 
            c.statut === 'en_attente' && 
            this.isRecent(c.dateCreation || c.created_at || c.date)
          ).length
        };
        
        console.log('✅ Stats calculées pour partenaire', partenaireId, ':', stats);
        return stats;
      }),
      catchError(error => {
        console.error('❌ Erreur calcul stats partenaire:', error);
        // Retourner des valeurs par défaut en cas d'erreur
        return of({
          totalProjets: 0,
          projetsActifs: 0,
          projetsEnAttente: 0,
          projetsTermines: 0,
          volontairesAffectes: 0,
          candidatures: 0,
          nouvellesCandidatures: 0
        });
      })
    );
  }

  /**
   * Vérifie si une date est récente (moins de 7 jours)
   */
  private isRecent(dateString: string): boolean {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    } catch (error) {
      return false;
    }
  }

  // ===== ✅ CORRECTION: normalizeProject avec nullish coalescing =====
  private normalizeProject(project: any): Project {
    // ✅ Utiliser ?? au lieu de || pour préserver les valeurs 0
    const normalized: Project = {
      id: project.id,
      titre: project.titre ?? project.title ?? '',
      partenaireId: project.partenaireId,
      
      descriptionLongue: project.descriptionLongue ?? project.description ?? '',
      descriptionCourte: project.descriptionCourte ?? 
                         (project.description?.substring(0, 150)) ??
                         (project.descriptionLongue?.substring(0, 150)) ?? '',
      
      domaineActivite: project.domaineActivite ?? project.domain ?? '',
      competences_requises: project.competences_requises ?? project.requiredSkills ?? [],
      type_mission: project.type_mission ?? project.missionType ?? '',
      
      regionAffectation: project.regionAffectation ?? project.region ?? '',
      ville_commune: project.ville_commune ?? project.city ?? '',
      
      // ✅ CRITIQUE: Préserver 0 comme valeur valide
      nombreVolontairesRequis: project.nombreVolontairesRequis ?? project.neededVolunteers ?? 0,
      nombreVolontairesActuels: project.nombreVolontairesActuels ?? project.volontairesAffectes ?? 0,
      avantagesVolontaire: project.avantagesVolontaire ?? project.volunteerBenefits ?? '',
      
      dateDebut: project.dateDebut ?? project.startDate,
      dateFin: project.dateFin ?? project.endDate,
      dateLimiteCandidature: project.dateLimiteCandidature ?? project.applicationDeadline,
      datePublication: project.datePublication ?? project.publishedDate,
      dateCloture: project.dateCloture,
      
      statutProjet: this.normalizeStatut(project.statutProjet ?? project.status),
      
      conditions_particulieres: project.conditions_particulieres ?? project.specialConditions ?? '',
      contact_responsable: project.contact_responsable ?? project.contactPerson ?? '',
      email_contact: project.email_contact ?? project.contactEmail ?? '',
      
      created_at: project.created_at ?? project.createdAt,
      updated_at: project.updated_at ?? project.updatedAt,
      partenaire: project.partenaire ?? project.partner
    };

    console.log('🔄 Projet normalisé:', {
      id: normalized.id,
      titre: normalized.titre,
      statut: normalized.statutProjet,
      volontairesActuels: normalized.nombreVolontairesActuels,
      volontairesRequis: normalized.nombreVolontairesRequis
    });

    return normalized;
  }

  // ===== ✅ CORRECTION: updateProject =====
  updateProject(id: number | string, project: Partial<Project>): Observable<Project> {
    // ✅ Ne pas écraser updated_at s'il est déjà fourni
    const updatedData = {
      ...project,
      updated_at: project.updated_at ?? new Date().toISOString()
    };
    
    console.log(`📤 Envoi mise à jour projet ${id}:`, {
      proprietesEnvoyees: Object.keys(updatedData).length,
      statut: updatedData.statutProjet,
      volontairesActuels: updatedData.nombreVolontairesActuels
    });
    
    return this.http.put<Project>(`${this.apiUrl}/projets/${id}`, updatedData).pipe(
      map(updatedProject => {
        console.log(`✅ Projet ${id} mis à jour avec succès`);
        return this.normalizeProject(updatedProject);
      }),
      catchError(error => {
        console.error(`❌ Erreur mise à jour projet ${id}:`, error);
        console.error('Données envoyées:', updatedData);
        throw error;
      })
    );
  }

  // ===== AUTRES MÉTHODES EXISTANTES (garder telles quelles) =====

  getVolontairesDisponibles(): Observable<Volontaire[]> {
    return this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires`).pipe(
      map(volontaires => {
        return volontaires.filter(volontaire => 
          volontaire.statut === 'Actif' || volontaire.statut === 'En attente'
        );
      }),
      catchError(error => {
        console.error('❌ Erreur chargement volontaires disponibles:', error);
        return of([]);
      })
    );
  }

  getAllProjectsWithStats(): Observable<any> {
    return this.getProjects().pipe(
      switchMap(projects => {
        const projectsWithStats = projects.map(project => 
          this.getCandidaturesByProject(project.id!).pipe(
            map(candidatures => ({
              ...project,
              stats: {
                candidatures: candidatures.length,
                volontairesAffectes: project.nombreVolontairesActuels ?? 0,
                candidaturesEnAttente: candidatures.filter(c => c.statut === 'en_attente').length
              }
            }))
          )
        );
        return forkJoin(projectsWithStats);
      }),
      catchError(error => {
        console.error('❌ Erreur chargement projets avec stats:', error);
        return of([]);
      })
    );
  }

  getStatistiquesEcheances(): Observable<any> {
    return this.getProjects().pipe(
      map(projects => {
        const aujourdhui = new Date();
        return {
          projetsEnRetard: projects.filter(p => 
            p.dateFin && new Date(p.dateFin) < aujourdhui && p.statutProjet !== 'cloture'
          ).length,
          projetsAEcheance: projects.filter(p => 
            p.dateFin && this.getDaysUntil(new Date(p.dateFin)) <= 3 && p.statutProjet !== 'cloture'
          ).length,
          totalProjets: projects.length
        };
      })
    );
  }

  private getDaysUntil(date: Date): number {
    const aujourdhui = new Date();
    const diffTime = date.getTime() - aujourdhui.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  updateAdminStatus(): void {
    console.log('Mise à jour statut admin - méthode appelée');
  }

  private initializeService(): void {
    this.checkAdminStatus();
    
    console.log('🔧 Initialisation ProjectService - Statut admin:', this.isAdminUser);
    
    if (this.isAdminUser) {
      console.log('🔐 Démarrage surveillance initial - Admin déjà connecté');
      this.startEcheanceMonitoring();
    }
    
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      const wasAdmin = this.isAdminUser;
      this.checkAdminStatus();
      
      console.log('🔄 Changement statut utilisateur ProjectService:', {
        ancien: wasAdmin ? 'admin' : 'non-admin',
        nouveau: this.isAdminUser ? 'admin' : 'non-admin'
      });
      
      if (!user || !this.isAdminUser) {
        console.log('🔕 Arrêt surveillance - Déconnexion ou non-admin');
        this.stopEcheanceMonitoring();
        this.clearEcheanceNotifications();
      }
      
      if (user && this.isAdminUser && !wasAdmin) {
        console.log('🔐 Démarrage surveillance - Admin connecté');
        this.startEcheanceMonitoring();
      }
    });
  }

  private checkAdminStatus(): void {
    this.isAdminUser = this.authService.isAdmin();
  }

  private startEcheanceMonitoring(): void {
    if (!this.isAdminUser) {
      console.log('🔕 Surveillance échéances désactivée - Utilisateur non admin');
      return;
    }

    this.stopEcheanceMonitoring();
    this.verifierEcheancesProjets();

    this.monitoringSubscription = interval(60000).subscribe(() => {
      if (this.isAdminUser && this.authService.isAdmin()) {
        this.verifierEcheancesProjets();
      } else {
        console.log('🔕 Intervalle ignoré - Plus admin');
        this.stopEcheanceMonitoring();
      }
    });

    console.log('✅ Surveillance échéances démarrée pour admin');
  }

  private stopEcheanceMonitoring(): void {
    if (this.monitoringSubscription) {
      this.monitoringSubscription.unsubscribe();
      this.monitoringSubscription = null;
      console.log('🛑 Surveillance échéances arrêtée');
    }
  }

  clearEcheanceNotifications(): void {
    console.log('🗑️ Vider les notifications d\'échéance');
    this.notificationSubject.next([]);
  }

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projets`).pipe(
      map(projects => this.normalizeProjects(projects)),
      catchError(error => {
        console.error('Erreur chargement projets:', error);
        return of([]);
      })
    );
  }

  getProject(id: number | string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/projets/${id}`).pipe(
      map(project => this.normalizeProject(project)),
      catchError(error => {
        console.error(`Erreur chargement projet ${id}:`, error);
        throw error;
      })
    );
  }

  createProject(project: Omit<Project, 'id'>): Observable<Project> {
    const newProject = {
      ...project,
      statutProjet: 'en_attente' as ProjectStatus,
      nombreVolontairesActuels: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return this.http.post<Project>(`${this.apiUrl}/projets`, newProject).pipe(
      map(createdProject => this.normalizeProject(createdProject))
    );
  }

  soumettrePourValidation(id: number | string): Observable<Project> {
    return this.changerStatutProjet(id, 'en_attente').pipe(
      catchError(error => {
        console.error(`❌ Erreur soumission projet ${id} pour validation:`, error);
        throw error;
      })
    );
  }

  deleteProject(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/projets/${id}`);
  }

  changerStatutProjet(id: number | string, nouveauStatut: ProjectStatus): Observable<Project> {
    console.log(`🔄 Début changement statut projet ${id} vers ${nouveauStatut}`);
    
    return this.getProject(id).pipe(
      take(1),
      switchMap(originalProject => {
        console.log(`📋 Projet original chargé:`, {
          titre: originalProject.titre,
          statutActuel: originalProject.statutProjet,
          partenaireId: originalProject.partenaireId,
          region: originalProject.regionAffectation
        });

        if (!ProjectWorkflow.canChangeStatus(originalProject.statutProjet, nouveauStatut)) {
          const erreur = new Error(`Transition de statut non autorisée: ${originalProject.statutProjet} → ${nouveauStatut}`);
          console.error('❌', erreur.message);
          
          const transitionsPossibles = ProjectWorkflow.getPossibleTransitions(originalProject.statutProjet);
          console.log('📋 Transitions possibles depuis', originalProject.statutProjet, ':', transitionsPossibles);
          
          throw erreur;
        }

        const updates: Partial<Project> = {
          statutProjet: nouveauStatut,
          updated_at: new Date().toISOString()
        };

        if (nouveauStatut === 'actif' && !originalProject.datePublication) {
          updates.datePublication = new Date().toISOString();
        }

        if (nouveauStatut === 'cloture') {
          updates.dateCloture = new Date().toISOString();
        }

        return this.getProject(id).pipe(
          take(1),
          switchMap(fullProject => {
            const projectToUpdate: Partial<Project> = {
              titre: fullProject.titre,
              partenaireId: fullProject.partenaireId,
              descriptionLongue: fullProject.descriptionLongue,
              descriptionCourte: fullProject.descriptionCourte,
              domaineActivite: fullProject.domaineActivite,
              competences_requises: fullProject.competences_requises,
              type_mission: fullProject.type_mission,
              regionAffectation: fullProject.regionAffectation,
              ville_commune: fullProject.ville_commune,
              nombreVolontairesRequis: fullProject.nombreVolontairesRequis,
              nombreVolontairesActuels: fullProject.nombreVolontairesActuels,
              avantagesVolontaire: fullProject.avantagesVolontaire,
              dateDebut: fullProject.dateDebut,
              dateFin: fullProject.dateFin,
              dateLimiteCandidature: fullProject.dateLimiteCandidature,
              datePublication: fullProject.datePublication,
              dateCloture: fullProject.dateCloture,
              conditions_particulieres: fullProject.conditions_particulieres,
              contact_responsable: fullProject.contact_responsable,
              email_contact: fullProject.email_contact,
              created_at: fullProject.created_at,
              
              ...updates
            };

            console.log(`📦 Envoi projet complet pour mise à jour ${id}:`, {
              titre: projectToUpdate.titre,
              statut: projectToUpdate.statutProjet,
              totalPropriétés: Object.keys(projectToUpdate).length
            });

            return this.updateProject(id, projectToUpdate).pipe(
              switchMap(updatedProject => {
                console.log(`✅ Projet ${id} mis à jour avec succès, rechargement...`);
                return this.getProject(id);
              }),
              catchError(error => {
                console.error(`❌ Erreur lors de la mise à jour du projet ${id}:`, error);
                console.warn(`⚠️ Retour au projet original après erreur:`, originalProject.titre);
                return of(originalProject);
              })
            );
          })
        );
      }),
      catchError(error => {
        console.error(`❌ Erreur changement statut projet ${id}:`, error);
        throw error;
      })
    );
  }

  validerProjet(id: number | string): Observable<Project> {
    return this.changerStatutProjet(id, 'actif');
  }

  cloturerProjet(id: number | string): Observable<Project> {
    return this.changerStatutProjet(id, 'cloture').pipe(
      catchError(error => {
        console.error(`❌ Erreur clôture directe projet ${id}:`, error);
        
        if (error.message.includes('Transition de statut non autorisée')) {
          console.log(`ℹ️ Transition directe impossible, statut actuel doit être vérifié`);
          return this.getProject(id).pipe(
            take(1),
            switchMap(project => {
              console.log(`📋 Statut actuel du projet: ${project.statutProjet}`);
              if (project.statutProjet === 'en_attente') {
                return this.changerStatutProjet(id, 'cloture');
              }
              throw error;
            })
          );
        }
        throw error;
      })
    );
  }

  mettreEnCoursProjet(id: number | string): Observable<Project> {
    return this.changerStatutProjet(id, 'actif');
  }

  getVolontairesByProject(projectId: number | string): Observable<any[]> {
    return forkJoin({
      affectations: this.http.get<any[]>(`${this.apiUrl}/affectations?projectId=${projectId}`).pipe(
        catchError(error => {
          console.error(`Erreur chargement affectations pour projet ${projectId}:`, error);
          return of([]);
        })
      ),
      volontaires: this.http.get<any[]>(`${this.apiUrl}/volontaires`).pipe(
        catchError(error => {
          console.error('Erreur chargement volontaires:', error);
          return of([]);
        })
      )
    }).pipe(
      map(({ affectations, volontaires }) => {
        return affectations.map(affectation => {
          const volontaire = volontaires.find(v => v.id === affectation.volontaireId);
          return {
            id: affectation.id,
            volontaire: volontaire ?? {
              id: affectation.volontaireId,
              prenom: 'Volontaire',
              nom: `#${affectation.volontaireId}`,
              email: 'email@example.com',
              competences: []
            },
            dateAffectation: affectation.dateAffectation,
            statut: affectation.statut
          };
        });
      })
    );
  }

  affecterVolontaire(projectId: number | string, volontaireId: number | string): Observable<any> {
    return this.getProject(projectId).pipe(
      take(1),
      switchMap(project => {
        const nouvelleAffectation = {
          projectId: projectId.toString(),
          volontaireId: volontaireId.toString(),
          dateAffectation: new Date().toISOString(),
          statut: 'active'
        };

        return forkJoin({
          affectation: this.http.post<any>(`${this.apiUrl}/affectations`, nouvelleAffectation),
          projetUpdate: this.updateProject(projectId, {
            nombreVolontairesActuels: (project.nombreVolontairesActuels ?? 0) + 1
          })
        });
      })
    );
  }

  retirerVolontaire(projectId: number | string, affectationId: number | string): Observable<void> {
    return this.getProject(projectId).pipe(
      take(1),
      switchMap(project => {
        return forkJoin({
          suppression: this.http.delete<void>(`${this.apiUrl}/affectations/${affectationId}`),
          projetUpdate: this.updateProject(projectId, {
            nombreVolontairesActuels: Math.max(0, (project.nombreVolontairesActuels ?? 0) - 1)
          })
        });
      }),
      map(() => {})
    );
  }

  getCandidaturesByProject(projectId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/candidatures?projectId=${projectId}`).pipe(
      catchError(error => {
        console.error(`Erreur chargement candidatures pour projet ${projectId}:`, error);
        return of([]);
      })
    );
  }

  getProjetsByPartenaire(partenaireId: string | number): Observable<Project[]> {
    const id = partenaireId.toString();
    return this.http.get<Project[]>(`${this.apiUrl}/projets?partenaireId=${id}`).pipe(
      map(projects => this.normalizeProjects(projects)),
      catchError(error => {
        console.error(`Erreur chargement projets partenaire ${id}:`, error);
        return of([]);
      })
    );
  }

  getStatsByPartenaire(partenaireId: string | number): Observable<any> {
    return this.getProjetsByPartenaire(partenaireId).pipe(
      map(projets => {
        const stats = {
          total: projets.length,
          en_attente: projets.filter(p => p.statutProjet === 'en_attente').length,
          actifs: projets.filter(p => p.statutProjet === 'actif').length,
          clotures: projets.filter(p => p.statutProjet === 'cloture').length,
          volontairesAffectes: projets.reduce((total, projet) => 
            total + (projet.nombreVolontairesActuels ?? 0), 0
          )
        };

        console.log(`📊 Stats partenaire ${partenaireId}:`, stats);
        return stats;
      })
    );
  }

  peutCreerProjet(partenaireId: string | number): Observable<boolean> {
    return this.getProjetsByPartenaire(partenaireId).pipe(
      map(projets => {
        const projetsActifs = projets.filter(p => 
          p.statutProjet === 'en_attente' || p.statutProjet === 'actif'
        ).length;
        
        const peutCreer = projetsActifs < 10;
        
        console.log(`🔍 Vérification création projet - Partenaire ${partenaireId}:`, {
          totalProjets: projets.length,
          projetsActifs,
          limite: 10,
          peutCreer
        });
        
        return peutCreer;
      }),
      catchError(error => {
        console.error('❌ Erreur vérification création projet:', error);
        return of(true);
      })
    );
  }

  getProjetsPublic(): Observable<Project[]> {
    return this.getProjects().pipe(
      map(projets => projets.filter(projet => 
        projet.statutProjet === 'actif'
      )),
      catchError(error => {
        console.error('Erreur chargement projets publics:', error);
        return of([]);
      })
    );
  }

  getProjetsEnAttenteValidation(): Observable<Project[]> {
    return this.getProjects().pipe(
      map(projets => projets.filter(projet => 
        projet.statutProjet === 'en_attente'
      )),
      catchError(error => {
        console.error('Erreur chargement projets en attente:', error);
        return of([]);
      })
    );
  }

  private normalizeProjects(projects: any[]): Project[] {
    return projects.map(project => this.normalizeProject(project));
  }

  private normalizeStatut(statut: any): ProjectStatus {
    if (!statut) return 'en_attente';
    
    const statutStr = statut.toString().toLowerCase();
    
    const mapping: { [key: string]: ProjectStatus } = {
      'en_attente': 'en_attente',
      'en attente': 'en_attente',
      'waiting': 'en_attente',
      'pending': 'en_attente',
      
      'actif': 'actif',
      'active': 'actif',
      'ouvert': 'actif',
      'open': 'actif',
      
      'cloture': 'cloture',
      'closed': 'cloture',
      'completed': 'cloture',
      'termine': 'cloture',
      
      'soumis': 'en_attente',
      'submitted': 'en_attente',
      'en_attente_validation': 'en_attente',
      'pending_validation': 'en_attente',
      'ouvert_aux_candidatures': 'actif',
      'open_for_applications': 'actif',
      'en_cours': 'actif',
      'in_progress': 'actif'
    };
    
    return mapping[statutStr] ?? 'en_attente';
  }

  private async verifierEcheancesProjets(): Promise<void> {
    if (!this.isAdminUser || !this.authService.isAdmin()) {
      console.log('🔕 Vérification échéances ignorée - Non admin');
      return;
    }

    try {
      const projets = await this.getProjects().toPromise();
      if (!projets) return;

      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      
      const notifications: string[] = [];

      for (const projet of projets) {
        const resultat = await this.verifierProjetEcheance(projet, aujourdhui);
        if (resultat) {
          notifications.push(resultat);
        }
      }

      if (notifications.length > 0) {
        this.notifierAdmin(notifications);
      }

    } catch (error) {
      console.error('Erreur lors de la vérification des échéances:', error);
    }
  }

  private async verifierProjetEcheance(projet: Project, aujourdhui: Date): Promise<string | null> {
    if (!projet.dateFin || !projet.id) return null;

    try {
      const dateEcheance = new Date(projet.dateFin);
      dateEcheance.setHours(0, 0, 0, 0);
      
      if (projet.statutProjet === 'cloture') {
        return null;
      }

      if (dateEcheance < aujourdhui) {
        if (projet.statutProjet === 'actif') {
          try {
            await this.cloturerProjet(projet.id).toPromise();
            return `⚠️ Le projet "${projet.titre}" a été clôturé (échéance dépassée)`;
          } catch (error) {
            return `ℹ️ Le projet "${projet.titre}" est en retard mais ne peut être clôturé`;
          }
        } else if (projet.statutProjet === 'en_attente') {
          try {
            await this.cloturerProjet(projet.id).toPromise();
            return `⚠️ Le projet "${projet.titre}" a été clôturé (échéance dépassée avant validation)`;
          } catch (error) {
            return `ℹ️ Le projet "${projet.titre}" est en retard (en attente de validation)`;
          }
        } else {
          return `ℹ️ Le projet "${projet.titre}" est en retard (statut: ${ProjectWorkflow.getStatusLabel(projet.statutProjet)})`;
        }
      }

      if (dateEcheance.getTime() === aujourdhui.getTime()) {
        return `🔔 Le projet "${projet.titre}" arrive à échéance aujourd'hui`;
      }

      const dans3Jours = new Date(aujourdhui);
      dans3Jours.setDate(aujourdhui.getDate() + 3);

      if (dateEcheance.getTime() === dans3Jours.getTime()) {
        return `📅 Le projet "${projet.titre}" arrive à échéance dans 3 jours (${this.formatDate(projet.dateFin)})`;
      }

      return null;
    } catch (error) {
      console.error(`Erreur vérification projet ${projet.id}:`, error);
      return null;
    }
  }

  private notifierAdmin(notifications: string[]): void {
    if (!this.isAdminUser || !this.authService.isAdmin()) {
      console.log('🔕 Notification BLOQUÉE - Utilisateur non admin');
      return;
    }

    console.log('📢 Envoi notifications admin:', notifications);
    this.notificationSubject.next(notifications);

    const alertesImportantes = notifications.filter(notif => 
      notif.includes('⚠️') || notif.includes('aujourd\'hui')
    );

    if (alertesImportantes.length > 0) {
      const message = alertesImportantes.length === 1 
        ? alertesImportantes[0] 
        : `${alertesImportantes.length} alertes d'échéance urgentes`;

      this.snackBar.open(message, 'Voir les projets', {
        duration: 10000,
        verticalPosition: 'top',
        horizontalPosition: 'right',
        panelClass: ['echeance-snackbar']
      }).onAction().subscribe(() => {
        window.location.href = '/features/admin/projets';
      });
    }
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getEcheanceNotifications(): Observable<string[]> {
    if (!this.authService.isAdmin() || !this.isAdminUser) {
      console.log('🔕 Accès REFUSÉ aux notifications - Utilisateur non admin');
      return of([]);
    }
    return this.notificationSubject.asObservable();
  }

  verifierEcheancesManuellement(): Promise<void> {
    if (!this.authService.isAdmin() || !this.isAdminUser) {
      console.log('🔕 Vérification manuelle REFUSÉE - Utilisateur non admin');
      return Promise.resolve();
    }
    return this.verifierEcheancesProjets();
  }

  canApplyToProject(project: Project): boolean {
    return ProjectWorkflow.canAcceptApplications(project.statutProjet);
  }

  getProjetsEligiblesPourCandidature(): Observable<Project[]> {
    return this.getProjects().pipe(
      map(projets => projets.filter(projet => 
        ProjectWorkflow.canAcceptApplications(projet.statutProjet)
      ))
    );
  }

  diagnostiquerProjet(id: number | string): void {
    this.http.get<any>(`${this.apiUrl}/projets/${id}`).subscribe({
      next: (rawData) => {
        console.log('🔍 DIAGNOSTIC PROJET - Données brutes du serveur:', rawData);
        console.log('🔍 Champs manquants ou vides:', {
          titre: !rawData.titre ? '❌ MANQUANT' : '✅ OK',
          statutProjet: !rawData.statutProjet ? '❌ MANQUANT' : '✅ OK',
          nombreVolontairesRequis: rawData.nombreVolontairesRequis === undefined ? '❌ MANQUANT' : '✅ OK',
          nombreVolontairesActuels: rawData.nombreVolontairesActuels === undefined ? '❌ MANQUANT' : '✅ OK'
        });
        
        const normalized = this.normalizeProject(rawData);
        console.log('🔍 DIAGNOSTIC PROJET - Après normalisation:', normalized);
      },
      error: (error) => {
        console.error('❌ Erreur diagnostic:', error);
      }
    });
  }
}