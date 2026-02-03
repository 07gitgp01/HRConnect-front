import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';

import { Project, ProjectWorkflow } from '../../models/projects.model';
import { ProjectService } from '../../services/service_projects/projects.service';
import { CandidatureService } from '../../services/service_candi/candidature.service';

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

  constructor(
    private projectService: ProjectService,
    private candidatureService: CandidatureService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.chargerProjets();
  }

  chargerProjets(): void {
    this.isLoading = true;
    this.hasError = false;

    // ✅ CORRECTION : getProjetsPublic() utilise maintenant les statuts 'actif'
    this.projectService.getProjetsPublic().subscribe({
      next: (projets: Project[]) => {
        this.projets = projets;
        this.projetsFiltres = [...projets];
        this.extraireFiltres(projets);
        this.isLoading = false;
        
        console.log(`✅ ${projets.length} projets publics chargés (statut: actif)`);
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

  private extraireFiltres(projets: Project[]): void {
  // Régions
  const regionsFiltrees = projets
    .map(p => p.regionAffectation)
    .filter((r: string | undefined): r is string => !!r && r.trim() !== '');
  
  this.regions = [...new Set(regionsFiltrees)].sort();

  // Domaines d'activité
  const domainesFiltres = projets
    .map(p => p.domaineActivite)
    .filter((d: string | undefined): d is string => !!d && d.trim() !== '');
  
  this.domaineActivites = [...new Set(domainesFiltres)].sort();

  // ✅ CORRECTION : Types de mission avec conversion explicite en string
  const typesMission = projets
    .map(p => p.type_mission)
    .filter((t): t is NonNullable<Project['type_mission']> => 
      t !== undefined && t !== null
    )
    .map(t => String(t)); // Conversion en string pour garantir le type

  this.typeMissions = [...new Set(typesMission)].sort();

  console.log('🔍 Filtres extraits:', {
    regions: this.regions,
    domaines: this.domaineActivites,
    typesMission: this.typeMissions
  });
}

  appliquerFiltres(): void {
    let projetsFiltres = [...this.projets];

    // Filtre recherche
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

    // Filtre région
    if (this.regionSelectionnee) {
      projetsFiltres = projetsFiltres.filter(projet =>
        projet.regionAffectation === this.regionSelectionnee
      );
    }

    // Filtre domaine
    if (this.domaineSelectionne) {
      projetsFiltres = projetsFiltres.filter(projet =>
        projet.domaineActivite === this.domaineSelectionne
      );
    }

    // Filtre type de mission
    if (this.typeMissionSelectionne) {
      projetsFiltres = projetsFiltres.filter(projet =>
        projet.type_mission === this.typeMissionSelectionne
      );
    }

    this.projetsFiltres = projetsFiltres;
    
    console.log(`🔍 Filtres appliqués: ${this.projetsFiltres.length} projets sur ${this.projets.length}`);
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

  // Méthodes utilitaires
  getCompetencesText(competences: string[] | string | undefined): string {
    if (!competences) return 'Aucune compétence spécifiée';
    
    if (Array.isArray(competences)) {
      if (competences.length === 0) return 'Aucune compétence spécifiée';
      return competences.slice(0, 3).join(', ') + 
             (competences.length > 3 ? `... (+${competences.length - 3})` : '');
    }
    
    return competences.length > 100 
      ? competences.substring(0, 100) + '...' 
      : competences;
  }

  getCompetencesList(competences: string[] | string | undefined): string[] {
    if (!competences) return [];
    
    if (Array.isArray(competences)) {
      return competences;
    }
    
    return competences.split(',').map(c => c.trim()).filter(c => c.length > 0);
  }

  getVolontairesManquants(projet: Project): number {
    const requis = projet.nombreVolontairesRequis || 0;
    const actuels = projet.nombreVolontairesActuels || 0;
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

  // ✅ CORRECTION : Utilisation de la méthode du service pour vérifier si on peut postuler
  peutPostuler(projet: Project): boolean {
    return this.projectService.canApplyToProject(projet);
  }

  postuler(projet: Project): void {
    if (!projet.id) {
      this.snackBar.open('Impossible de postuler à ce projet', 'Fermer', {
        duration: 3000
      });
      return;
    }

    // ✅ CORRECTION : Vérification via la méthode du service
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

    const confirmation = confirm(`Souhaitez-vous postuler au projet "${projet.titre}" ?`);
    
    if (confirmation) {
      this.isLoading = true;
      
      const nouvelleCandidature = {
        projectId: projet.id,
        projetTitre: projet.titre,
        dateCandidature: new Date().toISOString(),
        statut: 'en_attente'
      };

      this.candidatureService.createCandidature(nouvelleCandidature).subscribe({
        next: () => {
          this.snackBar.open('Candidature envoyée avec succès !', 'Fermer', {
            duration: 3000
          });
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Erreur envoi candidature:', error);
          this.snackBar.open('Erreur lors de l\'envoi de la candidature', 'Fermer', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });
    }
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

  // ✅ CORRECTION : Nouvelle méthode pour obtenir le label du statut
  getStatusLabel(status: string): string {
    return ProjectWorkflow.getStatusLabel(status as any);
  }
}