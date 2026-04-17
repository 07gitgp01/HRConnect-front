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

  stats = {
    totalCandidatures: 0,
    enAttente: 0,
    entretien: 0,
    acceptee: 0,
    refusee: 0
  };

  // ✅ pourcentage calculé une seule fois après chargement du volontaire
  profilCompletion = 0;

  constructor(
    private authService: AuthService,
    private candidatureService: CandidatureService,
    private volontaireService: VolontaireService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    // ✅ deux branches indépendantes :
    //   1) charger le volontaire → puis candidatures → puis notifications
    //   2) charger les projets disponibles (pas de dépendance)
    this.chargerVolontairePuisSuite();
    this.loadProjetsDisponiblesAvecStats();
  }

  // ============================================================
  // ✅ BRANCHE 1 — volontaire → candidatures → notifications
  //    Chaque étape attend que la précédente soit terminée.
  // ============================================================

  /**
   * Charge le volontaire via getVolontaireId() (fonctionne pour
   * role === 'candidat' ET role === 'volontaire').
   * Puis enchaîne les étapes suivantes dans le callback next.
   */
  private chargerVolontairePuisSuite(): void {
    const volontaireId = this.authService.getVolontaireId();

    if (!volontaireId) {
      // pas de volontaireId → on reste "Candidat", on charge quand même les candidatures
      console.warn('⚠️ Aucun volontaireId dans la session. Tentative avec user.id.');

      if (this.user?.id) {
        this.volontaireService.getVolontaire(this.user.id).subscribe({
          next:  (v) => this.appliquerVolontaire(v),
          error: ()  => this.finirChargementSansVolontaire()
        });
      } else {
        this.finirChargementSansVolontaire();
      }
      return;
    }

    this.volontaireService.getVolontaire(volontaireId).subscribe({
      next:  (v) => this.appliquerVolontaire(v),
      error: ()  => this.finirChargementSansVolontaire()
    });
  }

  /** Applique les données du volontaire puis charge les candidatures */
  private appliquerVolontaire(volontaire: Volontaire): void {
    this.volontaire       = volontaire;
    this.statutPrincipal  = this.getStatutPrincipal(volontaire.statut);
    // ✅ calcul du pourcentage avec la fonction centralisée du service
    this.profilCompletion = calculerCompletionProfil(volontaire);
    console.log('✅ Volontaire chargé — completion:', this.profilCompletion, '%');

    // maintenant on peut charger les candidatures
    this.loadMesCandidatures();
  }

  /** Chemin d'erreur : pas de volontaire → candidatures quand même */
  private finirChargementSansVolontaire(): void {
    this.volontaire       = null;
    this.statutPrincipal  = 'Candidat';
    this.profilCompletion = 0;
    this.loadMesCandidatures();   // on essaie quand même
  }

  // ============================================================
  // CANDIDATURES
  // ============================================================

  /**
   * Charge les candidatures puis calcule les stats et les notifications.
   * Filtre par volontaireId si disponible, sinon par email (fallback).
   */
  loadMesCandidatures(): void {
    this.candidatureService.getAll().subscribe({
      next: (candidatures) => {
        const volontaireId = this.authService.getVolontaireId();

        if (volontaireId) {
          this.mesCandidatures = candidatures
            .filter(c => c.volontaireId?.toString() === volontaireId.toString());
        } else if (this.user?.email) {
          console.warn('⚠️ Filtrage par email (fallback)');
          this.mesCandidatures = candidatures
            .filter(c => c.email === this.user.email);
        }

        // trier par date desc et limiter à 5
        this.mesCandidatures = this.mesCandidatures
          .sort((a, b) => new Date(b.cree_le || '').getTime() - new Date(a.cree_le || '').getTime())
          .slice(0, 5);

        this.calculerStats();

        // ✅ notifications APRÈS que volontaire + candidatures sont prêts
        this.loadNotifications();

        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement candidatures:', err);
        this.loadNotifications(); // quand même
        this.loading = false;
      }
    });
  }

  // ============================================================
  // NOTIFICATIONS  (appelée uniquement après candidatures)
  // ============================================================

  loadNotifications(): void {
    this.notifications = [
      {
        id: 1,
        message: 'Bienvenue dans votre espace candidat PNVB !',
        date: new Date().toISOString(),
        type: 'info',
        lu: false
      }
    ];

    // basées sur les candidatures (déjà chargées à ce point)
    const enAttente  = this.mesCandidatures.filter(c => c.statut === 'en_attente');
    const entretien  = this.mesCandidatures.filter(c => c.statut === 'entretien');

    if (enAttente.length > 0) {
      this.notifications.push({
        id: 2,
        message: `Vous avez ${enAttente.length} candidature(s) en attente de traitement`,
        date: new Date().toISOString(),
        type: 'warning',
        lu: false
      });
    }

    if (entretien.length > 0) {
      this.notifications.push({
        id: 3,
        message: `Félicitations ! ${entretien.length} de vos candidatures ont été présélectionnées`,
        date: new Date().toISOString(),
        type: 'success',
        lu: false
      });
    }

    // ✅ utilise profilCompletion déjà calculé (pas de re-calcul)
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

  // ============================================================
  // ✅ COMPLÉTION DU PROFIL — délègue à calculerCompletionProfil()
  // ============================================================

  isProfilComplet(): boolean {
    return this.profilCompletion >= 100;
  }

  getProfilCompletion(): number {
    return this.profilCompletion;
  }

  // ============================================================
  // BRANCHE 2 — projets disponibles (indépendant du volontaire)
  // ============================================================

  loadProjetsDisponiblesAvecStats(): void {
    this.projectService.getAllProjectsWithStats().subscribe({
      next: (projetsAvecStats) => {
        this.projetsDisponibles = projetsAvecStats
          .filter((p: any) => this.estProjetEnCours(p) && this.aBesoinDeVolontaires(p))
          .slice(0, 6);
      },
      error: () => this.loadProjetsDisponiblesNormaux()
    });
  }

  private loadProjetsDisponiblesNormaux(): void {
    this.projectService.getProjects().subscribe({
      next: (projets) => {
        this.projetsDisponibles = projets
          .filter((p: any) => this.estProjetEnCours(p) && this.aBesoinDeVolontaires(p))
          .slice(0, 6);
      },
      error: (err) => console.error('❌ Erreur chargement projets:', err)
    });
  }

  private aBesoinDeVolontaires(projet: any): boolean {
    return (projet.nombreVolontairesRequis ?? 0) > (projet.nombreVolontairesActuels ?? 0);
  }

  private estProjetEnCours(projet: any): boolean {
    const statut = (projet.statutProjet || '').toLowerCase();
    const statutsValides = [
      'en cours', 'encours', 'en_cours', 'active', 'actif',
      'en progression', 'disponible', 'ouvert', 'planifié',
      'soumis', 'ouvert_aux_candidatures'
    ];
    return statutsValides.some(s => statut.includes(s));
  }

  // ============================================================
  // STATS CANDIDATURES
  // ============================================================

  calculerStats(): void {
    this.stats = {
      totalCandidatures: this.mesCandidatures.length,
      enAttente:  this.mesCandidatures.filter(c => c.statut === 'en_attente').length,
      entretien:  this.mesCandidatures.filter(c => c.statut === 'entretien').length,
      acceptee:   this.mesCandidatures.filter(c => c.statut === 'acceptee').length,
      refusee:    this.mesCandidatures.filter(c => c.statut === 'refusee').length
    };
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  postulerAuProjet(projet: any): void {
    if (!this.isProfilComplet()) {
      if (confirm(`Votre profil est complété à ${this.profilCompletion}%.\nVoulez-vous le compléter maintenant ?`)) {
        this.router.navigate(['/features/candidats/profil']);
      }
      return;
    }
    this.router.navigate(['/features/candidats/postuler', projet.id?.toString()]);
  }

  retirerCandidature(candidatureId: number): void {
    if (!confirm('Êtes-vous sûr ? Cette action est irréversible.')) return;

    this.candidatureService.delete(candidatureId).subscribe({
      next: () => {
        this.mesCandidatures = this.mesCandidatures.filter(c => c.id !== candidatureId);
        this.calculerStats();
        this.loadNotifications();
      },
      error: () => alert('Erreur lors du retrait de la candidature')
    });
  }

  // ============================================================
  // HELPERS D'AFFICHAGE
  // ============================================================

  getProjectStatusLabel(statut: string): string {
    const map: Record<string, string> = {
      'soumis': 'Soumis',
      'en_attente_validation': 'En attente',
      'ouvert_aux_candidatures': 'Ouvert',
      'en_cours': 'En cours',
      'actif': 'Actif',
      'a_cloturer': 'À clôturer',
      'cloture': 'Clôturé'
    };
    return map[statut] || statut;
  }

  getVolontairesNecessaires(projet: any): number {
    return projet.nombreVolontairesRequis ?? 0;
  }

  getVolontairesAffectes(projet: any): number {
    return projet.nombreVolontairesActuels ?? 0;
  }

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
      'en_attente':           'statut-en-attente',
      'entretien':            'statut-entretien',
      'acceptee':             'statut-acceptee',
      'refusee':              'statut-refusee',
      'candidat':             'statut-candidat',
      'volontaire actif':     'statut-actif',
      'en attente de mission':'statut-en-attente',
      'mission terminée':     'statut-termine'
    };
    return map[statut.toLowerCase()] || 'statut-default';
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

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    if (Array.isArray(competences)) return competences;
    return String(competences).split(',').map(c => c.trim());
  }

  voirToutesCandidatures(): void {
    this.router.navigate(['/features/candidats/mes-candidatures/']);
  }

  voirTousProjets(): void {
    this.router.navigate(['/features/candidats/projets/']);
  }

  completerProfil(): void {
    this.router.navigate(['/features/candidats/profil']);
  }
}