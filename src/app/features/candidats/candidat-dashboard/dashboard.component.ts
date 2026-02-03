import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Angular Material imports
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
import { VolontaireService } from '../../services/service_volont/volontaire.service';
import { ProjectService } from '../../services/service_projects/projects.service';
import { Candidature } from '../../models/candidature.model';
import { Project } from '../../models/projects.model';

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
  volontaire: any = null;
  statutPrincipal: string = 'Candidat';
  notifications: any[] = [];
  mesCandidatures: Candidature[] = [];
  projetsDisponibles: any[] = [];
  loading = true;

  // Statistiques
  stats = {
    totalCandidatures: 0,
    enAttente: 0,
    entretien: 0,
    acceptee: 0,
    refusee: 0
  };

  constructor(
    private authService: AuthService,
    private candidatureService: CandidatureService,
    private volontaireService: VolontaireService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (this.user) {
      this.loadDashboardData();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadDashboardData(): void {
    this.loadUserData();
    this.loadMesCandidatures();
    this.loadProjetsDisponiblesAvecStats();
    this.loadNotifications();
  }

  loadUserData(): void {
    if (this.user.id && this.user.role === 'volontaire') {
      this.volontaireService.getVolontaire(this.user.id).subscribe({
        next: (volontaire) => {
          this.volontaire = volontaire;
          this.statutPrincipal = this.getStatutPrincipal(volontaire.statut);
        },
        error: () => {
          this.statutPrincipal = 'Candidat';
        }
      });
    } else {
      this.statutPrincipal = 'Candidat';
    }
  }

  loadNotifications(): void {
    // Notifications de base
    this.notifications = [
      {
        id: 1,
        message: 'Bienvenue dans votre espace candidat PNVB !',
        date: new Date().toISOString(),
        type: 'info',
        lu: false
      }
    ];

    // Ajouter des notifications basées sur les candidatures
    if (this.mesCandidatures.length > 0) {
      const candidaturesEnAttente = this.mesCandidatures.filter(c => c.statut === 'en_attente');
      if (candidaturesEnAttente.length > 0) {
        this.notifications.push({
          id: 2,
          message: `Vous avez ${candidaturesEnAttente.length} candidature(s) en attente de traitement`,
          date: new Date().toISOString(),
          type: 'warning',
          lu: false
        });
      }

      const candidaturesEntretien = this.mesCandidatures.filter(c => c.statut === 'entretien');
      if (candidaturesEntretien.length > 0) {
        this.notifications.push({
          id: 3,
          message: `Félicitations ! ${candidaturesEntretien.length} de vos candidatures ont été présélectionnées`,
          date: new Date().toISOString(),
          type: 'success',
          lu: false
        });
      }
    }

    // Notification pour profil incomplet
    if (!this.isProfilComplet()) {
      this.notifications.push({
        id: 4,
        message: 'Votre profil doit être complété à 100% pour pouvoir postuler',
        date: new Date().toISOString(),
        type: 'error',
        lu: false
      });
    }
  }

  isProfilComplet(): boolean {
    // Implémentez la logique de vérification du profil complet
    // Vérifiez si tous les champs obligatoires sont remplis
    if (!this.volontaire) return false;
    
    const champsObligatoires = [
      'adresseResidence',
      'regionGeographique', 
      'niveauEtudes',
      'domaineEtudes',
      'competences',
      'motivation',
      'disponibilite',
      'typePiece',
      'numeroPiece'
    ];
    
    return champsObligatoires.every(champ => 
      this.volontaire[champ] && this.volontaire[champ].toString().trim() !== ''
    );
  }

  loadProjetsDisponiblesAvecStats(): void {
    this.projectService.getAllProjectsWithStats().subscribe({
      next: (projetsAvecStats) => {
        console.log('📊 Dashboard - Projets avec stats:', projetsAvecStats);
        
        // Filtrer les projets qui sont en cours ET qui ont besoin de volontaires
        this.projetsDisponibles = projetsAvecStats
          .filter((projet: any) => this.estProjetEnCours(projet) && this.aBesoinDeVolontaires(projet))
          .slice(0, 6);
        
        console.log('✅ Dashboard - Projets disponibles:', this.projetsDisponibles);
      },
      error: (error) => {
        console.error('❌ Erreur chargement projets dashboard:', error);
        // Fallback
        this.loadProjetsDisponiblesNormaux();
      }
    });
  }

  private loadProjetsDisponiblesNormaux(): void {
    this.projectService.getProjects().subscribe({
      next: (projets) => {
        this.projetsDisponibles = projets
          .filter((projet: any) => this.estProjetEnCours(projet) && this.aBesoinDeVolontaires(projet))
          .slice(0, 6);
      },
      error: (error) => {
        console.error('Erreur chargement projets:', error);
      }
    });
  }

  // CORRIGÉ : Utilise les propriétés du modèle Project
  private aBesoinDeVolontaires(projet: any): boolean {
    const needed = projet.nombreVolontairesRequis || 0;
    const affectes = projet.nombreVolontairesActuels || 0;
    return needed > affectes;
  }

  // CORRIGÉ : Utilise statutProjet au lieu de status
  private estProjetEnCours(projet: any): boolean {
    const statut = projet.statutProjet?.toLowerCase() || '';
    
    const statutsEnCours = [
      'en cours',
      'encours', 
      'en_cours',
      'active',
      'actif',
      'en progression',
      'disponible',
      'ouvert',
      'planifié',
      'soumis',
      'ouvert_aux_candidatures'
    ];
    
    return statutsEnCours.some(statutEnCours => 
      statut.includes(statutEnCours)
    );
  }

  loadMesCandidatures(): void {
    this.candidatureService.getAll().subscribe({
      next: (candidatures) => {
        this.mesCandidatures = candidatures
          .filter(c => c.email === this.user.email)
          .sort((a, b) => new Date(b.cree_le || '').getTime() - new Date(a.cree_le || '').getTime())
          .slice(0, 5);
        
        this.calculerStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement candidatures:', error);
        this.loading = false;
      }
    });
  }

  calculerStats(): void {
    this.stats = {
      totalCandidatures: this.mesCandidatures.length,
      enAttente: this.mesCandidatures.filter(c => c.statut === 'en_attente').length,
      entretien: this.mesCandidatures.filter(c => c.statut === 'entretien').length,
      acceptee: this.mesCandidatures.filter(c => c.statut === 'acceptee').length,
      refusee: this.mesCandidatures.filter(c => c.statut === 'refusee').length
    };
  }

  // NOUVELLE MÉTHODE : Pour formater l'affichage du statut du projet
  getProjectStatusLabel(statut: string): string {
    const statusMap: { [key: string]: string } = {
      'soumis': 'Soumis',
      'en_attente_validation': 'En attente',
      'ouvert_aux_candidatures': 'Ouvert',
      'en_cours': 'En cours',
      'a_cloturer': 'À clôturer',
      'cloture': 'Clôturé'
    };
    return statusMap[statut] || statut;
  }

  // CORRIGÉ : Utilise les propriétés du modèle Project
  getVolontairesNecessaires(projet: any): number {
    return projet.nombreVolontairesRequis || 0;
  }

  // CORRIGÉ : Utilise les propriétés du modèle Project
  getVolontairesAffectes(projet: any): number {
    return projet.nombreVolontairesActuels || 0;
  }

  getStatutPrincipal(statutVolontaire: string): string {
    const statuts: { [key: string]: string } = {
      'Actif': 'Volontaire Actif',
      'Inactif': 'En attente de mission',
      'Fin de mission': 'Mission terminée',
      'Candidat': 'Candidat',
      'En attente': 'En attente de validation'
    };
    return statuts[statutVolontaire] || 'Candidat';
  }

  postulerAuProjet(projet: any): void {
    // Vérifier si le profil est complet
    if (!this.isProfilComplet()) {
      if (confirm('Votre profil doit être complété à 100% pour pouvoir postuler. Voulez-vous compléter votre profil maintenant ?')) {
        this.router.navigate(['/features/candidats/profil']);
        return;
      } else {
        return;
      }
    }

    const projectId = typeof projet.id === 'string' ? projet.id : projet.id?.toString();
    this.router.navigate(['/features/candidats/postuler', projectId]);
  }

  retirerCandidature(candidatureId: number): void {
    if (confirm('Êtes-vous sûr de vouloir retirer cette candidature ? Cette action est irréversible.')) {
      this.candidatureService.delete(candidatureId).subscribe({
        next: () => {
          this.mesCandidatures = this.mesCandidatures.filter(c => c.id !== candidatureId);
          this.calculerStats();
          this.loadNotifications();
        },
        error: (error) => {
          console.error('Erreur:', error);
          alert('Erreur lors du retrait de la candidature');
        }
      });
    }
  }

  getStatutBadgeClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'en_attente': 'statut-en-attente',
      'entretien': 'statut-entretien',
      'acceptee': 'statut-acceptee',
      'refusee': 'statut-refusee',
      'candidat': 'statut-candidat',
      'volontaire actif': 'statut-actif',
      'en attente de mission': 'statut-en-attente',
      'mission terminée': 'statut-termine'
    };
    return classes[statut.toLowerCase()] || 'statut-default';
  }

  getStatutText(statut: string): string {
    const textes: { [key: string]: string } = {
      'en_attente': 'En attente',
      'entretien': 'En entretien',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée'
    };
    return textes[statut] || statut;
  }

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    if (Array.isArray(competences)) {
      return competences;
    }
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