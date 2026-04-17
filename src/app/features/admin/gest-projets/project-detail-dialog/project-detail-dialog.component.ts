// src/app/features/admin/gest-projets/project-detail-dialog/project-detail-dialog.component.ts
import { Component, Inject, OnInit, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatOptionModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, switchMap, catchError, map } from 'rxjs';

import { Project, ProjectStatus, ProjectWorkflow } from '../../../models/projects.model';
import { ProjectService } from '../../../services/service_projects/projects.service';
import { CandidatureService } from '../../../services/service_candi/candidature.service';
import { AffectationService } from '../../../services/service-affecta/affectation.service';
import { PartenaireService } from '../../../services/service_parten/partenaire.service';
import { Partenaire } from '../../../models/partenaire.model';
import { Volontaire } from '../../../models/volontaire.model';
import { Candidature } from '../../../models/candidature.model';

interface AffectationView {
  id: string | number;
  volontaireId: string | number;
  volontaire: Volontaire;
  dateAffectation?: string;
  dateFin?: string;
  statut?: string;
  /** ✅ Marqué automatiquement si dateFin projet dépassée */
  missionExpiree?: boolean;
}

interface CandidatAccepte {
  candidature: Candidature;
  dejaAffecte: boolean;
}

@Component({
  selector: 'app-project-detail-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatCardModule, MatDividerModule, MatTabsModule, MatChipsModule, MatListModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatSelectModule, MatOptionModule,
    MatFormFieldModule, MatTooltipModule
  ],
  templateUrl: './project-detail-dialog.component.html',
  styleUrls: ['./project-detail-dialog.component.css']
})
export class ProjectDetailDialogComponent implements OnInit, AfterViewInit {
  private apiUrl = 'http://localhost:3000';

  candidatures: any[] = [];
  volontairesAffectes: AffectationView[] = [];
  candidatsAcceptes: CandidatAccepte[] = [];
  partenaires: Partenaire[] = [];

  candidatAccepteSelectionne: string | null = null;

  isLoadingCandidatures      = false;
  isLoadingVolontaires       = false;
  isLoadingCandidatsAcceptes = false;
  isLoadingPartenaires       = false;

  /** ✅ Vrai si la dateFin du projet est dépassée */
  projetExpire = false;
  /** ✅ Nombre de volontaires en fin de mission détectés automatiquement */
  nbMissionsExpirees = 0;

  constructor(
    public  dialogRef: MatDialogRef<ProjectDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { project: Project },
    private projectService: ProjectService,
    private candidatureService: CandidatureService,
    private affectationService: AffectationService,
    private partenaireService: PartenaireService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.detecterProjetExpire();
    this.loadPartenaires();
    this.loadCandidatures();
    this.loadVolontairesAffectes();
    this.loadCandidatsAcceptes();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const el = this.elementRef.nativeElement.querySelector('.mat-mdc-dialog-surface');
      if (el) el.setAttribute('aria-modal', 'true');
    });
  }

  // ═══════════════════════════════════════════════════
  // DÉTECTION AUTOMATIQUE FIN DE MISSION
  // ═══════════════════════════════════════════════════

  /**
   * ✅ Vérifie si la dateFin du projet est dépassée.
   * Si oui, affiche une bannière et propose de terminer toutes les missions.
   */
  private detecterProjetExpire(): void {
    const dateFin = this.data.project.dateFin;
    if (!dateFin) return;

    const maintenant = new Date();
    const fin        = new Date(dateFin);
    this.projetExpire = maintenant > fin;

    if (this.projetExpire) {
      console.log(`⚠️ Projet #${this.data.project.id} : dateFin dépassée (${dateFin}) → missions potentiellement expirées`);
    }
  }

  // ═══════════════════════════════════════════════════
  // CHARGEMENT
  // ═══════════════════════════════════════════════════

  loadPartenaires(): void {
    this.isLoadingPartenaires = true;
    this.partenaireService.getAll().subscribe({
      next:  (p: Partenaire[]) => { this.partenaires = p || []; this.isLoadingPartenaires = false; },
      error: ()                 => { this.partenaires = [];       this.isLoadingPartenaires = false; }
    });
  }

  loadCandidatures(): void {
    this.isLoadingCandidatures = true;
    const id = this.data.project.id;
    if (!id) { this.candidatures = []; this.isLoadingCandidatures = false; return; }

    this.projectService.getCandidaturesByProject(id).subscribe({
      next:  (c: any[]) => { this.candidatures = c || []; this.isLoadingCandidatures = false; },
      error: ()         => { this.candidatures = [];       this.isLoadingCandidatures = false; }
    });
  }

  loadVolontairesAffectes(): void {
    this.isLoadingVolontaires = true;
    const projectId = this.data.project.id;
    if (!projectId) { this.volontairesAffectes = []; this.isLoadingVolontaires = false; return; }

    forkJoin({
      affectations: this.http.get<any[]>(
        `${this.apiUrl}/affectations?projectId=${projectId}`
      ).pipe(catchError(() => of([]))),
      volontaires: this.http.get<Volontaire[]>(
        `${this.apiUrl}/volontaires`
      ).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ affectations, volontaires }) => {
        this.volontairesAffectes = affectations.map((a: any) => {
          const vol = volontaires.find((v: Volontaire) => String(v.id) === String(a.volontaireId));
          return {
            id:              a.id,
            volontaireId:    a.volontaireId,
            dateAffectation: a.dateAffectation,
            dateFin:         a.dateFin,
            statut:          a.statut,
            missionExpiree:  this.projetExpire && a.statut === 'active',
            volontaire: vol ?? ({
              id: a.volontaireId, prenom: 'Volontaire',
              nom: `#${a.volontaireId}`, email: '', competences: []
            } as unknown as Volontaire)
          };
        });

        this.nbMissionsExpirees = this.volontairesAffectes.filter(v => v.missionExpiree).length;
        this.syncCompteurProjet(affectations.filter(a => a.statut === 'active').length);
        this.isLoadingVolontaires = false;
      },
      error: () => { this.volontairesAffectes = []; this.isLoadingVolontaires = false; }
    });
  }

  loadCandidatsAcceptes(): void {
    const projectId = this.data.project.id;
    if (!projectId) { this.candidatsAcceptes = []; return; }

    this.isLoadingCandidatsAcceptes = true;
    forkJoin({
      candidaturesAcceptees: this.candidatureService.getByProject(projectId).pipe(
        map((list: Candidature[]) => list.filter((c: Candidature) => c.statut === 'acceptee'))
      ),
      affectationsActives: this.affectationService.getAffectationsActivesByProject(projectId)
    }).subscribe({
      next: ({ candidaturesAcceptees, affectationsActives }) => {
        this.candidatsAcceptes = candidaturesAcceptees.map((c: Candidature) => ({
          candidature: c,
          dejaAffecte: affectationsActives.some(
            (a: any) => String(a.volontaireId) === String(c.volontaireId)
          )
        }));
        this.isLoadingCandidatsAcceptes = false;
      },
      error: () => { this.candidatsAcceptes = []; this.isLoadingCandidatsAcceptes = false; }
    });
  }

  // ═══════════════════════════════════════════════════
  // TERMINER UNE MISSION (manuel — un seul volontaire)
  // ═══════════════════════════════════════════════════

  terminerMission(affectationId: string | number, nomVolontaire: string): void {
    if (!confirm(`Confirmer la fin de mission pour ${nomVolontaire} ?\nSon statut reviendra à "En attente" s'il n'a plus d'autres missions actives.`)) {
      return;
    }

    console.log(`🏁 Fin de mission manuelle — affectation #${affectationId}`);

    this.affectationService.terminerAffectation(affectationId).subscribe({
      next: () => {
        this.patchCompteurProjet(this.data.project.id!, -1);
        this.snackBar.open(
          `Mission de ${nomVolontaire} terminée — statut remis à "En attente" si aucune autre mission active`,
          'Fermer',
          { duration: 5000 }
        );
        setTimeout(() => this.rechargerTout(), 150);
      },
      error: (err: unknown) => {
        console.error('❌ Erreur fin de mission:', err);
        this.snackBar.open('Erreur lors de la fin de mission', 'Fermer', { duration: 3000 });
      }
    });
  }

  // ═══════════════════════════════════════════════════
  // TERMINER TOUTES LES MISSIONS (automatique — projet expiré)
  // ═══════════════════════════════════════════════════

  terminerToutesLesMissions(): void {
    const dateFin   = this.data.project.dateFin;
    const projectId = this.data.project.id;
    if (!dateFin || !projectId) return;

    const nb = this.volontairesAffectes.length;
    if (!confirm(
      `Terminer automatiquement les ${nb} mission(s) active(s) de ce projet ?\n` +
      `Chaque volontaire concerné reviendra à "En attente" s'il n'a plus d'autres missions.`
    )) return;

    console.log(`🤖 Fin de missions automatique — projet #${projectId}, dateFin dépassée (${dateFin})`);

    this.affectationService.terminerAffectationsExpirees(projectId, dateFin).subscribe({
      next: (nbTerminees: number) => {
        if (nbTerminees > 0) {
          this.patchCompteurProjet(projectId, -nbTerminees);
          this.snackBar.open(
            `${nbTerminees} mission(s) terminée(s) automatiquement. Les volontaires sont repassés à "En attente".`,
            'Fermer',
            { duration: 6000 }
          );
        } else {
          this.snackBar.open('Aucune affectation active à terminer.', 'Fermer', { duration: 3000 });
        }
        this.nbMissionsExpirees = 0;
        setTimeout(() => this.rechargerTout(), 150);
      },
      error: (err: unknown) => {
        console.error('❌ Erreur fin de missions automatique:', err);
        this.snackBar.open('Erreur lors de la fin des missions', 'Fermer', { duration: 3000 });
      }
    });
  }

  // ═══════════════════════════════════════════════════
  // UTILITAIRES TEMPLATE
  // ═══════════════════════════════════════════════════

  get candidatsDisponiblesForAffectation(): CandidatAccepte[] {
    return this.candidatsAcceptes.filter(c => !c.dejaAffecte);
  }

  getVolontairesManquants(): number {
    return Math.max(0, this.getNeededVolunteers() - this.volontairesAffectes.length);
  }

  getNeededVolunteers():  number { return this.data.project.nombreVolontairesRequis  || 0; }
  getCurrentVolunteers(): number { return this.data.project.nombreVolontairesActuels || 0; }

  getPartenaireNom(partenaireId?: number | string): string {
    if (!partenaireId) return 'Non spécifié';
    if (this.data.project.partenaire) {
      if (typeof this.data.project.partenaire === 'string') return this.data.project.partenaire;
      if (typeof this.data.project.partenaire === 'object')
        return (this.data.project.partenaire as any).nomStructure || `Partenaire #${partenaireId}`;
    }
    const p = this.partenaires.find(x => String(x.id) === String(partenaireId));
    return p ? p.nomStructure : `Partenaire #${partenaireId}`;
  }

  getStatusIcon(status?: ProjectStatus): string {
    switch (status || this.data.project.statutProjet) {
      case 'en_attente': return 'schedule';
      case 'actif':      return 'play_circle';
      case 'cloture':    return 'check_circle';
      default:           return 'help';
    }
  }

  getStatusLabel(status?: ProjectStatus): string {
    return ProjectWorkflow.getStatusLabel(status || this.data.project.statutProjet);
  }

  getProjectTitle():       string { return this.data.project.titre             || 'Titre non disponible'; }
  getProjectDescription(): string { return this.data.project.descriptionLongue || this.data.project.descriptionCourte || 'Aucune description'; }
  getProjectRegion():      string { return this.data.project.regionAffectation || 'Non spécifiée'; }

  getFormattedDate(d?: string | null): string {
    if (!d) return 'Non définie';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return 'Date invalide'; }
  }

  getStartDate(): string { return this.getFormattedDate(this.data.project.dateDebut); }
  getEndDate():   string { return this.getFormattedDate(this.data.project.dateFin);   }

  getCompetencesText(competences?: string[] | string): string {
    if (!competences) return 'Aucune';
    if (Array.isArray(competences)) return competences.length > 0 ? competences.join(', ') : 'Aucune';
    return competences;
  }

  getProjectCompetences(): string[] {
    const c = this.data.project.competences_requises;
    if (!c) return [];
    if (Array.isArray(c)) return c;
    if (typeof c === 'string') return c.split(',').map((x: string) => x.trim()).filter(Boolean);
    return [];
  }

  hasProjectCompetences(): boolean { return this.getProjectCompetences().length > 0; }

  getCandidatureStatutLabel(statut: string): string {
    return ({ en_attente: 'En attente', entretien: 'Entretien', acceptee: 'Acceptée', refusee: 'Refusée' } as any)[statut] || statut;
  }

  // ═══════════════════════════════════════════════════
  // AFFECTATION
  // ═══════════════════════════════════════════════════

  affecterCandidatAccepte(): void {
    if (!this.candidatAccepteSelectionne || !this.data.project.id) {
      this.snackBar.open('Sélectionnez un candidat accepté', 'Fermer', { duration: 3000 });
      return;
    }

    const candidatInfo = this.candidatsAcceptes.find(
      c => String(c.candidature.volontaireId) === String(this.candidatAccepteSelectionne)
    );
    if (!candidatInfo) { this.snackBar.open('Candidat introuvable', 'Fermer', { duration: 3000 }); return; }

    const volontaireId = candidatInfo.candidature.volontaireId;
    const projectId    = this.data.project.id;

    // ✅ FIX : Utilisation de la nouvelle méthode complète qui vérifie l'unicité globale.
    this.affectationService.peutEtreAffecte(volontaireId, projectId).subscribe((peutEtreAffecte: boolean) => {
      if (!peutEtreAffecte) {
        this.snackBar.open(
          'Ce volontaire ne peut pas être affecté : soit il est déjà actif sur une autre mission, soit il est déjà affecté à ce projet.',
          'Fermer',
          { duration: 5000 }
        );
        return;
      }

      this.affectationService.createAffectation({
        volontaireId,
        projectId,
        dateAffectation: new Date().toISOString(),
        statut: 'active',
        role:   candidatInfo.candidature.poste_vise || 'Volontaire',
        notes:  `Affectation depuis candidature acceptée #${candidatInfo.candidature.id}`
      }).subscribe({
        next: () => {
          this.patchCompteurProjet(projectId, +1);
          this.snackBar.open(
            `${candidatInfo.candidature.prenom} ${candidatInfo.candidature.nom} affecté(e) et activé(e) ✔`,
            'Fermer', { duration: 3500 }
          );
          this.candidatAccepteSelectionne = null;
          setTimeout(() => this.rechargerTout(), 150);
        },
        error: (err: unknown) => {
          console.error('❌ Erreur affectation:', err);
          this.snackBar.open('Erreur lors de l\'affectation', 'Fermer', { duration: 3000 });
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════
  // RETRAIT
  // ═══════════════════════════════════════════════════

  retirerVolontaire(affectationId: string | number): void {
    if (!affectationId || !this.data.project.id) return;
    if (!confirm('Êtes-vous sûr de vouloir retirer ce volontaire ?')) return;

    const projectId    = this.data.project.id;
    const affectation  = this.volontairesAffectes.find(a => String(a.id) === String(affectationId));
    const volontaireId = affectation?.volontaireId ?? affectation?.volontaire?.id;

    this.affectationService.supprimerAffectation(affectationId, volontaireId).pipe(
      switchMap(() => this.patchCompteurProjetObs(projectId, -1)),
      switchMap(() => {
        if (!volontaireId) return of(null);
        return this.http.get<any[]>(
          `${this.apiUrl}/candidatures?projectId=${projectId}&volontaireId=${volontaireId}&statut=acceptee`
        ).pipe(
          switchMap((cands: any[]) => {
            if (!cands?.length) return of(null);
            return this.http.patch(`${this.apiUrl}/candidatures/${cands[0].id}`, {
              statut: 'refusee', mis_a_jour_le: new Date().toISOString()
            }).pipe(catchError(() => of(null)));
          }),
          catchError(() => of(null))
        );
      }),
      catchError((err: unknown) => {
        console.error('❌ Erreur retrait:', err);
        this.snackBar.open('Erreur lors du retrait', 'Fermer', { duration: 3000 });
        return of(null);
      })
    ).subscribe(() => {
      this.snackBar.open('Volontaire retiré avec succès', 'Fermer', { duration: 3000 });
      setTimeout(() => this.rechargerTout(), 150);
    });
  }

  // ═══════════════════════════════════════════════════
  // HELPERS PRIVÉS
  // ═══════════════════════════════════════════════════

  private patchCompteurProjetObs(projectId: string | number, delta: number) {
    return this.http.get<Project>(`${this.apiUrl}/projets/${projectId}`).pipe(
      switchMap((projet: Project) => {
        const actuel  = typeof projet.nombreVolontairesActuels === 'number' ? projet.nombreVolontairesActuels : 0;
        const nouveau = Math.max(0, actuel + delta);
        this.data.project = { ...this.data.project, nombreVolontairesActuels: nouveau };
        return this.http.patch(`${this.apiUrl}/projets/${projectId}`, {
          nombreVolontairesActuels: nouveau,
          updated_at: new Date().toISOString()
        });
      }),
      catchError(() => of(null))
    );
  }

  private patchCompteurProjet(projectId: string | number, delta: number): void {
    this.patchCompteurProjetObs(projectId, delta).subscribe();
  }

  private syncCompteurProjet(nbActives: number): void {
    const projectId = this.data.project.id;
    if (!projectId) return;
    const actuelLocal = this.data.project.nombreVolontairesActuels ?? 0;
    if (actuelLocal !== nbActives) {
      this.data.project = { ...this.data.project, nombreVolontairesActuels: nbActives };
      this.http.patch(`${this.apiUrl}/projets/${projectId}`, {
        nombreVolontairesActuels: nbActives, updated_at: new Date().toISOString()
      }).pipe(catchError(() => of(null))).subscribe();
    }
  }

  private rechargerTout(): void {
    this.loadVolontairesAffectes();
    this.loadCandidatsAcceptes();
    this.loadCandidatures();
  }

  onClose(): void { this.dialogRef.close('refresh'); }
}