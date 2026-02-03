import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { PartenaireDetailComponent } from './partenaire-detail/partenaire-detail.component';





@NgModule({
  declarations: [
  
  
    PartenaireDetailComponent
  ],
  imports: [
      CommonModule,
      ReactiveFormsModule,
      MatCardModule,
      MatButtonModule,
      MatIconModule
        ]
})
export class GestPartenModule { }
