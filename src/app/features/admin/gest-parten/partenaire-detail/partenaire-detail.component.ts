import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Partenaire } from '../../../models/partenaire.model';
import { PartenaireService } from '../../../services/service_parten/partenaire.service';
import { PermissionService } from '../../../services/permission.service';
import { RapportsPtfConsultationService } from '../../../services/rap_ptf_consul/rapports-ptf-consultation.service';

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

  // ✅ Stats PTF (rapports) — uniquement peuplé si isPTF
  statsPTF: {
    totalRapports:        number;
    rapportsConsultes:    number;
    rapportsNonConsultes: number;
    tauxConsultation:     number;
    derniereConsultation: string | null;
  } | null = null;

  constructor(
    private route:            ActivatedRoute,
    private router:           Router,
    private partenaireService: PartenaireService,
    private permissionService: PermissionService,
    private rapportService:   RapportsPtfConsultationService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPartenaire(id);
    } else {
      this.isLoading = false;
    }
  }

  loadPartenaire(id: string): void {
    this.partenaireService.getById(id).subscribe({
      next: (data) => {
        this.partenaire = data;
        this.isLoading  = false;

        // ✅ Selon le type, charger les bonnes données
        if (this.permissionService.estPTF(data)) {
          this.loadStatsPTF(id);
        } else {
          this.loadProjets(id);
        }
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Chargement stats rapports pour PTF ───────────────────────────────────
  private loadStatsPTF(partenaireId: string): void {
    this.rapportService.getStatsConsultation(partenaireId).subscribe({
      next: (stats) => {
        const total = stats.totalRapports ?? 0;
        const lus   = stats.rapportsConsultes ?? 0;
        this.statsPTF = {
          totalRapports:        total,
          rapportsConsultes:    lus,
          rapportsNonConsultes: Math.max(0, total - lus),
          tauxConsultation:     stats.tauxConsultation ?? 0,
          derniereConsultation: stats.derniereConsultation ?? null
        };
      },
      error: () => {
        this.statsPTF = {
          totalRapports: 0, rapportsConsultes: 0, rapportsNonConsultes: 0,
          tauxConsultation: 0, derniereConsultation: null
        };
      }
    });
  }

  // ── Chargement projets pour structures d'accueil ─────────────────────────
  loadProjets(partenaireId: string): void {
    this.partenaireService.getProjetsAvecCandidatures(partenaireId).subscribe({
      next:  (data) => { this.projets = data; },
      error: ()     => { this.projets = []; }
    });
  }

  // ── Indicateur PTF ────────────────────────────────────────────────────────
  estPTF(): boolean {
    return this.partenaire ? this.permissionService.estPTF(this.partenaire) : false;
  }

  // ─── Statistiques projets (structure d'accueil) ──────────────────────────

  getTotalVolontairesAffectes(): number {
    return this.projets.reduce((t, p) => t + (p.volontairesAffectes ?? 0), 0);
  }

  getTotalCandidatures(): number {
    return this.projets.reduce((t, p) => t + (p.total_candidatures ?? 0), 0);
  }

  getCandidaturesEnAttente(): number {
    return this.projets.reduce((t, p) => t + (p.candidatures_en_attente ?? 0), 0);
  }

  // ─── Badges ──────────────────────────────────────────────────────────────

  getStatusBadgeClass(actif: boolean | undefined): string {
    return actif ? 'badge bg-success' : 'badge bg-secondary';
  }

  getStatusText(actif: boolean | undefined): string {
    return actif ? 'Actif' : 'Inactif';
  }

  getStatutProjetColor(statutProjet: string): string {
    const colors: { [k: string]: string } = {
      'actif': 'bg-success', 'en_attente': 'bg-warning text-dark', 'cloture': 'bg-secondary'
    };
    return colors[statutProjet] || 'bg-light text-dark';
  }

  getStatutProjetLabel(statutProjet: string): string {
    const labels: { [k: string]: string } = {
      'actif': 'Actif', 'en_attente': 'En attente', 'cloture': 'Clôturé'
    };
    return labels[statutProjet] || statutProjet;
  }

  getTypeColor(partenaire: Partenaire): string {
    const colors: { [k: string]: string } = {
      'Public-Administration': 'bg-primary', 'Public-Collectivite': 'bg-success',
      'SocieteCivile': 'bg-info', 'SecteurPrive': 'bg-warning',
      'PTF': 'bg-purple', 'InstitutionAcademique': 'bg-secondary'
    };
    return colors[partenaire.typeStructures?.[0] || ''] || 'bg-secondary';
  }

  getTypeDisplay(partenaire: Partenaire): string {
    const types: { [k: string]: string } = {
      'Public-Administration': 'Administration Publique', 'Public-Collectivite': 'Collectivité Territoriale',
      'SocieteCivile': 'Société Civile', 'SecteurPrive': 'Secteur Privé',
      'PTF': 'Partenaire Technique et Financier', 'InstitutionAcademique': 'Institution Académique'
    };
    const t = partenaire.typeStructures?.[0];
    return t ? (types[t] || t) : 'Non spécifié';
  }

  peutCreerProjets(): boolean {
    return this.partenaire?.permissions?.peutCreerProjets || false;
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  goBack():         void { this.router.navigate(['/features/admin/partenaires']); }
  editPartenaire(): void { if (this.partenaire?.id) this.router.navigate(['/features/admin/partenaires/edit', this.partenaire.id]); }
  voirProjets():    void { if (this.partenaire?.id) this.router.navigate(['/features/admin/projets'], { queryParams: { partenaire: this.partenaire.id } }); }
  creerProjet():    void { if (this.partenaire?.id) this.router.navigate(['/features/admin/projets/creer'], { queryParams: { partenaireId: this.partenaire.id } }); }
}