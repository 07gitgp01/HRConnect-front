import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CoreRoutingModule } from './core-routing.module';
import { PermissionService } from '../features/services/permission.service';
import { PartenairePermissionGuard } from './guards/partenaire-permission.guard';
import { PartenaireService } from '../features/services/service_parten/partenaire.service';
import {  } from './layout/recrutements/recrutements.component';


@NgModule({
  declarations: [
  
    
  ],
  imports: [
    CommonModule,
    CoreRoutingModule,
  ],
  providers: [
    PermissionService,
    PartenairePermissionGuard,
    PartenaireService
  ],
  exports: [
   
  ]
})
export class CoreModule { }
