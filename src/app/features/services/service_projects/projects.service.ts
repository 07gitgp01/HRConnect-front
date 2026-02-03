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

  // ===== MÉTHODE MANQUANTE =====
  getVolontairesDisponibles(): Observable<Volontaire[]> {
    return this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires`).pipe(
      map(volontaires => {
        // Filtrer les volontaires disponibles (non affectés ou avec statut actif)
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

  // ===== AUTRES MÉTHODES MANQUANTES =====
  getAllProjectsWithStats(): Observable<any> {
    return this.getProjects().pipe(
      switchMap(projects => {
        const projectsWithStats = projects.map(project => 
          this.getCandidaturesByProject(project.id!).pipe(
            map(candidatures => ({
              ...project,
              stats: {
                candidatures: candidatures.length,
                volontairesAffectes: project.nombreVolontairesActuels || 0,
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
    // Implémentation selon vos besoins
  }

  // ===== MÉTHODES EXISTANTES =====
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
      statutProjet: 'en_attente' as ProjectStatus, // ✅ CHANGÉ: 'soumis' → 'en_attente'
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

  updateProject(id: number | string, project: Partial<Project>): Observable<Project> {
    const updatedData = {
      ...project,
      updated_at: new Date().toISOString()
    };
    
    return this.http.put<Project>(`${this.apiUrl}/projets/${id}`, updatedData).pipe(
      map(updatedProject => this.normalizeProject(updatedProject))
    );
  }

  deleteProject(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/projets/${id}`);
  }

  // ===== CORRECTION PRINCIPALE : changerStatutProjet améliorée =====
  changerStatutProjet(id: number | string, nouveauStatut: ProjectStatus): Observable<Project> {
    return this.getProject(id).pipe(
      take(1),
      switchMap(project => {
        // DEBUG: Afficher l'état actuel et le nouvel état
        console.log(`🔄 Transition de statut pour projet ${id}:`, {
          actuel: project.statutProjet,
          nouveau: nouveauStatut,
          peutChanger: ProjectWorkflow.canChangeStatus(project.statutProjet, nouveauStatut)
        });

        if (!ProjectWorkflow.canChangeStatus(project.statutProjet, nouveauStatut)) {
          const erreur = new Error(`Transition de statut non autorisée: ${project.statutProjet} → ${nouveauStatut}`);
          console.error('❌', erreur.message);
          
          // Afficher les transitions possibles pour debug
          const transitionsPossibles = ProjectWorkflow.getPossibleTransitions(project.statutProjet);
          console.log('📋 Transitions possibles depuis', project.statutProjet, ':', transitionsPossibles);
          
          throw erreur;
        }

        const updates: Partial<Project> = {
          statutProjet: nouveauStatut,
          updated_at: new Date().toISOString()
        };

        // Ajouter la date de publication si on passe à 'actif'
        if (nouveauStatut === 'actif' && !project.datePublication) {
          updates.datePublication = new Date().toISOString();
        }

        // Ajouter la date de clôture si on passe à 'cloture'
        if (nouveauStatut === 'cloture') {
          updates.dateCloture = new Date().toISOString();
        }

        return this.updateProject(id, updates);
      }),
      catchError(error => {
        console.error(`❌ Erreur changement statut projet ${id}:`, error);
        throw error;
      })
    );
  }

  validerProjet(id: number | string): Observable<Project> {
    return this.changerStatutProjet(id, 'actif'); // ✅ CHANGÉ: 'ouvert_aux_candidatures' → 'actif'
  }

  // ===== CORRECTION : cloturerProjet améliorée =====
  cloturerProjet(id: number | string): Observable<Project> {
    return this.changerStatutProjet(id, 'cloture').pipe(
      catchError(error => {
        console.error(`❌ Erreur clôture directe projet ${id}:`, error);
        
        // Si la transition directe vers 'cloture' échoue
        if (error.message.includes('Transition de statut non autorisée')) {
          console.log(`ℹ️ Transition directe impossible, statut actuel doit être vérifié`);
          return this.getProject(id).pipe(
            take(1),
            switchMap(project => {
              console.log(`📋 Statut actuel du projet: ${project.statutProjet}`);
              // Si le projet est 'en_attente', on peut le clôturer directement
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
    // Avec les statuts simplifiés, pas de "mettre en cours" séparé
    // Le projet est soit 'actif' (peut être en cours ou en recrutement)
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
            volontaire: volontaire || {
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
            nombreVolontairesActuels: (project.nombreVolontairesActuels || 0) + 1
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
            nombreVolontairesActuels: Math.max(0, (project.nombreVolontairesActuels || 0) - 1)
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
            total + (projet.nombreVolontairesActuels || 0), 0
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
        projet.statutProjet === 'actif' // ✅ CHANGÉ: 'ouvert_aux_candidatures' → 'actif'
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
        projet.statutProjet === 'en_attente' // ✅ CHANGÉ: 'en_attente_validation' → 'en_attente'
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

  private normalizeProject(project: any): Project {
    return {
      id: project.id,
      titre: project.titre || project.title || 'Titre non défini',
      partenaireId: project.partenaireId,
      
      descriptionLongue: project.descriptionLongue || project.description || 'Description non disponible',
      descriptionCourte: project.descriptionCourte || project.description?.substring(0, 150) + '...' || 'Description courte non disponible',
      domaineActivite: project.domaineActivite || project.domain || 'Non spécifié',
      competences_requises: project.competences_requises || project.requiredSkills,
      type_mission: project.type_mission || project.missionType,
      
      regionAffectation: project.regionAffectation || project.region || 'Non spécifiée',
      ville_commune: project.ville_commune || project.city || 'Non spécifiée',
      
      nombreVolontairesRequis: project.nombreVolontairesRequis || project.neededVolunteers || 1,
      nombreVolontairesActuels: project.nombreVolontairesActuels || project.volontairesAffectes || 0,
      avantagesVolontaire: project.avantagesVolontaire || project.volunteerBenefits,
      
      dateDebut: project.dateDebut || project.startDate,
      dateFin: project.dateFin || project.endDate,
      dateLimiteCandidature: project.dateLimiteCandidature || project.applicationDeadline,
      datePublication: project.datePublication || project.publishedDate,
      
      statutProjet: this.normalizeStatut(project.statutProjet || project.status),
      conditions_particulieres: project.conditions_particulieres || project.specialConditions,
      
      contact_responsable: project.contact_responsable || project.contactPerson,
      email_contact: project.email_contact || project.contactEmail,
      
      created_at: project.created_at || project.createdAt,
      updated_at: project.updated_at || project.updatedAt,
      partenaire: project.partenaire || project.partner,
      dateCloture: project.dateCloture
    };
  }

  private normalizeStatut(statut: any): ProjectStatus {
    if (!statut) return 'en_attente'; // ✅ CHANGÉ: 'soumis' → 'en_attente'
    
    const statutStr = statut.toString().toLowerCase();
    
    // ✅ MAPPING MIS À JOUR pour les nouveaux statuts
    const mapping: { [key: string]: ProjectStatus } = {
      // Nouveaux statuts
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
      
      // Anciens statuts pour compatibilité
      'soumis': 'en_attente',
      'submitted': 'en_attente',
      'en_attente_validation': 'en_attente',
      'pending_validation': 'en_attente',
      'ouvert_aux_candidatures': 'actif',
      'open_for_applications': 'actif',
      'en_cours': 'actif',
      'in_progress': 'actif'
    };
    
    return mapping[statutStr] || 'en_attente';
  }

  // ===== CORRECTION : verifierEcheancesProjets améliorée =====
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
      
      // Ne pas vérifier les projets déjà clôturés
      if (projet.statutProjet === 'cloture') {
        return null;
      }

      if (dateEcheance < aujourdhui) {
        // Projet en retard
        if (projet.statutProjet === 'actif') {
          // Un projet actif qui dépasse la date de fin peut être clôturé
          try {
            await this.cloturerProjet(projet.id).toPromise();
            return `⚠️ Le projet "${projet.titre}" a été clôturé (échéance dépassée)`;
          } catch (error) {
            return `ℹ️ Le projet "${projet.titre}" est en retard mais ne peut être clôturé`;
          }
        } else if (projet.statutProjet === 'en_attente') {
          // Un projet en attente qui dépasse la date de fin peut être clôturé
          try {
            await this.cloturerProjet(projet.id).toPromise();
            return `⚠️ Le projet "${projet.titre}" a été clôturé (échéance dépassée avant validation)`;
          } catch (error) {
            return `ℹ️ Le projet "${projet.titre}" est en retard (en attente de validation)`;
          }
        } else {
          // Pour les autres statuts, juste informer
          return `ℹ️ Le projet "${projet.titre}" est en retard (statut: ${ProjectWorkflow.getStatusLabel(projet.statutProjet)})`;
        }
      }

      // Vérifier les échéances proches
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

  // ===== MÉTHODES POUR L'INTERFACE UTILISATEUR =====
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
}