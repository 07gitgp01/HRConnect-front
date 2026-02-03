// src/app/features/partenaires/partenaires-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PartenaireDashboardComponent } from './dashboard/dashboard.component';
import { DetailProjetComponent } from './detail-projet/detail-projet.component';
import { EditProjetComponent } from './edit-projet/edit-projet.component';
import { PartenaireActifGuard } from '../../core/guards/partenaire-actif.guard'; // ✅ AJOUT
import { PartenairePermissionGuard } from '../../core/guards/partenaire-permission.guard';
import { RapportsComponent } from './rapports/rapports.component';
import { OffresMissionComponent } from './offres-mission/offres-mission.component';
import { GestionRapportsComponent } from './gestion-rapports/gestion-rapports.component';
import { MesVolontairesComponent } from './mes-volontaires/mes-volontaires.component';
import { RapportsPnvbComponent } from './rap_au_ptf/rapports-pnvb/rapports-pnvb.component';
import { RapportListComponent } from './rap-eval-pnvb/rapport-list/rapport-list.component';
import { RapportFormComponent } from './rap-eval-pnvb/rapport-form/rapport-form.component';
import { RapportDetailComponent } from './rap-eval-pnvb/rapport-detail/rapport-detail.component';
import { VolontairesListComponent } from './volontaires-list/volontaires-list.component';
import { DetailOffreComponent } from './detail-offre/detail-offre.component';
import { EditerOffreComponent } from './editer-offre/editer-offre.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: PartenaireDashboardComponent,
    canActivate: [PartenaireActifGuard] // ✅ AJOUT - Activation seulement
  },
  // {
  //   path: 'projets',
  //   component: ProjetsPartenairesComponent,
  //   canActivate: [PartenaireActifGuard, PartenairePermissionGuard], // ✅ CORRECTION - Les deux guards
  //   data: { permission: 'gerer-candidatures' }
  // },
  // {
  //   path: 'soumettre',
  //   component: SoumettreProjetComponent,
  //   canActivate: [PartenaireActifGuard, PartenairePermissionGuard], // ✅ CORRECTION - Les deux guards
  //   data: { permission: 'soumettre-projet' }
  // },
  // {
  //   path: 'candidatures',
  //   component: CandidaturesRecuesComponent,
  //   canActivate: [PartenaireActifGuard, PartenairePermissionGuard], // ✅ CORRECTION - Les deux guards
  //   data: { permission: 'gerer-candidatures' }
  // },
  // {
  //   path: 'projets/:id',
  //   component: DetailProjetComponent,
  //   canActivate: [PartenaireActifGuard, PartenairePermissionGuard], // ✅ CORRECTION - Les deux guards
  //   data: { permission: 'gerer-candidatures' }
  // },
  // {
  //   path: 'projets/edit/:id',
  //   component: EditProjetComponent,
  //   canActivate: [PartenaireActifGuard, PartenairePermissionGuard], // ✅ CORRECTION - Les deux guards
  //   data: { permission: 'gerer-candidatures' }
  // },
  {
    path: 'rapports-pnvb',
    component: RapportsPnvbComponent,
    // canActivate: [PtfGuard] // Un guard qui vérifie si l'utilisateur est PTF
  },
  {
    path: 'rapports',
    children: [
      { path: '', component: RapportListComponent },
      { path: 'nouveau', component: RapportFormComponent },
      { path: ':id', component: RapportDetailComponent },
      { path: ':id/edit', component: RapportFormComponent }
    ]
  },
  {
   path: 'mes-volontaires',
   component: VolontairesListComponent,
    canActivate: [PartenaireActifGuard],
     data: { permission: 'gerer-volontaires' }
  },
  // {
  //   path: 'gestion-rapports',
  //   component: GestionRapportsComponent,
  //   canActivate: [PartenaireActifGuard],
  //   data: { permission: 'gerer-volontaires' }
  // },
  {
     path: 'offres-mission',
    component: OffresMissionComponent, // À créer
    // canActivate: [PartenaireActifGuard, PartenairePermissionGuard],
  data: { permission: 'soumettre-projet' }
 },
 { path: 'offres-mission/editer/:id', component: EditerOffreComponent },

       { path: 'offres-mission/:id', component: DetailOffreComponent }, // ← Cette route doit exister

  // {
  //   path: 'zone-ptf',
  //   component: ZonePtfComponent, // Vous devez créer ce composant
  //   // canActivate: [PartenaireActifGuard, PartenairePermissionGuard],
  //   // data: { permission: 'acces-ptf' }
  // },
  // {
  //   path: 'rapports',
  //   component: RapportsComponent, // Vous devez créer ce composant
  //   canActivate: [PartenaireActifGuard],
  //   data: { permission: 'acces-ptf' }
  // },
  // {
  //   path: 'statistiques',
  //   component: StatistiquesComponent, // Vous devez créer ce composant
  //   canActivate: [PartenaireActifGuard]
  // },
  // {
  //   path: 'profil',
  //   component: ProjetsPartenairesComponent, // Vous devez créer ce composant
  //   canActivate: [PartenaireActifGuard]
  // }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PartenairesRoutingModule { }