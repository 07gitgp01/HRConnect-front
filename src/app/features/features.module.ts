import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FeaturesRoutingModule } from './features-routing.module';
import { MesVolontairesComponent } from './mes-volontaires/mes-volontaires.component';



@NgModule({
  declarations: [
     
    MesVolontairesComponent
  ],
  imports: [
    CommonModule,
    FeaturesRoutingModule
    ]
})
export class FeaturesModule { }
