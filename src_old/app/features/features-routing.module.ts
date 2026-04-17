// src/app/features/features-routing.module.ts (PROPRE)

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PartenaireActifGuard } from '../core/guards/partenaire-actif.guard';

const routes: Routes = [
    {
      path:'admin',
      loadChildren:()=>import('./admin/admin.module').then(m=>m.AdminModule)
    },
     {
      path:'candidats',
      loadChildren:()=>import('./candidats/candidats.module').then(m=>m.CandidatsModule)
    },
     {
      path:'partenaires',
      canActivate: [PartenaireActifGuard],
      loadChildren:()=>import('./partenaires/partenaires.module').then(m=>m.PartenairesModule)
    },
    // Ajoutez ici une route par défaut si nécessaire, par exemple :
    { path: '', redirectTo: 'admin', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturesRoutingModule { }
