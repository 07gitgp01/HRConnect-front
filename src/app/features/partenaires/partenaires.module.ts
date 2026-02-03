import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PartenairesRoutingModule } from './partenaires-routing.module';
import { MatCard, MatCardContent } from "@angular/material/card";
import { RapportsComponent } from './rapports/rapports.component';
import { ProfilComponent } from './profil/profil.component';
import { RapportListComponent } from './rap-eval-pnvb/rapport-list/rapport-list.component';
import { RapportDetailComponent } from './rap-eval-pnvb/rapport-detail/rapport-detail.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RapportFormComponent } from './rap-eval-pnvb/rapport-form/rapport-form.component';
import { VolontairesListComponent } from './volontaires-list/volontaires-list.component';



@NgModule({
  declarations: [
      
           RapportsComponent,
           ProfilComponent,
           RapportListComponent,
           RapportDetailComponent,
               RapportFormComponent,
               VolontairesListComponent
  ],
  imports: [
    CommonModule,
    PartenairesRoutingModule,
    MatCard,
    MatCardContent,
        FormsModule ,// <-- AJOUTEZ CECI,
         ReactiveFormsModule

]
})
export class PartenairesModule { }
