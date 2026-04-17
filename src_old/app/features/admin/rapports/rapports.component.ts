import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { RapportsService } from '../../services/service_raprt/rapports.service';
import { Candidature } from '../../models/candidature.model';

Chart.register(...registerables);

@Component({
  standalone:true,
  selector: 'app-rapports',
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.css']
})
export class RapportsComponent implements OnInit {

  tauxChart: any;
  posteChart: any;
  activiteChart: any;

  constructor(private rapportsService: RapportsService) {}

  ngOnInit(): void {
    this.rapportsService.getCandidatures().subscribe((data: Candidature[]) => {
      this.generateTauxCandidaturesChart(data);
      this.generatePosteViseChart(data);
      this.generateActiviteMensuelleChart(data);
    });
  }

  // 📊 1. Taux de candidatures
  generateTauxCandidaturesChart(data: Candidature[]): void {
    const enAttente = data.filter(c => c.statut === 'en_attente').length;
    const entretien = data.filter(c => c.statut === 'entretien').length;
    const refusee = data.filter(c => c.statut === 'refusee').length;
    const acceptee = data.filter(c => c.statut === 'acceptee').length;

    const ctx = document.getElementById('tauxChart') as HTMLCanvasElement;
    this.tauxChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['En attente', 'Entretien', 'Refusée', 'Acceptée'],
        datasets: [{
          label: 'Nombre de candidatures',
          data: [enAttente, entretien, refusee, acceptee],
          backgroundColor: ['#FFCA28', '#42A5F5', '#EF5350', '#66BB6A']
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // 🧩 2. Répartition par poste visé
  generatePosteViseChart(data: Candidature[]): void {
    const postes = data.map(c => c.poste_vise);
    const uniquePostes = [...new Set(postes)];
    const counts = uniquePostes.map(p => postes.filter(x => x === p).length);

    const ctx = document.getElementById('posteViseChart') as HTMLCanvasElement;
    this.posteChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: uniquePostes,
        datasets: [{
          data: counts,
          backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#26C6DA']
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }

  // 📈 3. Activité mensuelle
  generateActiviteMensuelleChart(data: Candidature[]): void {
    const moisLabels = [
      'Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
    ];

    const moisCounts = new Array(12).fill(0);
    data.forEach(c => {
      if (c.cree_le) {
        const mois = new Date(c.cree_le).getMonth();
        moisCounts[mois]++;
      }
    });

    const ctx = document.getElementById('activiteChart') as HTMLCanvasElement;
    this.activiteChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: moisLabels,
        datasets: [{
          label: 'Candidatures par mois',
          data: moisCounts,
          borderColor: '#42A5F5',
          fill: false,
          tension: 0.3
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }
}
