import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjetsListComponent } from './projets-list/projets-list.component';
import { ProjetsFormComponent } from './projets-form/projets-form.component';
import { GestProjetsComponent } from './gest-projets.component';

const routes: Routes = [
      {
        path: '', 
    component: GestProjetsComponent, 
    children: [
      { path: '', component: ProjetsListComponent },                    // /admin/projets
      { path: 'nouveau', component: ProjetsFormComponent },            // /admin/projets/nouveau
      { path: 'modifier/:id', component: ProjetsFormComponent },       // /admin/projets/modifier/:id
      { path: 'detail/:id', component: ProjetsFormComponent }          // /admin/projets/detail/:id (pour l'instant)
    ]
      }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GestProjetsRoutingModule { }
