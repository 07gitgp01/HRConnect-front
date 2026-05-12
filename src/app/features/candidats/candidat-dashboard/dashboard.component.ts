// src/app/features/candidats/candidat-dashboard/dashboard.component.ts
import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../services/service_auth/auth.service';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { VolontaireService, calculerCompletionProfil } from '../../services/service_volont/volontaire.service';
import { ProjectService } from '../../services/service_projects/projects.service';
import { Candidature } from '../../models/candidature.model';
import { Volontaire } from '../../models/volontaire.model';

export interface Notification {
  id: string;
  message: string;
  date: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  candidatureId?: string | number;
  read: boolean;
}

@Component({
  selector: 'app-candidat-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatChipsModule, MatBadgeModule,
    MatDividerModule, MatTooltipModule, MatSnackBarModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class CandidatDashboardComponent implements OnInit {
  user: any;
  volontaire: Volontaire | null = null;
  statutPrincipal: string = 'Candidat';
  
  notifications = signal<Notification[]>([]);
  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  mesCandidatures: Candidature[] = [];
  projetsDisponibles: any[] = [];
  loading = true;

  stats = {
    totalCandidatures: 0,
    enAttente: 0,
    entretien: 0,
    acceptee: 0,
    refusee: 0
  };

  profilCompletion = 0;
  projetsDejaPostules: Set<number | string> = new Set();

  private readonly STATUS_STORAGE_KEY = 'candidat_statuts_historique';
  private readonly NOTIFS_STORAGE_KEY = 'candidat_notifications';

  constructor(
    private authService: AuthService,
    private candidatureService: CandidatureService,
    private volontaireService: VolontaireService,
    private projectService: ProjectService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    effect(() => {
      localStorage.setItem(this.NOTIFS_STORAGE_KEY, JSON.stringify(this.notifications()));
    });
  }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadSavedNotifications();
    this.chargerVolontairePuisSuite();
    this.loadProjetsDisponibles();
  }

  // ==================== NOTIFICATIONS ====================
  private loadSavedNotifications(): void {
    try {
      const saved = localStorage.getItem(this.NOTIFS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const notifs = parsed.map((n: any) => ({ ...n, date: new Date(n.date) }));
        this.notifications.set(notifs);
      }
    } catch (e) {}
  }

  private addNotification(notification: Omit<Notification, 'id' | 'date'>): void {
    const newNotif: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
      date: new Date(),
      read: notification.read // déjà présent
    };
    this.notifications.update(list => [newNotif, ...list]);
    if (notification.type === 'warning' || notification.type === 'success') {
      this.snackBar.open(notification.message, 'Voir', { duration: 5000 })
        .onAction().subscribe(() => {
          if (notification.candidatureId) {
            this.voirDetailsCandidature(notification.candidatureId);
          }
        });
    }
  }

  markAsRead(notifId: string): void {
    this.notifications.update(list => list.map(n => n.id === notifId ? { ...n, read: true } : n));
  }

  markAllAsRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
  }

  clearNotifications(): void {
    this.notifications.set([]);
  }

  // ==================== DÉTECTION CHANGEMENTS STATUT ====================
  private detectStatusChanges(newCandidatures: Candidature[]): void {
    const previousStatuses = this.loadPreviousStatuses();
    const newStatuses: Record<string, string> = {};
    for (const c of newCandidatures) {
      if (!c.id) continue;
      const key = String(c.id);
      newStatuses[key] = c.statut;
      const oldStatus = previousStatuses[key];
      if (oldStatus && oldStatus !== c.statut) {
        this.onStatusChange(c, oldStatus, c.statut);
      } else if (!oldStatus) {
        this.onStatusChange(c, null, c.statut);
      }
    }
    this.saveCurrentStatuses(newStatuses);
  }

  private onStatusChange(candidature: Candidature, oldStatus: string | null, newStatus: string): void {
    const projectName = this.getProjectNameFromId(candidature.projectId);
    let message = '';
    let type: Notification['type'] = 'info';
    if (!oldStatus) {
      message = `✅ Vous avez postulé à la mission "${projectName}". Votre candidature est enregistrée.`;
      type = 'info';
    } else {
      switch (newStatus) {
        case 'entretien':
          message = `🎉 Bonne nouvelle ! Votre candidature pour "${projectName}" a été retenue pour un entretien.`;
          type = 'success';
          break;
        case 'acceptee':
          message = `🏆 Félicitations ! Votre candidature pour "${projectName}" a été acceptée. Un contrat vous sera envoyé.`;
          type = 'success';
          break;
        case 'refusee':
          message = `😔 Nous sommes désolés, votre candidature pour "${projectName}" n'a pas été retenue.`;
          type = 'error';
          break;
        default:
          message = `Mise à jour du statut de votre candidature pour "${projectName}" : ${this.getStatutText(newStatus)}.`;
          type = 'info';
      }
    }
    this.addNotification({ message, type, candidatureId: candidature.id, read: false });
  }

  private loadPreviousStatuses(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(this.STATUS_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private saveCurrentStatuses(statuses: Record<string, string>): void {
    localStorage.setItem(this.STATUS_STORAGE_KEY, JSON.stringify(statuses));
  }

  private getProjectNameFromId(projectId: string | number | undefined): string {
    if (!projectId) return 'une mission';
    const project = this.projetsDisponibles.find(p => String(p.id) === String(projectId));
    return project?.titre || 'mission';
  }

  // ==================== CHARGEMENT DONNÉES ====================
  private chargerVolontairePuisSuite(): void {
    const volontaireId = this.authService.getVolontaireId?.() ?? this.user?.volontaireId ?? null;
    if (!volontaireId) {
      this.finirChargementSansVolontaire();
      return;
    }
    this.volontaireService.getVolontaire(volontaireId).subscribe({
      next: (v) => {
        this.volontaire = v;
        this.statutPrincipal = this.getStatutPrincipal(v.statut);
        this.profilCompletion = calculerCompletionProfil(v);
        this.loadMesCandidatures(volontaireId);
      },
      error: () => this.finirChargementSansVolontaire()
    });
  }

  private finirChargementSansVolontaire(): void {
    const id = this.authService.getVolontaireId?.() ?? this.user?.volontaireId ?? null;
    this.loadMesCandidatures(id);
  }

  private loadMesCandidatures(volontaireId: any): void {
    this.candidatureService.getAll().subscribe({
      next: (toutes) => {
        let miennes: Candidature[] = [];
        if (volontaireId) {
          const idStr = String(volontaireId).trim();
          miennes = toutes.filter(c => String(c.volontaireId || '').trim() === idStr);
        }
        if (miennes.length === 0 && this.user?.email) {
          miennes = toutes.filter(c => c.email?.toLowerCase() === this.user.email?.toLowerCase());
        }
        this.appliquerCandidatures(miennes);
      },
      error: () => this.appliquerCandidatures([])
    });
  }

  private appliquerCandidatures(candidatures: Candidature[]): void {
    this.detectStatusChanges(candidatures);
    this.mesCandidatures = candidatures.sort((a, b) =>
      new Date(b.cree_le || 0).getTime() - new Date(a.cree_le || 0).getTime()
    );
    this.calculerStats(candidatures);
    this.buildInitialNotifications();
    this.loading = false;
  }

  private buildInitialNotifications(): void {
    const existingMessages = this.notifications().map(n => n.message);
    if (!existingMessages.some(m => m.includes('Bienvenue'))) {
      this.addNotification({ message: 'Bienvenue dans votre espace candidat PNVB !', type: 'info', read: false });
    }
    if (this.stats.enAttente > 0 && !existingMessages.some(m => m.includes(`${this.stats.enAttente} candidature(s)`))) {
      this.addNotification({ message: `Vous avez ${this.stats.enAttente} candidature(s) en attente de traitement.`, type: 'warning', read: false });
    }
    if (this.stats.entretien > 0 && !existingMessages.some(m => m.includes(`${this.stats.entretien} de vos candidatures`))) {
      this.addNotification({ message: `Félicitations ! ${this.stats.entretien} de vos candidatures ont été présélectionnées.`, type: 'success', read: false });
    }
    if (!this.isProfilComplet() && !existingMessages.some(m => m.includes('Complétez votre profil'))) {
      this.addNotification({ message: `Votre profil est complété à ${this.profilCompletion}%. Complétez-le à 100% pour pouvoir postuler.`, type: 'error', read: false });
    }
  }

  // ==================== STATISTIQUES ET PROJETS ====================
  calculerStats(toutes: Candidature[]): void {
  this.stats = {
    totalCandidatures: toutes.length,
    enAttente: toutes.filter((c: Candidature) => c.statut === 'en_attente').length,
    entretien: toutes.filter((c: Candidature) => c.statut === 'entretien').length,
    acceptee: toutes.filter((c: Candidature) => c.statut === 'acceptee').length,
    refusee: toutes.filter((c: Candidature) => c.statut === 'refusee').length
  };
}

  private loadProjetsDisponibles(): void {
    const obs$ = (this.projectService as any).getAllProjectsWithStats?.() ?? this.projectService.getProjects();
    obs$.subscribe({
      next: (projets: any[]) => {
        this.projetsDisponibles = projets.filter(p => this.estProjetOuvert(p));
        this.chargerProjetsDejaPostules();
      },
      error: () => this.projetsDisponibles = []
    });
  }

  private chargerProjetsDejaPostules(): void {
    if (!this.user?.email) return;
    this.projectService.getProjects().subscribe({
      next: (projets) => {
        const verifications$ = projets.map(projet =>
          this.candidatureService.emailDejaPostule(this.user.email, projet.id!).pipe(map(deja => deja ? projet.id : null))
        );
        forkJoin(verifications$).subscribe({
          next: (resultats) => {
            const ids = resultats.filter((id): id is string | number => id !== null && id !== undefined);
            this.projetsDejaPostules = new Set(ids);
          }
        });
      }
    });
  }

  private estProjetOuvert(projet: any): boolean {
    const statut = (projet.statutProjet || '').toLowerCase().replace(/\s/g, '_');
    const ok = ['en_cours', 'actif', 'active', 'ouvert', 'disponible', 'soumis', 'ouvert_aux_candidatures', 'planifié'];
    return ok.some(s => statut.includes(s));
  }

  // ==================== ACTIONS ====================
  get candidaturesAffichees(): Candidature[] { return this.mesCandidatures.slice(0, 3); }
  get projetsAffiches(): any[] { return this.projetsDisponibles.slice(0, 3); }

  estDejaPostule(projetId: number | string | undefined): boolean {
    if (!projetId) return false;
    return this.projetsDejaPostules.has(projetId);
  }

  estDateLimiteDepassee(dateLimite: string | undefined): boolean {
    if (!dateLimite) return false;
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const limite = new Date(dateLimite);
    limite.setHours(23, 59, 59, 999);
    return aujourdhui > limite;
  }

  voirDetailsCandidature(candidatureId?: number | string): void {
    if (!candidatureId) return;
    this.router.navigate(['/features/candidats/candidature', candidatureId]);
  }

  retirerCandidature(candidatureId: number | string): void {
    if (confirm('Retirer cette candidature ?')) {
      this.candidatureService.delete(candidatureId).subscribe({
        next: () => {
          this.mesCandidatures = this.mesCandidatures.filter(c => String(c.id) !== String(candidatureId));
          this.calculerStats(this.mesCandidatures);
          this.detectStatusChanges(this.mesCandidatures);
          this.snackBar.open('Candidature retirée', 'Fermer', { duration: 3000 });
        },
        error: () => this.snackBar.open('Erreur lors du retrait', 'Fermer', { duration: 3000 })
      });
    }
  }

  postulerAuProjet(projet: any): void {
    if (!this.isProfilComplet()) {
      if (confirm(`Votre profil est complété à ${this.profilCompletion}%. Voulez-vous le compléter maintenant ?`)) {
        this.router.navigate(['/features/candidats/profil']);
      }
      return;
    }
    if (this.estDejaPostule(projet.id)) {
      alert('Vous avez déjà postulé à cette mission.');
      return;
    }
    this.router.navigate(['/features/candidats/postuler', String(projet.id)]);
  }

  voirToutesCandidatures(): void { this.router.navigate(['/features/candidats/mes-candidatures']); }
  voirTousProjets(): void { this.router.navigate(['/features/candidats/projets']); }
  completerProfil(): void { this.router.navigate(['/features/candidats/profil']); }

  // ==================== HELPERS AFFICHAGE ====================
  isProfilComplet(): boolean { return this.profilCompletion >= 100; }
  getProfilCompletion(): number { return this.profilCompletion; }

  getStatutPrincipal(statutVolontaire: string): string {
    const map: Record<string, string> = {
      'Actif': 'Volontaire Actif', 'Inactif': 'En attente de mission',
      'Fin de mission': 'Mission terminée', 'Candidat': 'Candidat', 'En attente': 'En attente de validation'
    };
    return map[statutVolontaire] || 'Candidat';
  }

  getStatutBadgeClass(statut: string): string {
    const map: Record<string, string> = {
      'en_attente': 'statut-en-attente', 'entretien': 'statut-entretien',
      'acceptee': 'statut-acceptee', 'refusee': 'statut-refusee'
    };
    return map[statut] || 'statut-default';
  }

  getStatutText(statut: string): string {
    const map: Record<string, string> = {
      'en_attente': 'En attente', 'entretien': 'En entretien',
      'acceptee': 'Acceptée', 'refusee': 'Refusée'
    };
    return map[statut] || statut;
  }

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    return Array.isArray(competences) ? competences : String(competences).split(',').map(c => c.trim());
  }
}