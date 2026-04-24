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
import { environment } from '../../../environment/environment';
import { VolontaireService } from '../../../services/service_volont/volontaire.service';

interface AffectationView {
  id: string;
  volontaireId: string;
  volontaire: Volontaire;
  dateAffectation?: string;
  dateFin?: string;
  statut?: string;
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
  private apiUrl = environment.apiUrl;

  candidatures: any[] = [];
  volontairesAffectes: AffectationView[] = [];
  candidatsAcceptes: CandidatAccepte[] = [];
  partenaires: Partenaire[] = [];

  candidatAccepteSelectionne: string | null = null;

  isLoadingCandidatures      = false;
  isLoadingVolontaires       = false;
  isLoadingCandidatsAcceptes = false;
  isLoadingPartenaires       = false;

  projetExpire = false;
  nbMissionsExpirees = 0;

  constructor(
    public dialogRef: MatDialogRef<ProjectDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { project: Project },
    private projectService: ProjectService,
    private candidatureService: CandidatureService,
    private affectationService: AffectationService,
    private partenaireService: PartenaireService,
    private volontaireService: VolontaireService,
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

  private detecterProjetExpire(): void {
    const dateFin = this.data.project.dateFin;
    if (!dateFin) return;
    const maintenant = new Date();
    const fin = new Date(dateFin);
    this.projetExpire = maintenant > fin;
    if (this.projetExpire) {
      console.log(`⚠️ Projet #${this.data.project.id} : dateFin dépassée (${dateFin})`);
    }
  }

  loadPartenaires(): void {
    this.isLoadingPartenaires = true;
    this.partenaireService.getAll().subscribe({
      next: (p: Partenaire[]) => { this.partenaires = p || []; this.isLoadingPartenaires = false; },
      error: () => { this.partenaires = []; this.isLoadingPartenaires = false; }
    });
  }

  loadCandidatures(): void {
    this.isLoadingCandidatures = true;
    const id = this.data.project.id;
    if (!id) { this.candidatures = []; this.isLoadingCandidatures = false; return; }

    this.projectService.getCandidaturesByProject(id).subscribe({
      next: (c: any[]) => { this.candidatures = c || []; this.isLoadingCandidatures = false; },
      error: () => { this.candidatures = []; this.isLoadingCandidatures = false; }
    });
  }

  loadVolontairesAffectes(): void {
    this.isLoadingVolontaires = true;
    const projectId = this.data.project.id;
    if (!projectId) { this.volontairesAffectes = []; this.isLoadingVolontaires = false; return; }

    forkJoin({
      affectations: this.affectationService.getAffectationsByProject(projectId),
      volontaires: this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires`).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ affectations, volontaires }) => {
        this.volontairesAffectes = affectations.map((a: any) => {
          const vol = volontaires.find((v: Volontaire) => String(v.id) === String(a.volontaireId));
          return {
            id: String(a.id),
            volontaireId: String(a.volontaireId),
            dateAffectation: a.dateAffectation,
            dateFin: a.dateFin,
            statut: a.statut,
            missionExpiree: this.projetExpire && a.statut === 'active',
            volontaire: vol || ({
              id: a.volontaireId,
              prenom: 'Volontaire',
              nom: `#${a.volontaireId}`,
              email: '',
              competences: []
            } as unknown as Volontaire)
          };
        });
        this.nbMissionsExpirees = this.volontairesAffectes.filter(v => v.missionExpiree).length;
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
        map((list: Candidature[]) => list.filter((c: Candidature) => c.statut === 'acceptee')),
        catchError(() => of([]))
      ),
      affectationsActives: this.affectationService.getAffectationsActivesByProject(projectId).pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: ({ candidaturesAcceptees, affectationsActives }) => {
        console.log('📋 Candidatures acceptées:', candidaturesAcceptees);
        console.log('📋 Affectations actives:', affectationsActives);
        
        this.candidatsAcceptes = candidaturesAcceptees.map((c: Candidature) => ({
          candidature: c,
          dejaAffecte: affectationsActives.some(
            (a: any) => String(a.volontaireId) === String(c.volontaireId)
          )
        }));
        
        console.log('📋 Candidats acceptés prêts pour affectation:', this.candidatsAcceptes);
        this.isLoadingCandidatsAcceptes = false;
      },
      error: (err) => {
        console.error('Erreur chargement candidats acceptés:', err);
        this.candidatsAcceptes = [];
        this.isLoadingCandidatsAcceptes = false;
      }
    });
  }

  terminerMission(affectationId: string | number, nomVolontaire: string): void {
    if (!confirm(`Confirmer la fin de mission pour ${nomVolontaire} ?`)) return;

    this.affectationService.terminerAffectation(affectationId).subscribe({
      next: () => {
        this.snackBar.open(`Mission de ${nomVolontaire} terminée`, 'Fermer', { duration: 5000 });
        setTimeout(() => this.rechargerTout(), 150);
      },
      error: () => {
        this.snackBar.open('Erreur lors de la fin de mission', 'Fermer', { duration: 3000 });
      }
    });
  }

  terminerToutesLesMissions(): void {
    const dateFin = this.data.project.dateFin;
    const projectId = this.data.project.id;
    if (!dateFin || !projectId) return;

    const nb = this.volontairesAffectes.length;
    if (!confirm(`Terminer automatiquement les ${nb} mission(s) active(s) de ce projet ?`)) return;

    this.affectationService.terminerAffectationsExpirees(projectId, dateFin).subscribe({
      next: (nbTerminees: number) => {
        if (nbTerminees > 0) {
          this.snackBar.open(`${nbTerminees} mission(s) terminée(s) automatiquement.`, 'Fermer', { duration: 6000 });
        } else {
          this.snackBar.open('Aucune affectation active à terminer.', 'Fermer', { duration: 3000 });
        }
        this.nbMissionsExpirees = 0;
        setTimeout(() => this.rechargerTout(), 150);
      },
      error: () => {
        this.snackBar.open('Erreur lors de la fin des missions', 'Fermer', { duration: 3000 });
      }
    });
  }

  get candidatsDisponiblesForAffectation(): CandidatAccepte[] {
    return this.candidatsAcceptes.filter(c => !c.dejaAffecte);
  }

  getVolontairesManquants(): number {
    return Math.max(0, this.getNeededVolunteers() - this.volontairesAffectes.length);
  }

  getNeededVolunteers(): number { return this.data.project.nombreVolontairesRequis || 0; }
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
      case 'actif': return 'play_circle';
      case 'cloture': return 'check_circle';
      default: return 'help';
    }
  }

  getStatusLabel(status?: ProjectStatus): string {
    return ProjectWorkflow.getStatusLabel(status || this.data.project.statutProjet);
  }

  getProjectTitle(): string { return this.data.project.titre || 'Titre non disponible'; }
  getProjectDescription(): string { return this.data.project.descriptionLongue || this.data.project.descriptionCourte || 'Aucune description'; }
  getProjectRegion(): string { return this.data.project.regionAffectation || 'Non spécifiée'; }

  getFormattedDate(d?: string | null): string {
    if (!d) return 'Non définie';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return 'Date invalide'; }
  }

  getStartDate(): string { return this.getFormattedDate(this.data.project.dateDebut); }
  getEndDate(): string { return this.getFormattedDate(this.data.project.dateFin); }

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
    const map: Record<string, string> = {
      'en_attente': 'En attente',
      'entretien': 'Entretien',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée'
    };
    return map[statut] || statut;
  }

  /**
   * ✅ Affecter un candidat accepté - VERSION CORRIGÉE
   */
  affecterCandidatAccepte(): void {
    if (!this.candidatAccepteSelectionne || !this.data.project.id) {
      this.snackBar.open('Sélectionnez un candidat accepté', 'Fermer', { duration: 3000 });
      return;
    }

    const candidatInfo = this.candidatsAcceptes.find(
      c => String(c.candidature.volontaireId) === String(this.candidatAccepteSelectionne)
    );
    if (!candidatInfo) { 
      this.snackBar.open('Candidat introuvable', 'Fermer', { duration: 3000 }); 
      return; 
    }

    if (candidatInfo.dejaAffecte) {
      this.snackBar.open('Ce volontaire est déjà affecté à ce projet', 'Fermer', { duration: 3000 });
      return;
    }

    const volontaireId = String(candidatInfo.candidature.volontaireId);
    const projectId = String(this.data.project.id);
    const nomVolontaire = `${candidatInfo.candidature.prenom} ${candidatInfo.candidature.nom}`;

    console.log('🔍 Affectation - volontaireId:', volontaireId, 'projectId:', projectId);

    this.isLoadingCandidatsAcceptes = true;

    // Vérifier si le projet est clôturé
    this.projectService.getProject(projectId).subscribe(projet => {
      if (projet.statutProjet !== 'cloture') {
        this.snackBar.open('Ce projet n\'est pas clôturé. Seules les missions clôturées peuvent accepter des affectations.', 'Fermer', { duration: 5000 });
        this.isLoadingCandidatsAcceptes = false;
        return;
      }

      // Vérifier si le volontaire peut être affecté
      this.affectationService.peutEtreAffecte(volontaireId, projectId).subscribe((peutEtreAffecte: boolean) => {
        console.log('🔍 peutEtreAffecte:', peutEtreAffecte);
        
        if (!peutEtreAffecte) {
          this.snackBar.open(`${nomVolontaire} ne peut pas être affecté à cette mission.`, 'Fermer', { duration: 5000 });
          this.isLoadingCandidatsAcceptes = false;
          return;
        }

        // Créer l'affectation
        this.affectationService.createAffectation({
          volontaireId: volontaireId,
          projectId: projectId,
          dateAffectation: new Date().toISOString().split('T')[0],
          statut: 'active',
          role: candidatInfo.candidature.poste_vise || 'Volontaire',
          notes: `Affectation depuis candidature acceptée #${candidatInfo.candidature.id}`
        }).subscribe({
          next: (result) => {
            console.log('✅ Affectation créée:', result);
            
            // Mettre à jour le statut du volontaire
            this.volontaireService.updateVolontaire(volontaireId, { statut: 'Actif' }).subscribe();
            
            // Mettre à jour le compteur du projet
            const nouveauNb = (this.data.project.nombreVolontairesActuels || 0) + 1;
            this.projectService.updateProject(projectId, { 
              nombreVolontairesActuels: nouveauNb 
            }).subscribe();
            this.data.project.nombreVolontairesActuels = nouveauNb;
            
            this.snackBar.open(`${nomVolontaire} affecté(e) avec succès`, 'Fermer', { duration: 3500 });
            this.candidatAccepteSelectionne = null;
            this.isLoadingCandidatsAcceptes = false;
            setTimeout(() => this.rechargerTout(), 500);
          },
          error: (err) => {
            console.error('❌ Erreur affectation:', err);
            this.snackBar.open('Erreur lors de l\'affectation: ' + (err.message || 'Erreur inconnue'), 'Fermer', { duration: 3000 });
            this.isLoadingCandidatsAcceptes = false;
          }
        });
      });
    });
  }

  /**
   * ✅ Retirer un volontaire
   */
  retirerVolontaire(affectationId: string | number): void {
    if (!affectationId) return;
    
    const affectation = this.volontairesAffectes.find(a => String(a.id) === String(affectationId));
    if (!affectation) {
      this.snackBar.open('Affectation non trouvée', 'Fermer', { duration: 3000 });
      return;
    }
    
    const nomVolontaire = `${affectation.volontaire.prenom} ${affectation.volontaire.nom}`;
    
    if (!confirm(`Retirer ${nomVolontaire} de cette mission ?\nCette action est irréversible.`)) return;

    this.isLoadingVolontaires = true;

    // Supprimer l'affectation
    this.affectationService.supprimerAffectation(affectationId).subscribe({
      next: () => {
        // Mettre à jour le statut du volontaire
        if (affectation.volontaireId) {
          this.volontaireService.updateVolontaire(affectation.volontaireId, { statut: 'En attente' }).subscribe();
        }
        
        // Décrémenter le compteur du projet
        const projectId = String(this.data.project.id);
        this.projectService.getProject(projectId).subscribe(projet => {
          const nouveauNb = Math.max(0, (projet.nombreVolontairesActuels || 0) - 1);
          this.projectService.updateProject(projectId, { nombreVolontairesActuels: nouveauNb }).subscribe();
          this.data.project.nombreVolontairesActuels = nouveauNb;
        });
        
        this.snackBar.open(`${nomVolontaire} retiré avec succès`, 'Fermer', { duration: 3000 });
        this.isLoadingVolontaires = false;
        setTimeout(() => this.rechargerTout(), 500);
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.snackBar.open('Erreur lors du retrait', 'Fermer', { duration: 3000 });
        this.isLoadingVolontaires = false;
      }
    });
  }

  private rechargerTout(): void {
    this.loadVolontairesAffectes();
    this.loadCandidatsAcceptes();
    this.loadCandidatures();
  }

  onClose(): void { 
    this.dialogRef.close('refresh'); 
  }
}