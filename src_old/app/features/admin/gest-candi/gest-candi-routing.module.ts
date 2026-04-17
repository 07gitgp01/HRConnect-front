import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CandidatureListComponent } from './candidature-list/candidature-list.component';
import { CandidatureFormComponent } from './candidature-form/candidature-form.component';
import { CandidatureDetailComponent } from './candidature-detail/candidature-detail.component';
import { GestCandiComponent } from './gest-candi.component';

const routes: Routes = [
  {
    path: '', component: GestCandiComponent, children: [
      { path: '', component: CandidatureListComponent },
      { path: 'ajouter', component: CandidatureFormComponent },
      { path: 'modifier/:id', component: CandidatureFormComponent },
      { path: 'detail/:id', component: CandidatureDetailComponent }, // 👈 nouveau
    ]
  }
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GestCandiRoutingModule { }
