import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { ProjectDetailDialogComponent } from './project-detail-dialog/project-detail-dialog.component';


@NgModule({
  declarations: [
  
    /* ProjectDetailDialogComponent */
  ],
  imports: [
    CommonModule,          // ✅ nécessaire pour *ngIf et *ngFor
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule

  ],
  exports: [
  ]
})
export class GestProjetsModule { }
