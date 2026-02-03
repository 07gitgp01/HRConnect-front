import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from "@angular/router";
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

@Component({
  standalone:true,
  selector: 'app-gestion-volontaires',
  templateUrl: './gestion-volontaires.component.html',
  styleUrl: './gestion-volontaires.component.css',
  imports: [MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    RouterModule]
})
export class GestionVolontairesComponent {

}
