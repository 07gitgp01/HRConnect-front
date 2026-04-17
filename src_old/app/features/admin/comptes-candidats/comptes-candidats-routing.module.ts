// src/app/features/admin/comptes-candidats/comptes-candidats-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GestionCandidatsComponent } from './gestion-candidats/gestion-candidats.component';
import { CreerCandidatComponent } from './creer-candidat/creer-candidat.component';
import { EditerCandidatComponent } from './editer-candidat/editer-candidat.component';
import { AdminGuard } from '../../../core/guards/admin.guard';

const routes: Routes = [
  { 
    path: '', 
    component: GestionCandidatsComponent,
    canActivate: [AdminGuard], 
    data: { title: 'Gestion des Candidats' }
  },
  { 
    path: 'gestion-candidats', 
    component: GestionCandidatsComponent,
    canActivate: [AdminGuard], 
    data: { title: 'Gestion des Candidats' }
  },
  { 
    path: 'creer-candidat', 
    component: CreerCandidatComponent,
    canActivate: [AdminGuard], 
    data: { title: 'Créer un Candidat' }
  },
  { 
    path: 'editer-candidat/:id', 
    component: EditerCandidatComponent,
    canActivate: [AdminGuard], 
    data: { title: 'Éditer un Candidat' }
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ComptesCandidatsRoutingModule { }