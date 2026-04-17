// src/app/features/admin/admin.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms'; // AJOUTER FormsModule
import { RouterModule } from '@angular/router';

// Angular Material imports CORRIGÉS
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';

import { AdminRoutingModule } from './admin-routing.module';
import { SharedModule } from '../../shared/shared.module';


import { GestionAdminsComponent } from './gestion-admins/gestion-admins.component';
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { RapportAdminListComponent } from './rap-pnvb-struct/rapport-admin-list/rapport-admin-list.component';
import { RapportAdminDetailComponent } from './rap-pnvb-struct/rapport-admin-detail/rapport-admin-detail.component';


@NgModule({
  declarations: [
   
    GestionAdminsComponent,
         RapportAdminListComponent,
         RapportAdminDetailComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule, // AJOUTÉ pour ngModel
    RouterModule,
    AdminRoutingModule,
    SharedModule,
    // Angular Material modules
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinner
]
})
export class AdminModule { }