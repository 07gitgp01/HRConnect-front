import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Partenaire, TypeStructurePNVB } from '../../../models/partenaire.model';
import { PartenaireService } from '../../../services/service_parten/partenaire.service';

@Component({
  selector: 'app-partenaire-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './partenaire-detail.component.html',
  styleUrls: ['./partenaire-detail.component.css']
})
export class PartenaireDetailComponent implements OnInit {
  partenaire: Partenaire | null = null;
  projets: any[] = [];
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private partenaireService: PartenaireService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPartenaire(+id);
      this.loadProjets(+id);
    } else {
      this.isLoading = false;
    }
  }

  loadPartenaire(id: number): void {
    this.partenaireService.getById(id).subscribe({
      next: (data) => {
        this.partenaire = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement partenaire', err);
        this.isLoading = false;
      }
    });
  }

  loadProjets(partenaireId: number): void {
    this.partenaireService.getProjetsByPartenaire(partenaireId).subscribe({
      next: (data) => {
        this.projets = data;
      },
      error: (err) => {
        console.error('Erreur chargement projets', err);
        this.projets = [];
      }
    });
  }

  // Méthodes utilitaires pour l'affichage
  getStatusBadgeClass(actif: boolean | undefined): string {
    return actif ? 'badge bg-success' : 'badge bg-secondary';
  }

  getStatusText(actif: boolean | undefined): string {
    return actif ? 'Actif' : 'Inactif';
  }

  getTypeColor(partenaire: Partenaire): string {
    if (!partenaire.typeStructures || partenaire.typeStructures.length === 0) {
      return 'bg-secondary';
    }

    const premierType = partenaire.typeStructures[0];
    const colors: { [key: string]: string } = {
      'Public-Administration': 'bg-primary',
      'Public-Collectivite': 'bg-success',
      'SocieteCivile': 'bg-info',
      'SecteurPrive': 'bg-warning',
      'PTF': 'bg-purple',
      'InstitutionAcademique': 'bg-secondary'
    };
    return colors[premierType] || 'bg-secondary';
  }

  getTypeDisplay(partenaire: Partenaire): string {
    if (!partenaire.typeStructures || partenaire.typeStructures.length === 0) {
      return 'Non spécifié';
    }

    const premierType = partenaire.typeStructures[0];
    const types: { [key: string]: string } = {
      'Public-Administration': 'Administration Publique',
      'Public-Collectivite': 'Collectivité Territoriale',
      'SocieteCivile': 'Société Civile',
      'SecteurPrive': 'Secteur Privé',
      'PTF': 'Partenaire Technique et Financier',
      'InstitutionAcademique': 'Institution Académique'
    };
    return types[premierType] || premierType;
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'actif': 'bg-success',
      'en_cours': 'bg-success',
      'terminé': 'bg-secondary',
      'clôturé': 'bg-secondary',
      'en_attente': 'bg-warning',
      'soumis': 'bg-info',
      'brouillon': 'bg-light text-dark'
    };
    return statusColors[status?.toLowerCase()] || 'bg-light text-dark';
  }

  // Méthodes pour les statistiques
  getTotalVolontairesAffectes(): number {
    return this.projets.reduce((total, projet) => total + (projet.volontairesAffectes || 0), 0);
  }

  getTotalCandidatures(): number {
    return this.projets.reduce((total, projet) => total + (projet.total_candidatures || 0), 0);
  }

  getCandidaturesEnAttente(): number {
    return this.projets.reduce((total, projet) => total + (projet.candidatures_en_attente || 0), 0);
  }

  // Méthodes pour les permissions
  peutCreerProjets(): boolean {
    return this.partenaire?.permissions?.peutCreerProjets || false;
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/features/admin/partenaires']);
  }

  editPartenaire(): void {
    if (this.partenaire?.id) {
      this.router.navigate(['/features/admin/partenaires/edit', this.partenaire.id]);
    }
  }

  voirProjets(): void {
    if (this.partenaire?.id) {
      this.router.navigate(['/features/admin/projets'], { 
        queryParams: { partenaire: this.partenaire.id } 
      });
    }
  }

  creerProjet(): void {
    if (this.partenaire?.id) {
      this.router.navigate(['/features/admin/projets/creer'], {
        queryParams: { partenaireId: this.partenaire.id }
      });
    }
  }
}