// src/app/features/candidats/candidat-dashboard/dashboard.component.ts

import { Component, OnInit } from '@angular/core';
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

import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../../services/service_auth/auth.service';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { VolontaireService, calculerCompletionProfil } from '../../services/service_volont/volontaire.service';
import { ProjectService } from '../../services/service_projects/projects.service';
import { Candidature } from '../../models/candidature.model';
import { Volontaire } from '../../models/volontaire.model';

@Component({
  selector: 'app-candidat-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class CandidatDashboardComponent implements OnInit {
  user: any;
  volontaire: Volontaire | null = null;
  statutPrincipal: string = 'Candidat';
  notifications: any[] = [];
  mesCandidatures: Candidature[] = [];
  projetsDisponibles: any[] = [];
  loading = true;

  // ✅ Supprimer les propriétés de bascule
  // afficherToutesCandidatures = false;
  // afficherTousProjets = false;

  stats = {
    totalCandidatures: 0,
    enAttente: 0,
    entretien: 0,
    acceptee: 0,
    refusee: 0
  };

  profilCompletion = 0;

  // ✅ FIX : Set<number | string> pour supporter les IDs hex json-server
  projetsDejaPostules: Set<number | string> = new Set();

  constructor(
    private authService: AuthService,
    private candidatureService: CandidatureService,
    private volontaireService: VolontaireService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();

    console.log('🔍 USER COMPLET:', JSON.stringify(this.user, null, 2));
    console.log('🔍 getVolontaireId():', this.authService.getVolontaireId?.());

    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.chargerVolontairePuisSuite();
    this.loadProjetsDisponibles();
  }

  // ✅ Supprimer les méthodes de bascule
  // toggleAfficherToutesCandidatures(): void { ... }
  // toggleAfficherTousProjets(): void { ... }

  // ✅ Getter pour les candidatures limitées à 3
  get candidaturesAffichees(): Candidature[] {
    return this.mesCandidatures.slice(0, 3);
  }

  // ✅ Getter pour les projets limités à 3
  get projetsAffiches(): any[] {
    return this.projetsDisponibles.slice(0, 3);
  }

  // ✅ FIX : utilise String() pour normaliser les IDs avant de les stocker dans le Set
  chargerProjetsDejaPostules(): void {
    if (!this.user?.email) {
      console.log('⚠️ Utilisateur non connecté');
      return;
    }

    this.projectService.getProjects().subscribe({
      next: (projets) => {
        if (!projets || projets.length === 0) {
          this.projetsDejaPostules = new Set();
          return;
        }

        const verifications$ = projets.map(projet =>
          this.candidatureService.emailDejaPostule(this.user.email, projet.id!).pipe(
            map((dejaPostule: boolean) => dejaPostule ? projet.id : null)
          )
        );

        forkJoin(verifications$).subscribe({
          next: (resultats) => {
            const ids = resultats.filter(
              (id): id is number | string => id !== null && id !== undefined
            );
            this.projetsDejaPostules = new Set(ids);
            console.log(`✅ ${this.projetsDejaPostules.size} projet(s) déjà postulé(s) dans le dashboard`);
          },
          error: (err) => {
            console.error('❌ Erreur lors des vérifications:', err);
            this.projetsDejaPostules = new Set();
          }
        });
      },
      error: (err) => {
        console.error('❌ Erreur chargement projets:', err);
        this.projetsDejaPostules = new Set();
      }
    });
  }

  // ✅ FIX : comparaison String() pour être robuste number vs string
  estDejaPostule(projetId: number | string | undefined): boolean {
    if (projetId === undefined || projetId === null) return false;
    if (this.projetsDejaPostules.has(projetId)) return true;
    const projetIdStr = String(projetId);
    for (const id of this.projetsDejaPostules) {
      if (String(id) === projetIdStr) return true;
    }
    return false;
  }

  // ================================================================
  // ÉTAPE 1 — Charger le volontaire
  // ================================================================
  private chargerVolontairePuisSuite(): void {
    const volontaireId =
      this.authService.getVolontaireId?.() ??
      this.user?.volontaireId ??
      this.user?.id ??
      this.user?.userId ??
      null;

    console.log('🔍 volontaireId utilisé pour getVolontaire():', volontaireId);

    if (!volontaireId) {
      console.warn('⚠️ Impossible de trouver un volontaireId');
      this.finirChargementSansVolontaire();
      return;
    }

    this.volontaireService.getVolontaire(volontaireId).subscribe({
      next: (v) => {
        this.volontaire       = v;
        this.statutPrincipal  = this.getStatutPrincipal(v.statut);
        this.profilCompletion = calculerCompletionProfil(v);
        console.log('✅ Volontaire chargé:', v);
        console.log('✅ Complétion profil:', this.profilCompletion, '%');
        this.loadMesCandidatures(volontaireId);
      },
      error: (err) => {
        console.error('❌ Erreur getVolontaire:', err);
        this.finirChargementSansVolontaire();
      }
    });
  }

  private finirChargementSansVolontaire(): void {
    const id =
      this.authService.getVolontaireId?.() ??
      this.user?.volontaireId ??
      this.user?.id ??
      null;
    this.loadMesCandidatures(id);
  }

  // ================================================================
  // ÉTAPE 2 — Charger les candidatures
  // ================================================================
  private loadMesCandidatures(volontaireId: any): void {
    console.log('🔍 Chargement candidatures pour volontaireId:', volontaireId);

    const candidaturesObs =
      (this.candidatureService as any).getCandidaturesByVolontaire &&
      volontaireId
        ? (this.candidatureService as any).getCandidaturesByVolontaire(volontaireId)
        : null;

    if (candidaturesObs) {
      candidaturesObs.subscribe({
        next: (candidatures: Candidature[]) => {
          console.log('✅ Candidatures (endpoint dédié):', candidatures.length, candidatures);
          this.appliquerCandidatures(candidatures);
        },
        error: (err: any) => {
          console.warn('⚠️ getCandidaturesByVolontaire a échoué, fallback getAll:', err);
          this.loadMesCandidaturesViaGetAll(volontaireId);
        }
      });
    } else {
      this.loadMesCandidaturesViaGetAll(volontaireId);
    }
  }

  private loadMesCandidaturesViaGetAll(volontaireId: any): void {
    this.candidatureService.getAll().subscribe({
      next: (toutes: Candidature[]) => {
        console.log('🔍 Toutes les candidatures (getAll):', toutes.length, toutes);

        let miennes: Candidature[] = [];

        if (volontaireId !== null && volontaireId !== undefined) {
          const idStr = String(volontaireId).trim();

          miennes = toutes.filter(c => {
            const cId = c.volontaireId !== undefined && c.volontaireId !== null
              ? String(c.volontaireId).trim()
              : '';
            return cId === idStr;
          });

          console.log(`🔍 Filtre par volontaireId="${idStr}" → ${miennes.length} candidature(s)`);

          if (miennes.length === 0 && this.user?.email) {
            console.warn('⚠️ Aucune correspondance sur volontaireId, tentative par email:', this.user.email);
            miennes = toutes.filter(c =>
              c.email?.toLowerCase().trim() === this.user.email?.toLowerCase().trim()
            );
            console.log(`🔍 Filtre par email → ${miennes.length} candidature(s)`);
          }
        } else if (this.user?.email) {
          console.warn('⚠️ Pas de volontaireId, filtrage par email uniquement');
          miennes = toutes.filter(c =>
            c.email?.toLowerCase().trim() === this.user.email?.toLowerCase().trim()
          );
        }

        this.appliquerCandidatures(miennes);
      },
      error: (err) => {
        console.error('❌ Erreur getAll candidatures:', err);
        this.appliquerCandidatures([]);
      }
    });
  }

  private appliquerCandidatures(candidatures: Candidature[]): void {
    this.mesCandidatures = candidatures
      .sort((a, b) =>
        new Date(b.cree_le || 0).getTime() - new Date(a.cree_le || 0).getTime()
      );

    this.calculerStats(candidatures);
    this.buildNotifications();
    this.loading = false;

    console.log('✅ Candidatures appliquées:', this.mesCandidatures.length);
    console.log('✅ Stats:', this.stats);
  }

  // ================================================================
  // STATS
  // ================================================================
  calculerStats(toutes?: Candidature[]): void {
    const source = toutes ?? this.mesCandidatures;
    this.stats = {
      totalCandidatures: source.length,
      enAttente: source.filter(c => c.statut === 'en_attente').length,
      entretien: source.filter(c => c.statut === 'entretien').length,
      acceptee:  source.filter(c => c.statut === 'acceptee').length,
      refusee:   source.filter(c => c.statut === 'refusee').length
    };
  }

  // ================================================================
  // NOTIFICATIONS
  // ================================================================
  private buildNotifications(): void {
    this.notifications = [];

    this.notifications.push({
      id: 1,
      message: 'Bienvenue dans votre espace candidat PNVB !',
      date: new Date().toISOString(),
      type: 'info',
      lu: false
    });

    if (this.stats.enAttente > 0) {
      this.notifications.push({
        id: 2,
        message: `Vous avez ${this.stats.enAttente} candidature(s) en attente de traitement`,
        date: new Date().toISOString(),
        type: 'warning',
        lu: false
      });
    }

    if (this.stats.entretien > 0) {
      this.notifications.push({
        id: 3,
        message: `Félicitations ! ${this.stats.entretien} de vos candidatures ont été présélectionnées`,
        date: new Date().toISOString(),
        type: 'success',
        lu: false
      });
    }

    if (!this.isProfilComplet()) {
      this.notifications.push({
        id: 4,
        message: `Votre profil est complété à ${this.profilCompletion}%. Complétez-le à 100% pour pouvoir postuler.`,
        date: new Date().toISOString(),
        type: 'error',
        lu: false
      });
    }
  }

  // ================================================================
  // PROJETS DISPONIBLES
  // ================================================================
  private loadProjetsDisponibles(): void {
    const obs$ = (this.projectService as any).getAllProjectsWithStats
      ? (this.projectService as any).getAllProjectsWithStats()
      : this.projectService.getProjects();

    obs$.subscribe({
      next: (projets: any[]) => {
        this.projetsDisponibles = projets
          .filter(p => this.estProjetOuvert(p));
        console.log('✅ Projets disponibles:', this.projetsDisponibles.length);
        this.chargerProjetsDejaPostules();
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement projets:', err);
        this.projetsDisponibles = [];
      }
    });
  }

  private estProjetOuvert(projet: any): boolean {
    const statut = (projet.statutProjet || '').toLowerCase().replace(/\s/g, '_');
    const ok = [
      'en_cours', 'actif', 'active', 'ouvert', 'disponible',
      'soumis', 'ouvert_aux_candidatures', 'planifié', 'planifie'
    ];
    return ok.some(s => statut.includes(s));
  }

  // ================================================================
  // ACTIONS
  // ================================================================

  postulerAuProjet(projet: any): void {
    if (!projet?.id) {
      alert('Projet invalide');
      return;
    }

    if (!this.isProfilComplet()) {
      const msg = `Votre profil est complété à ${this.profilCompletion}%.\n\n` +
                  `Pour postuler, votre profil doit être complet à 100%.\n\n` +
                  `Voulez-vous le compléter maintenant ?`;
      if (confirm(msg)) {
        this.router.navigate(['/features/candidats/profil']);
      }
      return;
    }

    const dejaPostuleLocal = this.mesCandidatures.some(c =>
      String(c.projectId ?? '').trim() === String(projet.id ?? '').trim()
    );

    if (dejaPostuleLocal) {
      alert('Vous avez déjà postulé à cette mission.\nConsultez "Mes candidatures" pour voir le statut.');
      this.router.navigate(['/features/candidats/mes-candidatures']);
      return;
    }

    if (!this.user?.email) {
      alert('Erreur : email introuvable. Reconnectez-vous.');
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;

    this.candidatureService.emailDejaPostule(this.user.email, projet.id).subscribe({
      next: (dejaPostule) => {
        this.loading = false;

        if (dejaPostule) {
          alert('Vous avez déjà postulé à cette mission.');
          this.router.navigate(['/features/candidats/mes-candidatures']);
          return;
        }

        this.router.navigate(['/features/candidats/postuler', String(projet.id)]);
      },
      error: (err) => {
        this.loading = false;
        console.warn('⚠️ emailDejaPostule échoué, redirection quand même:', err);
        this.router.navigate(['/features/candidats/postuler', String(projet.id)]);
      }
    });
  }

  voirDetailsCandidature(candidatureId?: number | string): void {
    if (!candidatureId) {
      alert('Erreur : candidature introuvable');
      return;
    }
    this.router.navigate(['/features/candidats/candidature', candidatureId]);
  }

  retirerCandidature(candidatureId: number | string): void {
    if (!confirm('Êtes-vous sûr ? Cette action est irréversible.')) return;
    this.candidatureService.delete(candidatureId).subscribe({
      next: () => {
        this.mesCandidatures = this.mesCandidatures.filter(c =>
          String(c.id) !== String(candidatureId)
        );
        this.calculerStats();
        this.buildNotifications();
        alert('Candidature retirée avec succès');
      },
      error: () => alert('Erreur lors du retrait de la candidature')
    });
  }

  voirToutesCandidatures(): void { this.router.navigate(['/features/candidats/mes-candidatures/']); }
  voirTousProjets(): void        { this.router.navigate(['/features/candidats/projets/']); }
  completerProfil(): void        { this.router.navigate(['/features/candidats/profil']); }

  // ================================================================
  // HELPERS PROFIL
  // ================================================================
  isProfilComplet(): boolean    { return this.profilCompletion >= 100; }
  getProfilCompletion(): number { return this.profilCompletion; }

  // ================================================================
  // HELPERS AFFICHAGE
  // ================================================================
  getStatutPrincipal(statutVolontaire: string): string {
    const map: Record<string, string> = {
      'Actif':          'Volontaire Actif',
      'Inactif':        'En attente de mission',
      'Fin de mission': 'Mission terminée',
      'Candidat':       'Candidat',
      'En attente':     'En attente de validation'
    };
    return map[statutVolontaire] || 'Candidat';
  }

  getStatutBadgeClass(statut: string): string {
    const map: Record<string, string> = {
      'en_attente': 'statut-en-attente',
      'entretien':  'statut-entretien',
      'acceptee':   'statut-acceptee',
      'refusee':    'statut-refusee'
    };
    return map[statut] || 'statut-default';
  }

  getStatutText(statut: string): string {
    const map: Record<string, string> = {
      'en_attente': 'En attente',
      'entretien':  'En entretien',
      'acceptee':   'Acceptée',
      'refusee':    'Refusée'
    };
    return map[statut] || statut;
  }

  getProjectStatusLabel(statut: string): string {
    const map: Record<string, string> = {
      'soumis':                  'Soumis',
      'en_attente_validation':   'En attente',
      'ouvert_aux_candidatures': 'Ouvert',
      'en_cours':                'En cours',
      'actif':                   'Actif',
      'a_cloturer':              'À clôturer',
      'cloture':                 'Clôturé'
    };
    return map[statut] || statut;
  }

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    if (Array.isArray(competences)) return competences.filter(Boolean);
    return String(competences).split(',').map(c => c.trim()).filter(Boolean);
  }

  getVolontairesNecessaires(projet: any): number { return projet.nombreVolontairesRequis ?? 0; }
  getVolontairesAffectes(projet: any): number    { return projet.nombreVolontairesActuels ?? 0; }

  estDateLimiteDepassee(dateLimite: string | undefined): boolean {
  if (!dateLimite) return false;
  
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  
  const limite = new Date(dateLimite);
  limite.setHours(23, 59, 59, 999);
  
  return aujourdhui > limite;
}
}