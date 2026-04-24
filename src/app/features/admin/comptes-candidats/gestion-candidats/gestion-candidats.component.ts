// src/app/features/admin/comptes/gestion-candidats/gestion-candidats.component.ts

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AdminCandidatService } from '../../../services/service_candidats/admin-candidat.service';
import { SyncService } from '../../../../features/services/sync.service';
import { User } from '../../../models/user.model';
import { Volontaire } from '../../../models/volontaire.model';
import { AuthService } from '../../../services/service_auth/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { skip, distinctUntilChanged } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { calculerCompletionProfil, estProfilComplet } from '../../../services/service_volont/volontaire.service';

interface CandidatComplet {
  user: User;
  volontaire: Volontaire;
}

@Component({
  selector: 'app-gestion-candidats',
  templateUrl: './gestion-candidats.component.html',
  styleUrls: ['./gestion-candidats.component.scss']
})
export class GestionCandidatsComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  candidats: CandidatComplet[] = [];
  isLoading = false;

  filtres = { statut: '', recherche: '' };

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  currentPage = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private adminCandidatService: AdminCandidatService,
    private syncService: SyncService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.chargerCandidats();

    this.syncService.volontaires$.pipe(
      skip(1),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      console.log('🔄 [GestionCandidats] volontaires$ → rechargement');
      this.chargerCandidats();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  chargerCandidats(): void {
    this.isLoading = true;
    this.adminCandidatService.getCandidatsAvecProfils().subscribe({
      next: candidats => {
        console.log('✅ [GestionCandidats] Candidats chargés:', candidats.length);
        this.candidats = candidats;
        this.isLoading = false;
        this.currentPage = 0;
      },
      error: error => {
        console.error('❌ [GestionCandidats] Erreur chargement candidats:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des candidats', 'Fermer', { duration: 3000 });
      }
    });
  }

  // ==================== PAGINATION ====================

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  get candidatsPaginees(): CandidatComplet[] {
    const start = this.currentPage * this.pageSize;
    return this.candidatsFiltres.slice(start, start + this.pageSize);
  }

  get totalCandidats(): number {
    return this.candidatsFiltres.length;
  }

  // ==================== FILTRES ====================

  appliquerFiltres(): void {
    this.currentPage = 0;
  }

  reinitialiserFiltres(): void {
    this.filtres.recherche = '';
    this.filtres.statut = '';
    this.currentPage = 0;
  }

  // ==================== ACTIONS ====================

  naviguerCreation(): void {
    if (!this.authService.isLoggedIn() || !this.authService.isAdmin()) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/features/admin/comptes/creer-candidat']);
  }

  desactiverCandidat(candidat: CandidatComplet): void {
    const nom = `${candidat.user.prenom} ${candidat.user.nom}`;
    
    if (!candidat.volontaire.id) {
      this.snackBar.open('Erreur: Identifiant volontaire manquant', 'Fermer', { duration: 3000 });
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir désactiver le compte de ${nom} ?`)) return;

    this.adminCandidatService.desactiverCandidat(
      candidat.user.id!,
      candidat.volontaire.id,
      candidat.volontaire.statut
    ).subscribe({
      next: () => {
        console.log(`✅ ${nom} désactivé`);
        this.snackBar.open('Candidat désactivé avec succès', 'Fermer', { duration: 3000 });
        this.chargerCandidats();
      },
      error: error => {
        console.error('❌ Erreur désactivation:', error);
        this.snackBar.open('Erreur lors de la désactivation', 'Fermer', { duration: 3000 });
      }
    });
  }

  reactiverCandidat(candidat: CandidatComplet): void {
    const nom = `${candidat.user.prenom} ${candidat.user.nom}`;
    
    if (!candidat.volontaire.id) {
      this.snackBar.open('Erreur: Identifiant volontaire manquant', 'Fermer', { duration: 3000 });
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir réactiver le compte de ${nom} ?`)) return;

    this.adminCandidatService.reactiverCandidat(candidat.volontaire.id).subscribe({
      next: v => {
        console.log(`✅ ${nom} réactivé → statut restauré : ${v.statut}`);
        this.snackBar.open(`Candidat réactivé avec succès (statut: ${v.statut})`, 'Fermer', { duration: 3000 });
        this.chargerCandidats();
      },
      error: error => {
        console.error('❌ Erreur réactivation:', error);
        this.snackBar.open('Erreur lors de la réactivation', 'Fermer', { duration: 3000 });
      }
    });
  }

  supprimerCandidat(candidat: CandidatComplet): void {
    const nom = `${candidat.user.prenom} ${candidat.user.nom}`;
    
    if (!candidat.user.id || !candidat.volontaire.id) {
      this.snackBar.open('Erreur: Identifiants manquants', 'Fermer', { duration: 3000 });
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${nom} ? Cette action est irréversible.`)) return;

    this.adminCandidatService.supprimerCandidat(
      candidat.user.id,
      candidat.volontaire.id
    ).subscribe({
      next: () => {
        console.log(`✅ ${nom} supprimé`);
        this.snackBar.open('Candidat supprimé avec succès', 'Fermer', { duration: 3000 });
        this.chargerCandidats();
      },
      error: error => {
        console.error('❌ Erreur suppression:', error);
        this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
      }
    });
  }

  // ==================== GETTERS FILTRES ====================

  get candidatsFiltres(): CandidatComplet[] {
    return this.candidats.filter(candidat => {
      const correspondRecherche = !this.filtres.recherche ||
        (candidat.user.nom || '').toLowerCase().includes(this.filtres.recherche.toLowerCase()) ||
        (candidat.user.prenom || '').toLowerCase().includes(this.filtres.recherche.toLowerCase()) ||
        candidat.user.email.toLowerCase().includes(this.filtres.recherche.toLowerCase());

      const correspondStatut = !this.filtres.statut ||
        candidat.volontaire.statut === this.filtres.statut;

      return correspondRecherche && correspondStatut;
    });
  }

  // ==================== HELPERS ====================

  // ✅ CORRECTION : Utiliser le vrai calcul de complétion du profil
  isProfilComplet(volontaire: Volontaire): boolean {
    return estProfilComplet(volontaire);
  }

  getProfilCompletion(volontaire: Volontaire): number {
    return calculerCompletionProfil(volontaire);
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'Actif': return 'badge bg-success';
      case 'Inactif': return 'badge bg-secondary';
      case 'En attente': return 'badge bg-warning';
      case 'Candidat': return 'badge bg-info';
      case 'Refusé': return 'badge bg-danger';
      default: return 'badge bg-light text-dark';
    }
  }

  getStatutKey(statut: string): string {
    const map: Record<string, string> = {
      'Candidat': 'candidat',
      'En attente': 'en_attente',
      'Actif': 'actif',
      'Inactif': 'inactif',
      'Refusé': 'refuse'
    };
    return map[statut] || 'candidat';
  }

  getDateInscription(candidat: CandidatComplet): string {
    if (candidat.volontaire.dateInscription) {
      return this.formatDate(candidat.volontaire.dateInscription);
    }
    if (candidat.user.date_inscription) {
      return this.formatDate(candidat.user.date_inscription);
    }
    if (candidat.volontaire.created_at) {
      return this.formatDate(candidat.volontaire.created_at);
    }
    return 'Non renseignée';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }
}