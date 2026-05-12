// src/app/features/public/faq/faq.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent {
  faqs = [
    {
      question: 'Qui peut devenir volontaire national ?',
      answer: 'Tout jeune Burkinabè âgé de 18 à 35 ans, sans condition de diplôme, peut postuler. Les candidatures sont ouvertes aux personnes résidant sur l’ensemble du territoire national.'
    },
    {
      question: 'Comment postuler au Programme National de Volontariat ?',
      answer: 'Les inscriptions se font exclusivement en ligne sur la plateforme officielle fasovolontariat.bf. Vous devez créer un compte, compléter votre profil et déposer votre candidature aux missions disponibles.'
    },
    {
      question: 'Quels sont les domaines d’intervention des volontaires ?',
      answer: 'Les volontaires interviennent dans des secteurs variés : éducation, santé, environnement, agriculture, infrastructures, développement communautaire, technologies et innovation.'
    },
    {
      question: 'Le volontariat est-il rémunéré ?',
      answer: 'Oui, les volontaires reçoivent une indemnité mensuelle pour leur permettre de se consacrer pleinement à leur mission. Le montant varie selon le type de mission et la structure d’accueil.'
    },
    {
      question: 'Puis-je être affecté dans ma région d’origine ?',
      answer: 'Les affectations tiennent compte des besoins des structures d’accueil et du lieu de résidence du volontaire lorsque cela est possible. Cependant, la mobilité géographique est encouragée.'
    },
    {
      question: 'Quelle est la durée d’une mission de volontariat ?',
      answer: 'Les missions durent généralement entre 6 et 24 mois, renouvelables selon les besoins et les performances du volontaire.'
    },
    {
      question: 'Quels sont les avantages pour le volontaire ?',
      answer: 'En plus de l’indemnité, le volontaire bénéficie d’une assurance maladie, d’une formation continue, d’un accompagnement professionnel et d’une attestation de fin de mission valorisable.'
    },
    {
      question: 'Puis-je postuler à plusieurs missions à la fois ?',
      answer: 'Oui, vous pouvez postuler à plusieurs missions. Cependant, une fois accepté sur une mission, les autres candidatures sont automatiquement fermées.'
    }
  ];

  constructor(private router: Router) {}

  goToSupport(): void {
    this.router.navigate(['/aide-support']);
  }
}