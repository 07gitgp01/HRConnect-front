// src/app/features/partenaires/detail-projet/detail-projet.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartenaireService } from '../../services/service_parten/partenaire.service';
import { AuthService } from '../../services/service_auth/auth.service';

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-detail-projet',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './detail-projet.component.html',
  styleUrls: ['./detail-projet.component.scss']
})
export class DetailProjetComponent implements OnInit {
  projet: any = null;
  isLoading = true;
  erreurChargement = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private partenaireService: PartenaireService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProjet();
  }

  loadProjet(): void {
    this.isLoading = true;
    this.erreurChargement = '';

    const projetId = this.route.snapshot.paramMap.get('id');
    console.log('🔄 Chargement détail projet ID:', projetId);
    
    if (!projetId) {
      this.erreurChargement = 'ID du projet non spécifié';
      this.isLoading = false;
      return;
    }

    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user && user.id) {
          const partenaireId = user.id;
          
          console.log('👤 Utilisateur connecté - Partenaire ID:', partenaireId);
          
          // Méthode SIMPLE : Charger tous les projets et filtrer
          this.partenaireService.getProjetsAvecCandidatures(partenaireId).subscribe({
            next: (projets) => {
              console.log('📋 Projets chargés:', projets.length);
              console.log('🔍 Recherche projet ID:', projetId, 'parmi:', projets.map(p => p.id));
              
              // Recherche robuste - comparer en string
              const projetTrouve = projets.find((p: any) => {
                return p.id?.toString() === projetId.toString();
              });

              if (projetTrouve) {
                console.log('✅ Projet trouvé:', projetTrouve);
                this.projet = this.normaliserProjet(projetTrouve);
                this.isLoading = false;
              } else {
                console.warn('❌ Projet non trouvé');
                this.erreurChargement = 'Projet non trouvé ou accès non autorisé';
                this.isLoading = false;
              }
            },
            error: (err) => {
              console.error('❌ Erreur chargement projets:', err);
              this.erreurChargement = 'Erreur lors du chargement des données';
              this.isLoading = false;
            }
          });
        } else {
          this.erreurChargement = 'Utilisateur non connecté';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('❌ Erreur authentification:', err);
        this.erreurChargement = 'Erreur d\'authentification';
        this.isLoading = false;
      }
    });
  }

  /**
   * Normalise les données du projet pour assurer la cohérence
   */
  private normaliserProjet(projet: any): any {
    if (!projet) return null;

    return {
      ...projet,
      id: projet.id,
      title: projet.title || projet.titre || 'Sans titre',
      description: projet.description || '',
      region: projet.region || 'Non spécifiée',
      type: projet.type || 'Non spécifié',
      status: this.normaliserStatut(projet.status || projet.statut),
      startDate: projet.startDate || projet.dateDebut,
      endDate: projet.endDate || projet.dateFin,
      duree: projet.duree || this.calculateDuree(projet.startDate, projet.endDate),
      neededVolunteers: projet.neededVolunteers || projet.volontairesRequises || 0,
      competences_requises: projet.competences_requises,
      equipement_necessaire: projet.equipement_necessaire,
      conditions_particulieres: projet.conditions_particulieres,
      contact_responsable: projet.contact_responsable,
      email_contact: projet.email_contact,
      budget: projet.budget,
      objectifs: projet.objectifs,
      // Propriétés calculées (utiliser celles déjà fournies par le service)
      total_candidatures: projet.total_candidatures || 0,
      candidatures_en_attente: projet.candidatures_en_attente || projet.nouvellesCandidatures || 0,
      volontairesAffectes: projet.volontairesAffectes || projet.currentVolunteers || 0
    };
  }

  /**
   * Normalise les statuts pour une cohérence
   */
  private normaliserStatut(statut: string): string {
    if (!statut) return 'soumis';
    
    const statutsNormalises: { [key: string]: string } = {
      'submitted': 'soumis',
      'pending': 'soumis',
      'planned': 'planifié',
      'scheduled': 'planifié',
      'active': 'en cours',
      'in_progress': 'en cours',
      'completed': 'clôturé',
      'finished': 'clôturé',
      'closed': 'clôturé',
      'overdue': 'en retard',
      'late': 'en retard',
      'clôturé': 'clôturé',
      'soumis': 'soumis',
      'planifié': 'planifié',
      'en cours': 'en cours'
    };

    const statutLower = statut.toLowerCase();
    return statutsNormalises[statutLower] || statut;
  }

  calculateDuree(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      return diffWeeks;
    } catch {
      return 0;
    }
  }

  getStatutBadgeClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'soumis': 'badge-soumis',
      'planifié': 'badge-planifie',
      'en cours': 'badge-en-cours',
      'clôturé': 'badge-cloture',
      'en retard': 'badge-en-retard'
    };
    return classes[statut] || 'badge-soumis';
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'soumis': 'Soumis',
      'planifié': 'Planifié',
      'en cours': 'En cours',
      'clôturé': 'Clôturé',
      'en retard': 'En retard'
    };
    return labels[statut] || statut;
  }

  canEdit(projet: any): boolean {
    if (!projet) return false;
    const statut = projet.status || '';
    return statut === 'soumis' || statut === 'planifié';
  }

  formatDate(date: string): string {
    if (!date) return 'Non définie';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  }

  // Méthode pour réessayer le chargement (utilisée dans le template)
  reloadProjet(): void {
    this.loadProjet();
  }
}