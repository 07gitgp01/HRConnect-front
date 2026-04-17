// src/app/features/partenaires/gestion-rapports/gestion-rapports.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/service_auth/auth.service';
import { PartenaireService } from '../../services/service_parten/partenaire.service';
import { 
  Rapport, 
  TypeRapport, 
  RapportStatistiques,
  PieceJointe 
} from '../../models/rapport.model';
import { RapportService } from '../../services/rap_parten/rapport.service';

@Component({
  selector: 'app-gestion-rapports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-rapports.component.html',
  styleUrls: ['./gestion-rapports.component.scss']
})
export class GestionRapportsComponent implements OnInit {
  // Données
  rapports: Rapport[] = [];
  typesRapport: TypeRapport[] = [];
  statistiques: RapportStatistiques = {
    total: 0,
    soumis: 0,
    enRetard: 0,
    valides: 0,
    brouillons: 0,
    tauxSoumission: 0,
    prochainsEcheances: [],
    rapportsEnRetard: []
  };
  
  partenaire: any = null;
  
  // Filtres
  filtres = {
    statut: 'tous',
    type: 'tous',
    recherche: '',
    dateDebut: '',
    dateFin: ''
  };
  
  // Pagination
  pageCourante = 1;
  rapportsParPage = 10;
  
  // États UI
  isLoading = true;
  showModalNouveau = false;
  showModalDetail = false;
  
  // Formulaire
  nouveauRapport: any = {
    typeRapportId: null as number | null,
    titre: '',
    description: '',
    projetId: null as number | null,
    missionId: null as number | null
  };
  
  rapportSelectionne?: Rapport;

  constructor(
    private rapportService: RapportService,
    private authService: AuthService,
    private partenaireService: PartenaireService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.chargerDonnees();
  }

  chargerDonnees(): void {
    this.isLoading = true;
    
    const user = this.authService.getCurrentUser();
    if (!user?.email) {
      this.router.navigate(['/login']);
      return;
    }

    // Charger le partenaire
    this.partenaireService.getPartenaireByEmail(user.email).subscribe({
      next: (partenaire) => {
        this.partenaire = partenaire;
        
        if (!partenaire?.id) {
          this.isLoading = false;
          return;
        }
        
        // Charger les types de rapport
        this.rapportService.getTypesRapport().subscribe(types => {
          this.typesRapport = types;
          
          // Charger les rapports
          this.rapportService.getRapportsParPartenaire(partenaire.id!).subscribe({
            next: (rapports) => {
              this.rapports = rapports;
              this.calculerStatistiques();
              this.isLoading = false;
            },
            error: () => {
              this.isLoading = false;
            }
          });
        });
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/login']);
      }
    });
  }

  calculerStatistiques(): void {
    const maintenant = new Date();
    
    const rapportsEnRetard = this.rapports.filter(r => {
      if (r.statut === 'soumis' || r.statut === 'valide') return false;
      return new Date(r.dateEcheance) < maintenant;
    });

    const prochainsEcheances = this.rapports
      .filter(r => r.statut === 'brouillon')
      .filter(r => new Date(r.dateEcheance) > maintenant)
      .sort((a, b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime())
      .slice(0, 5);

    const soumisOuValides = this.rapports.filter(r => r.statut === 'soumis' || r.statut === 'valide').length;
    
    this.statistiques = {
      total: this.rapports.length,
      soumis: this.rapports.filter(r => r.statut === 'soumis').length,
      enRetard: rapportsEnRetard.length,
      valides: this.rapports.filter(r => r.statut === 'valide').length,
      brouillons: this.rapports.filter(r => r.statut === 'brouillon').length,
      tauxSoumission: this.rapports.length > 0 
        ? Math.round((soumisOuValides / this.rapports.length) * 100)
        : 0,
      prochainsEcheances,
      rapportsEnRetard
    };
  }

  // ==================== FILTRES ====================

  appliquerFiltres(): void {
    this.pageCourante = 1;
  }

  resetFiltres(): void {
    this.filtres = {
      statut: 'tous',
      type: 'tous',
      recherche: '',
      dateDebut: '',
      dateFin: ''
    };
    this.appliquerFiltres();
  }

  getRapportsFiltres(): Rapport[] {
    let filtres = [...this.rapports];
    
    if (this.filtres.statut !== 'tous') {
      filtres = filtres.filter(r => r.statut === this.filtres.statut);
    }
    
    if (this.filtres.type !== 'tous') {
      const typeId = parseInt(this.filtres.type);
      if (!isNaN(typeId)) {
        filtres = filtres.filter(r => r.typeRapportId === typeId);
      }
    }
    
    if (this.filtres.recherche) {
      const recherche = this.filtres.recherche.toLowerCase();
      filtres = filtres.filter(r => 
        r.titre.toLowerCase().includes(recherche) ||
        (r.description && r.description.toLowerCase().includes(recherche))
      );
    }
    
    if (this.filtres.dateDebut) {
      const dateDebut = new Date(this.filtres.dateDebut);
      filtres = filtres.filter(r => new Date(r.dateCreation) >= dateDebut);
    }
    
    if (this.filtres.dateFin) {
      const dateFin = new Date(this.filtres.dateFin);
      filtres = filtres.filter(r => new Date(r.dateCreation) <= dateFin);
    }
    
    return filtres;
  }

  getRapportsPagination(): Rapport[] {
    const rapportsFiltres = this.getRapportsFiltres();
    const debut = (this.pageCourante - 1) * this.rapportsParPage;
    const fin = debut + this.rapportsParPage;
    return rapportsFiltres.slice(debut, fin);
  }

  // ==================== ACTIONS ====================

  ouvrirModalNouveau(): void {
    this.nouveauRapport = {
      typeRapportId: null,
      titre: '',
      description: '',
      projetId: null,
      missionId: null
    };
    this.showModalNouveau = true;
  }

  creerRapport(): void {
    if (!this.nouveauRapport.typeRapportId || !this.nouveauRapport.titre.trim()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!this.partenaire?.id) {
      alert('Partenaire non trouvé');
      return;
    }

    const typeRapportId = parseInt(this.nouveauRapport.typeRapportId);
    if (isNaN(typeRapportId)) {
      alert('Type de rapport invalide');
      return;
    }

    const rapportData = {
      typeRapportId: typeRapportId,
      titre: this.nouveauRapport.titre.trim(),
      description: this.nouveauRapport.description.trim(),
      partenaireId: this.partenaire.id,
      projetId: this.nouveauRapport.projetId,
      missionId: this.nouveauRapport.missionId
    };

    this.rapportService.creerRapport(rapportData).subscribe({
      next: (rapport) => {
        this.rapports.unshift(rapport);
        this.calculerStatistiques();
        this.showModalNouveau = false;
        this.router.navigate([`/features/partenaires/rapports/${rapport.id}/editer`]);
      },
      error: (error) => {
        console.error('Erreur création rapport:', error);
        alert('Erreur lors de la création du rapport');
      }
    });
  }

  voirDetail(rapport: Rapport): void {
    this.rapportSelectionne = rapport;
    this.showModalDetail = true;
  }

  editerRapport(rapport: Rapport): void {
    this.router.navigate([`/features/partenaires/rapports/${rapport.id}/editer`]);
  }

  soumettreRapport(rapport: Rapport): void {
    if (confirm('Êtes-vous sûr de vouloir soumettre ce rapport ?')) {
      this.rapportService.soumettreRapport(rapport.id).subscribe({
        next: () => {
          rapport.statut = 'soumis';
          rapport.dateSoumission = new Date().toISOString();
          this.calculerStatistiques();
        },
        error: () => {
          alert('Erreur lors de la soumission du rapport');
        }
      });
    }
  }

  dupliquerRapport(rapport: Rapport): void {
    const nouveauRapport = {
      titre: `${rapport.titre} (Copie)`,
      description: rapport.description,
      typeRapportId: rapport.typeRapportId,
      partenaireId: this.partenaire?.id,
      projetId: rapport.projetId,
      missionId: rapport.missionId,
      contenu: rapport.contenu
    };

    this.rapportService.creerRapport(nouveauRapport).subscribe({
      next: (rapportDuplique) => {
        this.rapports.unshift(rapportDuplique);
        this.calculerStatistiques();
        this.editerRapport(rapportDuplique);
      },
      error: (error) => {
        console.error('Erreur duplication rapport:', error);
        alert('Erreur lors de la duplication du rapport');
      }
    });
  }

  supprimerRapport(rapport: Rapport): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
      // Dans une vraie app, appeler l'API de suppression
      this.rapports = this.rapports.filter(r => r.id !== rapport.id);
      this.calculerStatistiques();
    }
  }

  telechargerRapport(rapport: Rapport): void {
    this.rapportService.genererRapportPDF(rapport.id).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${rapport.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  // ==================== UTILITAIRES ====================

  getStatutBadgeClass(statut: string): string {
    const classes: {[key: string]: string} = {
      'brouillon': 'bg-secondary',
      'soumis': 'bg-info',
      'valide': 'bg-success',
      'rejete': 'bg-danger',
      'en_retard': 'bg-warning'
    };
    return classes[statut] || 'bg-secondary';
  }

  getStatutTexte(statut: string): string {
    const textes: {[key: string]: string} = {
      'brouillon': 'Brouillon',
      'soumis': 'Soumis',
      'valide': 'Validé',
      'rejete': 'Rejeté',
      'en_retard': 'En retard'
    };
    return textes[statut] || statut;
  }

  getTypeRapportLabel(typeId: number): string {
    const type = this.typesRapport.find(t => t.id === typeId);
    return type?.label || 'Type inconnu';
  }

  formaterDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formaterDateAvecHeure(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEcheanceInfo(rapport: Rapport): { texte: string; classe: string } {
    return this.rapportService.formaterDateEcheance(rapport.dateEcheance);
  }

  // ==================== PAGINATION ====================

  get totalPages(): number {
    return Math.ceil(this.getRapportsFiltres().length / this.rapportsParPage);
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.pageCourante = page;
    }
  }

  get pages(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let start = Math.max(1, this.pageCourante - Math.floor(maxPages / 2));
    let end = Math.min(this.totalPages, start + maxPages - 1);
    
    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Méthode utilitaire pour le template
  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}