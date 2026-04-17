// src/app/core/layout/footer/footer.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear: number = new Date().getFullYear();
  
  // Liste réelle des PTF du PNVB Burkina Faso
  ptfPartners = [
    { 
      name: 'Programme des Nations Unies pour le Développement (PNUD)', 
      logo: 'assets/partners/pnud.png', 
      url: 'https://www.undp.org/fr/burkina-faso' 
    },
    { 
      name: 'Union Européenne', 
      logo: 'assets/partners/union-europeenne.jpg', 
      url: 'https://www.eeas.europa.eu/delegations/burkina-faso_fr' 
    },
    { 
      name: 'Coopération Suisse', 
      logo: 'assets/partners/cooperation-suisse.jpg', 
      url: 'https://www.eda.admin.ch/countries/burkina-faso/fr/home/cooperation-internationale.html' 
    },
    { 
      name: 'Agence Française de Développement (AFD)', 
      logo: 'assets/partners/afd.png', 
      url: 'https://www.afd.fr/fr/page-region-pays/burkina-faso' 
    },
    { 
      name: 'Luxembourg Cooperation', 
      logo: 'assets/partners/luxembourg-cooperation.jpg', 
      url: 'https://cooperation.gouvernement.lu/fr.html' 
    },
    { 
      name: 'UN Volunteers', 
      logo: 'assets/partners/un-volunteers.jpg', 
      url: 'https://www.unv.org/' 
    },
    { 
      name: 'Gouvernement du Burkina Faso', 
      logo: 'assets/partners/gouv-burkina.png', 
      url: 'https://www.gouvernement.gov.bf/' 
    },
    { 
      name: 'USAID', 
      logo: 'assets/partners/usaid.png', 
      url: 'https://www.usaid.gov/burkina-faso' 
    }
  ];

  // Fonction pour gérer les erreurs de chargement d'images
  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/partners/partner-default.png';
    imgElement.alt = 'Logo partenaire';
  }
}