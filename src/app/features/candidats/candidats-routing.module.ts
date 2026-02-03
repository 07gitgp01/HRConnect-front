import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { MesCandidaturesComponent } from './mes-candidatures/mes-candidatures.component';
import { ProjetsDisponiblesComponent } from './projets-disponibles/projets-disponibles.component';
import { DetailProjetCandidatComponent } from './detail-projet-candidat/detail-projet-candidat.component';
import { CandidatDashboardComponent } from './candidat-dashboard/dashboard.component';
import { CandidatureFormCandidatComponent } from './candidature-candi-form/candidature-candi-form.component';
import { ProfilCandidatComponent } from './profil/profil.component';

const routes: Routes = [
  { 
    path: '', 
    component: CandidatDashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ['candidat', 'volontaire', 'user'] }
  },
  { 
    path: 'mes-candidatures', 
    component: MesCandidaturesComponent, // À créer
    canActivate: [AuthGuard],
    data: { roles: ['candidat', 'volontaire', 'user'] }
  },
  { 
    path: 'projets', 
    component: ProjetsDisponiblesComponent, // À créer
    canActivate: [AuthGuard],
    data: { roles: ['candidat', 'volontaire', 'user'] }
  },
  { 
    path: 'details/:id', 
    component: DetailProjetCandidatComponent, // À créer
    canActivate: [AuthGuard],
    data: { roles: ['candidat', 'volontaire', 'user'] }
  },
  {
  path: 'postuler/:projetId',
  component: CandidatureFormCandidatComponent,
  canActivate: [AuthGuard],
  data: { roles: ['candidat', 'volontaire', 'user'] }
},
{
  path:'profil',
  component:ProfilCandidatComponent,
  canActivate: [AuthGuard],
  data: { roles: ['candidat', 'volontaire', 'user'] }
}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CandidatsRoutingModule { }
