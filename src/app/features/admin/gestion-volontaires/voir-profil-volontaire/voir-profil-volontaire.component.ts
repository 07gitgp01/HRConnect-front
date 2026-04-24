// src/app/features/admin/gestion-volontaires/voir-profil-volontaire/voir-profil-volontaire.component.ts

import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AdminCandidatService } from '../../../services/service_candidats/admin-candidat.service';
import { VolontaireService, calculerCompletionProfil } from '../../../services/service_volont/volontaire.service';
import { AffectationService, Mission } from '../../../services/service-affecta/affectation.service';
import { ProjectService } from '../../../services/service_projects/projects.service';
import { UploadService } from '../../../services/upload.service'; // ✅ AJOUTER
import { Volontaire } from '../../../models/volontaire.model';
import { User } from '../../../models/user.model';
import { ProjectDetailDialogComponent } from '../../gest-projets/project-detail-dialog/project-detail-dialog.component';

interface CandidatComplet {
  user: User;
  volontaire: Volontaire;
}

@Component({
  selector: 'app-voir-profil-volontaire',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './voir-profil-volontaire.component.html',
  styleUrls: ['./voir-profil-volontaire.component.css']
})
export class VoirProfilVolontaireComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  candidat: CandidatComplet | null = null;
  isLoading = true;
  isLoadingMissions = false;
  profilCompletion = 0;
  volontaireId!: number | string;
  
  missionActive: Mission | null = null;
  missionsTerminees: Mission[] = [];
  dataSource = new MatTableDataSource<Mission>([]);
  displayedColumns: string[] = [
    'projetTitre', 
    'projetRegion', 
    'dateAffectation', 
    'dateFin', 
    'role', 
    'actions'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminCandidatService: AdminCandidatService,
    private affectationService: AffectationService,
    private projectService: ProjectService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private uploadService: UploadService // ✅ AJOUTER
  ) {}

  ngOnInit(): void {
    this.volontaireId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.volontaireId) {
      this.router.navigate(['/features/admin/comptes/gestion-candidats']);
      return;
    }
    this.chargerProfil();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Custom sort pour les dates
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch(property) {
        case 'dateAffectation':
        case 'dateFin':
          return new Date(item[property as keyof Mission] as string).getTime();
        default:
          return (item as any)[property];
      }
    };
  }

  private chargerProfil(): void {
    this.isLoading = true;
    this.adminCandidatService.getCandidatById(this.volontaireId).subscribe({
      next: (candidat) => {
        if (!candidat) {
          this.router.navigate(['/features/admin/comptes/gestion-candidats']);
          return;
        }
        this.candidat = candidat;
        this.profilCompletion = calculerCompletionProfil(candidat.volontaire);
        this.isLoading = false;
        
        this.chargerMissions();
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/features/admin/comptes/gestion-candidats']);
      }
    });
  }

  /**
   * Charge les missions du volontaire
   */
  private chargerMissions(): void {
    if (!this.candidat?.volontaire.id) return;
    
    this.isLoadingMissions = true;
    
    this.affectationService.getAllAffectationsWithDetails().subscribe({
      next: (missionsMap) => {
        const toutesMissions = missionsMap.get(this.candidat!.volontaire.id!) || [];
        
        this.missionActive = toutesMissions.find(m => m.statut === 'active') || null;
        this.missionsTerminees = toutesMissions
          .filter(m => m.statut !== 'active')
          .sort((a, b) => 
            new Date(b.dateFin || b.dateAffectation).getTime() - 
            new Date(a.dateFin || a.dateAffectation).getTime()
          );
        
        this.dataSource.data = this.missionsTerminees;
        this.isLoadingMissions = false;
      },
      error: () => {
        this.isLoadingMissions = false;
      }
    });
  }

  // ==================== HELPERS ====================

  getStatutConfig(statut: string): { label: string; icon: string; classe: string } {
    const configs: Record<string, { label: string; icon: string; classe: string }> = {
      'Candidat':   { label: 'Candidat',   icon: 'person',        classe: 'statut-candidat'   },
      'En attente': { label: 'En attente', icon: 'hourglass_top', classe: 'statut-en-attente'  },
      'Actif':      { label: 'Actif',      icon: 'verified',      classe: 'statut-actif'       },
      'Inactif':    { label: 'Inactif',    icon: 'block',         classe: 'statut-inactif'     },
      'Refusé':     { label: 'Refusé',     icon: 'cancel',        classe: 'statut-refuse'      }
    };
    return configs[statut] ?? { label: statut, icon: 'help', classe: '' };
  }

  getSexeLabel(sexe: string): string {
    return sexe === 'M' ? 'Masculin' : sexe === 'F' ? 'Féminin' : '—';
  }

  getCompetencesArray(competences: any): string[] {
    if (!competences) return [];
    if (Array.isArray(competences)) return competences.filter(Boolean);
    return String(competences).split(',').map(c => c.trim()).filter(Boolean);
  }

  formatDate(date?: string): string {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
    } catch { return '—'; }
  }

  formatDateCourt(date?: string): string {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch { return '—'; }
  }

  getProfilCircleOffset(): number {
    const circonference = 339.29;
    return circonference - (this.profilCompletion / 100) * circonference;
  }

  /**
   * ✅ CORRIGÉ : Utilise UploadService pour construire l'URL complète
   */
  ouvrirDocument(url: string | undefined, type: 'cv' | 'identity'): void {
    if (!url) {
      this.snackBar.open(`Aucun ${type === 'cv' ? 'CV' : 'document'} trouvé`, 'Fermer', { duration: 3000 });
      return;
    }
    
    const fullUrl = this.uploadService.getFullUrl(url);
    console.log(`📄 Ouverture ${type}:`, fullUrl);
    window.open(fullUrl, '_blank');
  }

  /**
   * ✅ Vérifie si un document existe
   */
  verifierDocument(url: string | undefined, type: 'cv' | 'identity'): void {
    if (!url) {
      this.snackBar.open(`Aucun ${type === 'cv' ? 'CV' : 'document'} trouvé`, 'Fermer', { duration: 3000 });
      return;
    }
    
    this.uploadService.checkFileExists(url).subscribe({
      next: (exists) => {
        if (exists) {
          this.snackBar.open(`✅ ${type === 'cv' ? 'CV' : 'Document'} accessible`, 'Fermer', { duration: 3000 });
        } else {
          this.snackBar.open(`❌ ${type === 'cv' ? 'CV' : 'Document'} introuvable sur le serveur`, 'Fermer', { duration: 5000 });
        }
      }
    });
  }

  retour(): void {
    this.router.navigate(['/features/admin/volontaires/']);
  }

  editer(): void {
    this.router.navigate(['/features/admin/comptes/editer-candidat', this.volontaireId]);
  }

  // ==================== MÉTHODE POUR VOIR LA MISSION ====================

  /**
   * Ouvre le détail de la mission dans un dialogue modal
   */
  voirMission(projetId: string | number): void {
    console.log('🔍 Chargement du projet:', projetId);
    
    this.projectService.getProject(projetId).subscribe({
      next: (project) => {
        console.log('✅ Projet chargé:', project);
        
        const dialogRef = this.dialog.open(ProjectDetailDialogComponent, {
          width: '900px',
          maxWidth: '95vw',
          data: { project },
          disableClose: false,
          autoFocus: false
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result === 'refresh') {
            console.log('🔄 Rafraîchissement après fermeture du dialogue');
            this.chargerMissions();
          }
        });
      },
      error: (err) => {
        console.error('❌ Erreur chargement projet:', err);
        this.snackBar.open(
          '❌ Erreur lors du chargement de la mission', 
          'Fermer', 
          { duration: 3000, panelClass: 'snackbar-error' }
        );
      }
    });
  }

  // ==================== FILTRES TABLEAU ====================

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getDateInscription(): string {
  // Essayer date_inscription du user (frontend)
  if (this.candidat?.user?.date_inscription) {
    return this.formatDateInscription(this.candidat.user.date_inscription);
  }
  
  // Essayer dateInscription du user (backend)
  /* if (this.candidat?.user?.dateInscription) {
    return this.formatDateInscription(this.candidat.user.dateInscription);
  } */
  
  // Fallback sur dateInscription du volontaire
  if (this.candidat?.volontaire?.dateInscription) {
    return this.formatDateInscription(this.candidat.volontaire.dateInscription);
  }
  
  // Fallback sur createdAt du volontaire
  /* if (this.candidat?.volontaire?.createdAt) {
    return this.formatDateInscription(this.candidat.volontaire.createdAt);
  } */
  
  return 'Non renseignée';
}

/**
 * ✅ Formatage de la date d'inscription
 */
formatDateInscription(dateString: string): string {
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