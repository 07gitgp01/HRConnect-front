import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-mes-volontaires',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mes-volontaires.component.html',
  styleUrls: ['./mes-volontaires.component.css']
})
export class MesVolontairesComponent implements OnInit {
  volontairesActifs: any[] = [];
  volontairesInactifs: any[] = [];
  missionsEnCours: any[] = [];

  ngOnInit(): void {
    // Initialisation des données
    this.chargerDonnees();
  }

  // Méthodes publiques pour le template
  getTotalVolontaires(): number {
    return this.volontairesActifs.length + this.volontairesInactifs.length;
  }

  getVolontairesEnMission(): number {
    return this.volontairesActifs.length;
  }

  getMissionsEnCoursCount(): number {
    return this.missionsEnCours.length;
  }

  // Correction : Cette méthode doit être publique
  calculerDureeRestante(dateFin: string | Date): string {
    if (!dateFin) return 'Indéterminée';
    
    const fin = new Date(dateFin);
    const aujourdhui = new Date();
    const diffTime = fin.getTime() - aujourdhui.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `${diffDays} jours`;
    } else if (diffDays === 0) {
      return 'Aujourd\'hui';
    } else {
      return 'Terminée';
    }
  }

  getDureeRestante(dateFin: string | Date): string {
    return this.calculerDureeRestante(dateFin);
  }

  // Méthodes pour déterminer le statut de la date
  isDateFuture(date: string | Date): boolean {
    if (!date) return true;
    return new Date(date) > new Date();
  }

  isDateNearFuture(date: string | Date): boolean {
    if (!date) return false;
    const diff = new Date(date).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7; // Moins de 7 jours
  }

  isDatePastOrToday(date: string | Date): boolean {
    if (!date) return false;
    return new Date(date) <= new Date();
  }

  private chargerDonnees(): void {
    // Charger vos données depuis un service
    // Exemple de données factices
    this.volontairesActifs = [
      {
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@email.com',
        telephone: '0123456789',
        specialite: 'Développement',
        mission: {
          projetId: 1,
          titre: 'Projet Test',
          dateDebut: '2024-01-01',
          dateFin: '2024-12-31'
        }
      }
    ];

    this.volontairesInactifs = [];
    this.missionsEnCours = [];
  }
}