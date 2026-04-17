// src/app/features/candidats/projets-disponibles/projets-disponibles.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import { Project, ProjectWorkflow } from '../../models/projects.model';
import { ProjectService } from '../../services/service_projects/projects.service';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { AuthService } from '../../services/service_auth/auth.service';
import { VolontaireService, calculerCompletionProfil } from '../../services/service_volont/volontaire.service';
import { Volontaire } from '../../models/volontaire.model';

@Component({
  selector: 'app-projets-disponibles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './projets-disponibles.component.html',
  styleUrls: ['./projets-disponibles.component.css']
})
export class ProjetsDisponiblesComponent implements OnInit {
  projets: Project[] = [];
  projetsFiltres: Project[] = [];
  regions: string[] = [];
  domaineActivites: string[] = [];
  typeMissions: string[] = [];
  
  // Filtres
  recherche = '';
  regionSelectionnee = '';
  domaineSelectionne = '';
  typeMissionSelectionne = '';
  
  // États
  isLoading = false;
  hasError = false;

  // Profil du volontaire
  volontaire: Volontaire | null = null;
  profilCompletion = 0;

  // ✅ Set pour stocker les IDs (string | number)
  projetsDejaPostules: Set<string> = new Set();

  constructor(
    private projectService: ProjectService,
    private candidatureService: CandidatureService,
    private authService: AuthService,
    private volontaireService: VolontaireService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.chargerProjets();
    this.chargerProfilVolontaire();
    this.chargerProjetsDejaPostules();
  }

  /**
   * ✅ CORRIGÉ: Normalisation des IDs en string pour comparaison
   */
  chargerProjetsDejaPostules(): void {
    const user = this.authService.getCurrentUser();
    
    if (!user?.email) {
      console.log('⚠️ Utilisateur non connecté');
      return;
    }

    this.projectService.getProjetsPublic().subscribe({
      next: (projets) => {
        if (!projets || projets.length === 0) {
          this.projetsDejaPostules = new Set();
          return;
        }

        const verifications$ = projets.map(projet =>
          this.candidatureService.emailDejaPostule(user.email, projet.id!).pipe(
            map((dejaPostule: boolean) => {
              if (!dejaPostule || !projet.id) return null;
              // ✅ Normaliser en string
              return String(projet.id);
            })
          )
        );

        forkJoin(verifications$).subscribe({
          next: (resultats) => {
            this.projetsDejaPostules = new Set(
              resultats.filter((id): id is string => id !== null)
            );
            console.log(`✅ ${this.projetsDejaPostules.size} projet(s) déjà postulé(s):`, 
              Array.from(this.projetsDejaPostules));
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

  /**
   * ✅ CORRIGÉ: Comparaison normalisée en string
   */
  estDejaPostule(projetId: number | string | undefined): boolean {
    if (projetId === undefined || projetId === null) return false;
    const idString = String(projetId);
    return this.projetsDejaPostules.has(idString);
  }

  chargerProjets(): void {
    this.isLoading = true;
    this.hasError = false;

    this.projectService.getProjetsPublic().subscribe({
      next: (projets: Project[]) => {
        this.projets = projets;
        this.projetsFiltres = [...projets];
        this.extraireFiltres(projets);
        this.isLoading = false;
        
        console.log(`✅ ${projets.length} projets publics chargés:`, 
          projets.map(p => ({ id: p.id, titre: p.titre })));
      },
      error: (error: any) => {
        console.error('❌ Erreur chargement projets:', error);
        this.isLoading = false;
        this.hasError = true;
        this.snackBar.open('Erreur lors du chargement des projets', 'Fermer', {
          duration: 3000
        });
      }
    });
  }

  chargerProfilVolontaire(): void {
    const volontaireId = this.authService.getVolontaireId();
    
    if (!volontaireId) {
      console.log('⚠️ Aucun volontaireId trouvé');
      return;
    }

    this.volontaireService.getVolontaire(volontaireId).subscribe({
      next: (volontaire) => {
        this.volontaire = volontaire;
        this.profilCompletion = calculerCompletionProfil(volontaire);
        console.log(`✅ Profil chargé - Completion: ${this.profilCompletion}%`);
      },
      error: (err) => {
        console.error('❌ Erreur chargement profil:', err);
      }
    });
  }

  private extraireFiltres(projets: Project[]): void {
    const regionsFiltrees = projets
      .map(p => p.regionAffectation)
      .filter((r: string | undefined): r is string => !!r && r.trim() !== '');
    
    this.regions = [...new Set(regionsFiltrees)].sort();

    const domainesFiltres = projets
      .map(p => p.domaineActivite)
      .filter((d: string | undefined): d is string => !!d && d.trim() !== '');
    
    this.domaineActivites = [...new Set(domainesFiltres)].sort();

    const typesMission = projets
      .map(p => p.type_mission)
      .filter((t): t is NonNullable<Project['type_mission']> => 
        t !== undefined && t !== null
      )
      .map(t => String(t));

    this.typeMissions = [...new Set(typesMission)].sort();
  }

  appliquerFiltres(): void {
    let projetsFiltres = [...this.projets];

    if (this.recherche.trim()) {
      const rechercheLower = this.recherche.toLowerCase();
      projetsFiltres = projetsFiltres.filter(projet =>
        projet.titre.toLowerCase().includes(rechercheLower) ||
        projet.descriptionCourte.toLowerCase().includes(rechercheLower) ||
        projet.domaineActivite.toLowerCase().includes(rechercheLower) ||
        (projet.competences_requises && 
         typeof projet.competences_requises === 'string' &&
         projet.competences_requises.toLowerCase().includes(rechercheLower))
      );
    }

    if (this.regionSelectionnee) {
      projetsFiltres = projetsFiltres.filter(projet =>
        projet.regionAffectation === this.regionSelectionnee
      );
    }

    if (this.domaineSelectionne) {
      projetsFiltres = projetsFiltres.filter(projet =>
        projet.domaineActivite === this.domaineSelectionne
      );
    }

    if (this.typeMissionSelectionne) {
      projetsFiltres = projetsFiltres.filter(projet =>
        projet.type_mission === this.typeMissionSelectionne
      );
    }

    this.projetsFiltres = projetsFiltres;
  }

  reinitialiserFiltres(): void {
    this.recherche = '';
    this.regionSelectionnee = '';
    this.domaineSelectionne = '';
    this.typeMissionSelectionne = '';
    this.projetsFiltres = [...this.projets];
    
    this.snackBar.open('Filtres réinitialisés', 'Fermer', {
      duration: 2000
    });
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  getCompetencesText(competences: string[] | string | undefined): string {
    if (!competences) return 'Aucune compétence spécifiée';
    
    const competencesList = Array.isArray(competences) 
      ? competences 
      : competences.split(',').map(c => c.trim()).filter(c => c.length > 0);
    
    if (competencesList.length === 0) return 'Aucune compétence spécifiée';
    
    return competencesList.slice(0, 3).join(', ') + 
           (competencesList.length > 3 ? `... (+${competencesList.length - 3})` : '');
  }

  getCompetencesList(competences: string[] | string | undefined): string[] {
    if (!competences) return [];
    
    if (Array.isArray(competences)) {
      return competences;
    }
    
    return competences.split(',').map(c => c.trim()).filter(c => c.length > 0);
  }

  getVolontairesManquants(projet: Project): number {
    const requis = projet.nombreVolontairesRequis ?? 0;
    const actuels = projet.nombreVolontairesActuels ?? 0;
    return Math.max(0, requis - actuels);
  }

  getTotalVolontairesManquants(): number {
    return this.projetsFiltres.reduce((total, projet) => 
      total + this.getVolontairesManquants(projet), 0
    );
  }

  getFormattedDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Non définie';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Date invalide';
    }
  }

  getDureeProjet(projet: Project): string {
    if (!projet.dateDebut || !projet.dateFin) return 'Durée non spécifiée';
    
    try {
      const debut = new Date(projet.dateDebut);
      const fin = new Date(projet.dateFin);
      const diffTime = Math.abs(fin.getTime() - debut.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '1 jour';
      if (diffDays < 30) return `${diffDays} jours`;
      if (diffDays < 60) return `${Math.round(diffDays / 7)} semaines`;
      return `${Math.round(diffDays / 30)} mois`;
    } catch (error) {
      return 'Durée invalide';
    }
  }

  peutPostuler(projet: Project): boolean {
    return this.projectService.canApplyToProject(projet);
  }

  /**
   * ✅ CORRIGÉ: Meilleure gestion de l'ID du projet
   */
  postuler(projet: Project): void {
    // ✅ DIAGNOSTIC: Log détaillé
    console.log('🎯 Tentative de postuler:', { 
      id: projet.id, 
      titre: projet.titre,
      typeId: typeof projet.id,
      idNormalized: String(projet.id)
    });

    // ✅ CORRECTION: Vérification robuste
    if (projet.id === undefined || projet.id === null || String(projet.id).trim() === '') {
      console.error('❌ Projet.id invalide:', projet.id);
      this.snackBar.open('Erreur : Projet non valide (ID manquant)', 'Fermer', {
        duration: 3000
      });
      return;
    }

    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.snackBar.open('Vous devez être connecté pour postuler', 'Fermer', {
        duration: 3000
      });
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/features/candidats/postuler/${projet.id}` }
      });
      return;
    }

    if (this.profilCompletion < 100) {
      const message = `Votre profil est complété à ${this.profilCompletion}%.\n\nPour postuler, votre profil doit être complet à 100%.\n\nVoulez-vous le compléter maintenant ?`;
      
      if (confirm(message)) {
        this.router.navigate(['/features/candidats/profil']);
      }
      return;
    }

    if (!this.peutPostuler(projet)) {
      let message = '';
      
      if (projet.statutProjet !== 'actif') {
        message = 'Ce projet n\'est plus disponible pour les candidatures';
      } else if (projet.dateLimiteCandidature) {
        const aujourdhui = new Date();
        const dateLimite = new Date(projet.dateLimiteCandidature);
        
        if (aujourdhui > dateLimite) {
          message = 'La date limite de candidature est dépassée';
        }
      }
      
      this.snackBar.open(message || 'Impossible de postuler à ce projet', 'Fermer', {
        duration: 3000
      });
      return;
    }

    this.isLoading = true;
    
    this.candidatureService.emailDejaPostule(user.email, projet.id).subscribe({
      next: (dejaPostule) => {
        this.isLoading = false;
        
        if (dejaPostule) {
          this.snackBar.open('Vous avez déjà postulé à ce projet', 'Fermer', {
            duration: 3000
          });
          return;
        }

        console.log('✅ Navigation vers formulaire de candidature:', projet.id);
        this.router.navigate(['/features/candidats/postuler', projet.id]);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Erreur vérification candidature:', error);
        // En cas d'erreur de vérification, on laisse passer quand même
        this.router.navigate(['/features/candidats/postuler', projet.id]);
      }
    });
  }

  getUrgenceCandidature(projet: Project): string {
    if (!projet.dateLimiteCandidature) return '';
    
    try {
      const aujourdhui = new Date();
      const dateLimite = new Date(projet.dateLimiteCandidature);
      const diffTime = dateLimite.getTime() - aujourdhui.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'expiree';
      if (diffDays <= 3) return 'urgent';
      if (diffDays <= 7) return 'bientot';
      return '';
    } catch (error) {
      return '';
    }
  }

  getUrgenceText(projet: Project): string {
    const urgence = this.getUrgenceCandidature(projet);
    
    switch (urgence) {
      case 'expiree': return 'Date limite dépassée';
      case 'urgent': return 'Derniers jours pour postuler';
      case 'bientot': return 'Date limite approche';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    return ProjectWorkflow.getStatusLabel(status as any);
  }
}