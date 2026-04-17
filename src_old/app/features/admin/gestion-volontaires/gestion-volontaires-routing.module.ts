import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VolontairesListComponent } from './volontaires-list/volontaires-list.component';
// import { ProfilFormComponent } from './profil-form/profil-form.component'; // Importation inutile si non utilisée dans les routes
import { GestionVolontairesComponent } from './gestion-volontaires.component'; 

const routes: Routes = [
  {
    path: '',
    component: GestionVolontairesComponent, 
    children: [
      { path: '', component: VolontairesListComponent },
      // Les routes suivantes ne sont pas nécessaires car vous utilisez un tiroir latéral (sidenav)
      /*{ path: 'nouveau', component: ProfilFormComponent },
      { path: 'edit/:id', component: ProfilFormComponent }*/
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GestionVolontairesRoutingModule {}
