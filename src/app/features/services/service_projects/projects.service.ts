import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin, BehaviorSubject, interval, Subscription, throwError } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { Project, ProjectStatus, ProjectWorkflow } from '../../models/projects.model';
import { Volontaire } from '../../models/volontaire.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../service_auth/auth.service';
import { AffectationService, Affectation } from '../service-affecta/affectation.service';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService implements OnDestroy {
  // ✅ Utilisation de environment.apiUrl
  private apiUrl = environment.apiUrl;
  private notificationSubject = new BehaviorSubject<string[]>([]);
  private isAdminUser = false;
  private monitoringSubscription: Subscription | null = null;
  private userSubscription: Subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private affectationService: AffectationService
  ) {
    console.log('📡 ProjectService initialisé avec API URL:', this.apiUrl);
    this.initializeService();
  }

  ngOnDestroy(): void {
    this.stopEcheanceMonitoring();
    if (this.userSubscription) this.userSubscription.unsubscribe();
  }

  // ==================== CRUD DE BASE ====================

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projets`).pipe(
      map(projects => this.normalizeProjects(projects)),
      catchError(error => {
        console.error('❌ Erreur chargement projets:', error);
        return of([]);
      })
    );
  }

  getProject(id: number | string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/projets/${id}`).pipe(
      map(project => this.normalizeProject(project)),
      catchError(error => {
        console.error(`❌ Erreur chargement projet ${id}:`, error);
        throw error;
      })
    );
  }

  getProjectById(id: number | string): Observable<Project> {
    return this.getProject(id);
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
      map(p => this.normalizeProject(p)),
      catchError(error => { console.error('❌ Erreur création projet:', error); throw error; })
    );
  }

  /**
   * PUT complet — utilisé uniquement pour les mises à jour métier complètes
   */
  updateProject(id: number | string, project: Partial<Project>): Observable<Project> {
    const updatedData = { ...project, updated_at: project.updated_at ?? new Date().toISOString() };
    return this.http.put<Project>(`${this.apiUrl}/projets/${id}`, updatedData).pipe(
      map(p => this.normalizeProject(p)),
      catchError(error => { console.error(`❌ Erreur mise à jour projet ${id}:`, error); throw error; })
    );
  }

  /**
   * ✅ PATCH partiel — utilisé pour mettre à jour UN ou QUELQUES champs
   */
  private patchProject(id: number | string, patch: Partial<Project>): Observable<Project> {
    return this.http.patch<Project>(`${this.apiUrl}/projets/${id}`, {
      ...patch,
      updated_at: new Date().toISOString()
    }).pipe(
      map(p => this.normalizeProject(p)),
      catchError(error => {
        console.error(`❌ Erreur PATCH projet ${id}:`, error);
        throw error;
      })
    );
  }

  deleteProject(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/projets/${id}`).pipe(
      catchError(error => { console.error(`❌ Erreur suppression projet ${id}:`, error); throw error; })
    );
  }

  // ==================== NORMALISATION ====================

  private normalizeProject(project: any): Project {
    const normalized: Project = {
      id:           project.id,
      titre:        project.titre ?? project.title ?? '',
      partenaireId: project.partenaireId,

      descriptionLongue: project.descriptionLongue ?? project.description ?? '',
      descriptionCourte: project.descriptionCourte ??
                         (project.description?.substring(0, 150)) ??
                         (project.descriptionLongue?.substring(0, 150)) ?? '',

      domaineActivite:      project.domaineActivite      ?? project.domain          ?? '',
      competences_requises: project.competences_requises ?? project.requiredSkills   ?? '',
      type_mission:         project.type_mission         ?? project.missionType      ?? undefined,

      regionAffectation: project.regionAffectation ?? project.region ?? '',
      ville_commune:     project.ville_commune     ?? project.city   ?? '',

      nombreVolontairesRequis:  project.nombreVolontairesRequis  ?? project.neededVolunteers   ?? 0,
      nombreVolontairesActuels: project.nombreVolontairesActuels ?? project.volontairesAffectes ?? 0,
      avantagesVolontaire:      project.avantagesVolontaire      ?? project.volunteerBenefits   ?? '',

      dateDebut:              project.dateDebut              ?? project.startDate,
      dateFin:                project.dateFin                ?? project.endDate,
      dateLimiteCandidature:  project.dateLimiteCandidature  ?? project.applicationDeadline,
      datePublication:        project.datePublication        ?? project.publishedDate,
      dateCloture:            project.dateCloture,

      statutProjet: this.normalizeStatut(project.statutProjet ?? project.status),

      conditions_particulieres: project.conditions_particulieres ?? project.specialConditions ?? '',
      contact_responsable:      project.contact_responsable      ?? project.contactPerson      ?? '',
      email_contact:            project.email_contact            ?? project.contactEmail        ?? '',

      created_at: project.created_at ?? project.createdAt,
      updated_at: project.updated_at ?? project.updatedAt,
      partenaire: project.partenaire ?? project.partner
    };
    return normalized;
  }

  private normalizeProjects(projects: any[]): Project[] {
    return projects.map(p => this.normalizeProject(p));
  }

  private normalizeStatut(statut: any): ProjectStatus {
    if (!statut) return 'en_attente';
    const s = statut.toString().toLowerCase();
    const mapping: { [key: string]: ProjectStatus } = {
      'en_attente': 'en_attente', 'en attente': 'en_attente', 'waiting': 'en_attente', 'pending': 'en_attente',
      'actif': 'actif', 'active': 'actif', 'ouvert': 'actif', 'open': 'actif',
      'cloture': 'cloture', 'closed': 'cloture', 'completed': 'cloture', 'termine': 'cloture',
      'soumis': 'en_attente', 'submitted': 'en_attente', 'en_attente_validation': 'en_attente',
      'ouvert_aux_candidatures': 'actif', 'en_cours': 'actif', 'in_progress': 'actif'
    };
    return mapping[s] ?? 'en_attente';
  }

  // ==================== GESTION DES STATUTS ====================

  changerStatutProjet(id: number | string, nouveauStatut: ProjectStatus): Observable<Project> {
    return this.getProject(id).pipe(
      take(1),
      switchMap(originalProject => {
        if (!ProjectWorkflow.canChangeStatus(originalProject.statutProjet, nouveauStatut)) {
          return throwError(() =>
            new Error(`Transition non autorisée: ${originalProject.statutProjet} → ${nouveauStatut}`)
          );
        }

        const updates: Partial<Project> = { statutProjet: nouveauStatut };
        if (nouveauStatut === 'actif' && !originalProject.datePublication)
          updates.datePublication = new Date().toISOString();
        if (nouveauStatut === 'cloture')
          updates.dateCloture = new Date().toISOString();

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
            return this.updateProject(id, projectToUpdate).pipe(
              switchMap(() => this.getProject(id)),
              catchError(() => of(originalProject))
            );
          })
        );
      }),
      catchError(error => { console.error(`❌ Erreur changerStatut projet ${id}:`, error); throw error; })
    );
  }

  soumettrePourValidation(id: number | string): Observable<Project> { return this.changerStatutProjet(id, 'en_attente'); }
  validerProjet(id: number | string):           Observable<Project> { return this.changerStatutProjet(id, 'actif'); }

  cloturerProjet(id: number | string): Observable<Project> {
    return this.changerStatutProjet(id, 'cloture').pipe(
      catchError(error => {
        if (error.message?.includes('Transition non autorisée')) {
          return this.getProject(id).pipe(
            take(1),
            switchMap(project => {
              if (project.statutProjet === 'en_attente') return this.changerStatutProjet(id, 'cloture');
              throw error;
            })
          );
        }
        throw error;
      })
    );
  }

  mettreEnCoursProjet(id: number | string): Observable<Project> { return this.changerStatutProjet(id, 'actif'); }

  // ==================== GESTION DES VOLONTAIRES ====================

  getVolontairesDisponibles(): Observable<Volontaire[]> {
    return this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires`).pipe(
      map(vols => vols.filter(v => v.statut === 'Actif' || v.statut === 'En attente')),
      catchError(() => of([]))
    );
  }

  getVolontairesByProject(projectId: number | string): Observable<any[]> {
    return forkJoin({
      affectations: this.http.get<any[]>(`${this.apiUrl}/affectations?projectId=${projectId}`).pipe(catchError(() => of([]))),
      volontaires:  this.http.get<any[]>(`${this.apiUrl}/volontaires`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ affectations, volontaires }) =>
        affectations.map(a => {
          const vol = volontaires.find(v => String(v.id) === String(a.volontaireId));
          return {
            id: a.id,
            volontaire: vol ?? { id: a.volontaireId, prenom: 'Volontaire', nom: `#${a.volontaireId}`, email: '', competences: [] },
            dateAffectation: a.dateAffectation,
            statut: a.statut
          };
        })
      )
    );
  }

  /**
   * ✅ Délègue à AffectationService.createAffectation() qui gère maintenant la vérification d'unicité.
   */
  affecterVolontaire(projectId: number | string, volontaireId: number | string): Observable<any> {
  return this.getProject(projectId).pipe(
    take(1),
    switchMap(project => {
      // ✅ Convertir les IDs en string avant de les passer à AffectationService
      const stringProjectId = String(projectId);
      const stringVolontaireId = String(volontaireId);
      
      return this.affectationService.createAffectation({
        volontaireId: stringVolontaireId,
        projectId: stringProjectId,
        dateAffectation: new Date().toISOString().split('T')[0],
        statut: 'active',
        role: 'Volontaire',
      }).pipe(
        switchMap(affectation =>
          this.patchProject(projectId, {
            nombreVolontairesActuels: (project.nombreVolontairesActuels ?? 0) + 1
          }).pipe(
            map(() => affectation)
          )
        )
      );
    }),
    catchError(err => {
      console.error('[ProjectService] Erreur affectation:', err);
      return throwError(() => err);
    })
  );
}

  /**
   * ✅ Délègue à AffectationService.terminerAffectation()
   */
 retirerVolontaire(projectId: number | string, volontaireId: number | string): Observable<void> {
  const stringProjectId = String(projectId);
  const stringVolontaireId = String(volontaireId);
  
  return this.affectationService.getAffectationsByProject(stringProjectId).pipe(
    take(1),
    switchMap((affectations: Affectation[]) => {
      const affActive = affectations.find(
        (a: Affectation) => String(a.volontaireId) === stringVolontaireId && a.statut === 'active'
      );
      if (!affActive || !affActive.id) {
        return throwError(() => new Error('Affectation active introuvable'));
      }
      return this.affectationService.terminerAffectation(affActive.id, stringVolontaireId);
    }),
    switchMap(() =>
      this.getProject(projectId).pipe(
        take(1),
        switchMap(project =>
          this.patchProject(projectId, {
            nombreVolontairesActuels: Math.max(0, (project.nombreVolontairesActuels ?? 1) - 1)
          })
        )
      )
    ),
    map(() => void 0),
    catchError(error => {
      console.error(`❌ Erreur retirerVolontaire (projet ${projectId}, volontaire ${volontaireId}):`, error);
      throw error;
    })
  );
}

  // ==================== CANDIDATURES ====================

  getCandidaturesByProject(projectId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/candidatures?projectId=${projectId}`).pipe(
      catchError(() => of([]))
    );
  }

  // ==================== PARTENAIRES ====================

  getProjetsByPartenaire(partenaireId: string | number): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projets?partenaireId=${String(partenaireId)}`).pipe(
      map(p => this.normalizeProjects(p)),
      catchError(() => of([]))
    );
  }

  getStatsByPartenaire(partenaireId: string | number): Observable<any> {
    return this.getProjetsByPartenaire(partenaireId).pipe(
      map(projets => ({
        total:               projets.length,
        en_attente:          projets.filter(p => p.statutProjet === 'en_attente').length,
        actifs:              projets.filter(p => p.statutProjet === 'actif').length,
        clotures:            projets.filter(p => p.statutProjet === 'cloture').length,
        volontairesAffectes: projets.reduce((t, p) => t + (p.nombreVolontairesActuels ?? 0), 0)
      }))
    );
  }

  getStatistiquesPartenaire(partenaireId: string | number): Observable<any> {
    return forkJoin({
      projets:       this.getProjetsByPartenaire(partenaireId),
      candidatures:  this.http.get<any[]>(`${this.apiUrl}/candidatures`)
    }).pipe(
      map(({ projets, candidatures }) => {
        const projetIds = projets.map(p => String(p.id)).filter(Boolean);
        const candPartenaire = candidatures.filter(c => projetIds.includes(String(c.projectId)));
        return {
          totalProjets:          projets.length,
          projetsActifs:         projets.filter(p => p.statutProjet === 'actif').length,
          projetsEnAttente:      projets.filter(p => p.statutProjet === 'en_attente').length,
          projetsTermines:       projets.filter(p => p.statutProjet === 'cloture').length,
          volontairesAffectes:   projets.reduce((s, p) => s + (p.nombreVolontairesActuels ?? 0), 0),
          candidatures:          candPartenaire.length,
          nouvellesCandidatures: candPartenaire.filter(c => c.statut === 'en_attente' && this.isRecent(c.cree_le)).length
        };
      }),
      catchError(() => of({ totalProjets:0, projetsActifs:0, projetsEnAttente:0, projetsTermines:0, volontairesAffectes:0, candidatures:0, nouvellesCandidatures:0 }))
    );
  }

  peutCreerProjet(partenaireId: string | number): Observable<boolean> {
    return this.getProjetsByPartenaire(partenaireId).pipe(
      map(projets => projets.filter(p => p.statutProjet === 'en_attente' || p.statutProjet === 'actif').length < 10),
      catchError(() => of(true))
    );
  }

  // ==================== MÉTHODES PUBLIQUES ====================

  getProjetsPublic(): Observable<Project[]> {
    return this.getProjects().pipe(map(p => p.filter(x => x.statutProjet === 'actif')), catchError(() => of([])));
  }

  getProjetsEnAttenteValidation(): Observable<Project[]> {
    return this.getProjects().pipe(map(p => p.filter(x => x.statutProjet === 'en_attente')), catchError(() => of([])));
  }

  getProjetsEligiblesPourCandidature(): Observable<Project[]> {
    return this.getProjects().pipe(map(p => p.filter(x => ProjectWorkflow.canAcceptApplications(x.statutProjet))));
  }

  canApplyToProject(project: Project): boolean {
    return ProjectWorkflow.canAcceptApplications(project.statutProjet);
  }

  // ==================== STATISTIQUES ====================

  getAllProjectsWithStats(): Observable<any> {
    return this.getProjects().pipe(
      switchMap(projects =>
        forkJoin(projects.map(project =>
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
        ))
      ),
      catchError(() => of([]))
    );
  }

  getStatistiquesEcheances(): Observable<any> {
    return this.getProjects().pipe(
      map(projects => {
        const aujourd = new Date();
        return {
          projetsEnRetard:  projects.filter(p => p.dateFin && new Date(p.dateFin) < aujourd && p.statutProjet !== 'cloture').length,
          projetsAEcheance: projects.filter(p => p.dateFin && this.getDaysUntil(new Date(p.dateFin)) <= 3 && p.statutProjet !== 'cloture').length,
          totalProjets:     projects.length
        };
      })
    );
  }

  // ==================== SURVEILLANCE DES ÉCHÉANCES ====================

  private initializeService(): void {
    this.checkAdminStatus();
    if (this.isAdminUser) this.startEcheanceMonitoring();

    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      const wasAdmin = this.isAdminUser;
      this.checkAdminStatus();
      if (!user || !this.isAdminUser) { this.stopEcheanceMonitoring(); this.clearEcheanceNotifications(); }
      if (user && this.isAdminUser && !wasAdmin) this.startEcheanceMonitoring();
    });
  }

  private checkAdminStatus(): void { this.isAdminUser = this.authService.isAdmin(); }

  private startEcheanceMonitoring(): void {
    if (!this.isAdminUser) return;
    this.stopEcheanceMonitoring();
    this.verifierEcheancesProjets();
    this.monitoringSubscription = interval(60000).subscribe(() => {
      if (this.isAdminUser && this.authService.isAdmin()) this.verifierEcheancesProjets();
      else this.stopEcheanceMonitoring();
    });
  }

  private stopEcheanceMonitoring(): void {
    if (this.monitoringSubscription) { this.monitoringSubscription.unsubscribe(); this.monitoringSubscription = null; }
  }

  clearEcheanceNotifications(): void { this.notificationSubject.next([]); }

  private async verifierEcheancesProjets(): Promise<void> {
    if (!this.isAdminUser || !this.authService.isAdmin()) return;
    try {
      const projets = await this.getProjects().toPromise();
      if (!projets) return;
      const aujourd = new Date(); aujourd.setHours(0, 0, 0, 0);
      const notifications: string[] = [];
      for (const projet of projets) {
        const r = await this.verifierProjetEcheance(projet, aujourd);
        if (r) notifications.push(r);
      }
      if (notifications.length > 0) this.notifierAdmin(notifications);
    } catch (error) { console.error('❌ Erreur vérification échéances:', error); }
  }

  private async verifierProjetEcheance(projet: Project, aujourd: Date): Promise<string | null> {
    if (!projet.dateFin || !projet.id || projet.statutProjet === 'cloture') return null;
    try {
      const echeance = new Date(projet.dateFin); echeance.setHours(0, 0, 0, 0);
      if (echeance < aujourd) {
        try {
          await this.cloturerProjet(projet.id).toPromise();
          return `⚠️ Le projet "${projet.titre}" a été clôturé (échéance dépassée)`;
        } catch { return `ℹ️ Le projet "${projet.titre}" est en retard`; }
      }
      if (echeance.getTime() === aujourd.getTime()) return `🔔 Le projet "${projet.titre}" arrive à échéance aujourd'hui`;
      const dans3 = new Date(aujourd); dans3.setDate(aujourd.getDate() + 3);
      if (echeance.getTime() === dans3.getTime()) return `📅 Le projet "${projet.titre}" arrive à échéance dans 3 jours`;
      return null;
    } catch { return null; }
  }

  private notifierAdmin(notifications: string[]): void {
    if (!this.isAdminUser || !this.authService.isAdmin()) return;
    this.notificationSubject.next(notifications);
    const urgentes = notifications.filter(n => n.includes('⚠️') || n.includes("aujourd'hui"));
    if (urgentes.length > 0) {
      this.snackBar.open(
        urgentes.length === 1 ? urgentes[0] : `${urgentes.length} alertes d'échéance urgentes`,
        'Voir les projets', { duration: 10000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['echeance-snackbar'] }
      ).onAction().subscribe(() => { window.location.href = '/features/admin/projets'; });
    }
  }

  getEcheanceNotifications(): Observable<string[]> {
    if (!this.authService.isAdmin() || !this.isAdminUser) return of([]);
    return this.notificationSubject.asObservable();
  }

  verifierEcheancesManuellement(): Promise<void> {
    if (!this.authService.isAdmin() || !this.isAdminUser) return Promise.resolve();
    return this.verifierEcheancesProjets();
  }

  updateAdminStatus(): void {}

  // ==================== UTILITAIRES ====================

  private isRecent(dateString: string): boolean {
    if (!dateString) return false;
    try { return (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24) <= 7; }
    catch { return false; }
  }

  private getDaysUntil(date: Date): number {
    return Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  diagnostiquerProjet(id: number | string): void {
    this.http.get<any>(`${this.apiUrl}/projets/${id}`).subscribe({
      next: (raw) => { console.log('🔍 Données brutes:', raw); console.log('🔍 Normalisé:', this.normalizeProject(raw)); },
      error: (err) => console.error('❌ Erreur diagnostic:', err)
    });
  }
}