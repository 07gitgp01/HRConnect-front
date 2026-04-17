// src/app/features/admin/gest-projets/gest-projets.component.ts

import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, RouterModule } from '@angular/router'; 
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { ProjetsListComponent } from "./projets-list/projets-list.component";

@Component({
  standalone: true,
  selector: 'app-gest-projets',
  templateUrl: './gest-projets.component.html',
  styleUrl: './gest-projets.component.css',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    RouterModule
  ]
})
export class GestProjetsComponent {
  // Vous pouvez ajouter une logique pour ouvrir/fermer le sidenav ici si vous le souhaitez
}
