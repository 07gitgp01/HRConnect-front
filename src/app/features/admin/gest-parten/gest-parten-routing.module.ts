import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GestPartenComponent } from './gest-parten.component';
import { PartenaireFormComponent } from './partenaires-form/partenaires-form.component';
import { PartenairesListComponent } from './partenaires-list/partenaires-list.component';
import { PartenaireDetailComponent } from './partenaire-detail/partenaire-detail.component';

const routes: Routes = [
  {
    path: '', component: GestPartenComponent, children: [
      { path: '', component: PartenairesListComponent },
      { path: 'creer', component: PartenaireFormComponent },
      { path: 'edit/:id', component: PartenaireFormComponent },
      { path: 'detail/:id', component: PartenaireDetailComponent } // NOUVELLE ROUTE
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GestPartenRoutingModule { }
