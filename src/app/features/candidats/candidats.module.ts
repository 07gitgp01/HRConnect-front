import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CandidatsRoutingModule } from './candidats-routing.module';
import { MatCard, MatCardContent } from "@angular/material/card";
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';



@NgModule({
  declarations: [
    
  
  ],
  imports: [
    CommonModule,
    CandidatsRoutingModule,
    MatCard,
    MatCardContent,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
]
})
export class CandidatsModule { }
