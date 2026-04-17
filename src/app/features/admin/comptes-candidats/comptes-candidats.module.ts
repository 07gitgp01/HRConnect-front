import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ComptesCandidatsRoutingModule } from './comptes-candidats-routing.module';
import { GestionCandidatsComponent } from './gestion-candidats/gestion-candidats.component';
import { CreerCandidatComponent } from './creer-candidat/creer-candidat.component';
import { EditerCandidatComponent } from './editer-candidat/editer-candidat.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatPaginator } from "@angular/material/paginator"; // AJOUTER FormsModule

@NgModule({
  declarations: [
    GestionCandidatsComponent,
    CreerCandidatComponent,
    EditerCandidatComponent
  ],
  imports: [
    CommonModule,
    ComptesCandidatsRoutingModule,
    ReactiveFormsModule,
    FormsModule // ✅ AJOUTER ICI - C'EST CE QUI MANQUE
    ,
    MatPaginator
]
})
export class ComptesCandidatsModule { }