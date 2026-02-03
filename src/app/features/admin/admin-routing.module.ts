// src/app/features/admin/admin-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { GestProjetsComponent } from './gest-projets/gest-projets.component';
import { GestionVolontairesComponent } from './gestion-volontaires/gestion-volontaires.component';
import { GestCandiComponent } from './gest-candi/gest-candi.component';
import { GestPartenComponent } from './gest-parten/gest-parten.component';
import { MessagesAdminComponent } from './messages-admin/messages-admin.component';
import { MessageDetailDialogComponent } from './message-detail-dialog/message-detail-dialog.component';
import { ResponseDialogComponent } from './response-dialog/response-dialog.component';
import { GestionAdminsComponent } from './gestion-admins/gestion-admins.component';
import { AdminRapportsPTFComponent } from './admin-rapports-ptf/admin-rapports-ptf.component';
import { RapportAdminListComponent } from './rap-pnvb-struct/rapport-admin-list/rapport-admin-list.component';
import { RapportAdminDetailComponent } from './rap-pnvb-struct/rapport-admin-detail/rapport-admin-detail.component';

const routes: Routes = [
  {
    path: '', 
    component: DashboardComponent
  },
  {
    path: 'projets',
    component: GestProjetsComponent,
    loadChildren: () => import('./gest-projets/gest-projets-routing.module').then(m => m.GestProjetsRoutingModule)
  },
  {
    path: 'volontaires', 
    component: GestionVolontairesComponent,
    loadChildren: () => import('./gestion-volontaires/gestion-volontaires-routing.module').then(m => m.GestionVolontairesRoutingModule)
  },
  {
    path: 'candidatures', 
    component: GestCandiComponent,
    loadChildren: () => import('./gest-candi/gest-candi-routing.module').then(m => m.GestCandiRoutingModule)
  },
  {
    path: 'partenaires', 
    component: GestPartenComponent,
    loadChildren: () => import('./gest-parten/gest-parten-routing.module').then(m => m.GestPartenRoutingModule)
  },
  {
    path: 'rapports', 
    loadComponent: () => import('./rapports/rapports.component').then(m => m.RapportsComponent)
  },
  {
    path: 'parametres',
    loadComponent: () => import('./parametres/parametres.component').then(m => m.ParametresComponent),
    title: 'Paramètres | Administration'
  },
  {
    path: 'messages',
    component: MessagesAdminComponent,
    data: { 
      title: 'Gestion des Messages',
      breadcrumb: 'Messages de Contact'
    }
  },
  {
    path: 'detail/:id',
    component: MessageDetailDialogComponent,
    data: { 
      title: 'Détail du Message',
      breadcrumb: 'Détail Message'
    }
  },
  {
    path: 'messages/:id/response',
    component: ResponseDialogComponent,
    data: { 
      title: 'Répondre au Message',
      breadcrumb: 'Réponse'
    }
  },
  // {
  //   path: 'admins', 
  //   component: GestionAdminsComponent
  // },
  {
    path: 'comptes',
    loadChildren: () => import('./comptes-candidats/comptes-candidats.module').then(m => m.ComptesCandidatsModule)
  },

  {
    path: 'rapports-ptf',
    component: AdminRapportsPTFComponent,
  },

   { path: 'rap-struct', component: RapportAdminListComponent },
  { path: 'rap-struct/:id', component: RapportAdminDetailComponent },

  {
    path: 'contact-messages',
    redirectTo: 'messages',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }