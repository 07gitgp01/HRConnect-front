// src/app/features/services/service_rapports/rapport.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, forkJoin } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { 
  Rapport, 
  TypeRapport, 
  RapportStatistiques,
  PieceJointe
} from '../../models/rapport.model';

@Injectable({
  providedIn: 'root'
})
export class RapportService {
  private apiUrl = 'http://localhost:3000/rapports';
  private typesRapportUrl = 'http://localhost:3000/types-rapport';
  
  private rapportsSubject = new BehaviorSubject<Rapport[]>([]);
  public rapports$ = this.rapportsSubject.asObservable();
  
  private notificationsSubject = new BehaviorSubject<number>(0);
  public notificationsCount$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initialiserNotifications();
  }

  // ==================== TYPES DE RAPPORTS ====================

  getTypesRapport(): Observable<TypeRapport[]> {
    return this.http.get<TypeRapport[]>(this.typesRapportUrl).pipe(
      catchError(() => {
        // Types par défaut si l'API n'est pas disponible
        return of(this.getTypesRapportParDefaut());
      })
    );
  }

  private getTypesRapportParDefaut(): TypeRapport[] {
    return [
      {
        id: 1,
        code: 'TRIM',
        label: 'Rapport Trimestriel',
        frequence: 'trimestriel',
        delaiSoumission: 15,
        template: this.getTemplateTrimestriel()
      },
      {
        id: 2,
        code: 'FIN_MISSION',
        label: 'Rapport de Fin de Mission',
        frequence: 'fin_mission',
        delaiSoumission: 30,
        template: this.getTemplateFinMission()
      },
      {
        id: 3,
        code: 'SEM',
        label: 'Rapport Semestriel',
        frequence: 'semestriel',
        delaiSoumission: 20,
        template: this.getTemplateSemestriel()
      },
      {
        id: 4,
        code: 'ANNUEL',
        label: 'Rapport Annuel',
        frequence: 'annuel',
        delaiSoumission: 30,
        template: this.getTemplateAnnuel()
      }
    ];
  }

  // ==================== GESTION DES RAPPORTS ====================

  getRapportsParPartenaire(partenaireId: number): Observable<Rapport[]> {
    return this.http.get<Rapport[]>(`${this.apiUrl}?partenaireId=${partenaireId}`).pipe(
      tap(rapports => this.rapportsSubject.next(rapports)),
      catchError(() => of([]))
    );
  }

  getRapport(id: number): Observable<Rapport> {
    return this.http.get<Rapport>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error('Erreur récupération rapport:', error);
        throw error;
      })
    );
  }

  creerRapport(rapport: Partial<Rapport>): Observable<Rapport> {
    const rapportComplet: Rapport = {
      ...rapport,
      id: Date.now(),
      statut: 'brouillon',
      dateCreation: new Date().toISOString(),
      piecesJointes: [],
      notifications: [],
      dateEcheance: this.calculerDateEcheance(rapport.typeRapportId!)
    } as Rapport;

    return this.http.post<Rapport>(this.apiUrl, rapportComplet).pipe(
      tap(nouveauRapport => {
        const rapports = this.rapportsSubject.value;
        this.rapportsSubject.next([...rapports, nouveauRapport]);
      })
    );
  }

  mettreAJourRapport(id: number, rapport: Partial<Rapport>): Observable<Rapport> {
    return this.http.patch<Rapport>(`${this.apiUrl}/${id}`, rapport).pipe(
      tap(rapportMaj => {
        const rapports = this.rapportsSubject.value;
        const index = rapports.findIndex(r => r.id === id);
        if (index !== -1) {
          rapports[index] = rapportMaj;
          this.rapportsSubject.next([...rapports]);
        }
      })
    );
  }

  soumettreRapport(id: number): Observable<Rapport> {
    return this.http.patch<Rapport>(`${this.apiUrl}/${id}`, {
      statut: 'soumis',
      dateSoumission: new Date().toISOString()
    }).pipe(
      tap(() => this.verifierNotifications())
    );
  }

  // ==================== PIÈCES JOINTES ====================

  ajouterPieceJointe(rapportId: number, fichier: File): Observable<PieceJointe> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    
    return this.http.post<PieceJointe>(`${this.apiUrl}/${rapportId}/pieces-jointes`, formData);
  }

  supprimerPieceJointe(rapportId: number, pieceJointeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${rapportId}/pieces-jointes/${pieceJointeId}`);
  }

  // ==================== STATISTIQUES ====================

  getStatistiques(partenaireId: number): Observable<RapportStatistiques> {
    return this.getRapportsParPartenaire(partenaireId).pipe(
      map(rapports => this.calculerStatistiques(rapports))
    );
  }

  private calculerStatistiques(rapports: Rapport[]): RapportStatistiques {
    const maintenant = new Date();
    
    const rapportsEnRetard = rapports.filter(r => {
      if (r.statut === 'soumis' || r.statut === 'valide') return false;
      return new Date(r.dateEcheance) < maintenant;
    });

    const prochainsEcheances = rapports
      .filter(r => r.statut === 'brouillon')
      .filter(r => new Date(r.dateEcheance) > maintenant)
      .sort((a, b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime())
      .slice(0, 5);

    return {
      total: rapports.length,
      soumis: rapports.filter(r => r.statut === 'soumis').length,
      enRetard: rapportsEnRetard.length,
      valides: rapports.filter(r => r.statut === 'valide').length,
      brouillons: rapports.filter(r => r.statut === 'brouillon').length,
      tauxSoumission: rapports.length > 0 
        ? Math.round((rapports.filter(r => r.statut === 'soumis' || r.statut === 'valide').length / rapports.length) * 100)
        : 0,
      prochainsEcheances,
      rapportsEnRetard
    };
  }

  // ==================== NOTIFICATIONS ====================

  private initialiserNotifications(): void {
    // Vérifier les notifications toutes les heures
    setInterval(() => this.verifierNotifications(), 3600000);
    this.verifierNotifications();
  }

  private verifierNotifications(): void {
    // Dans une vraie app, on appellerait le backend
    // Pour la démo, on simule
    this.notificationsSubject.next(3); // 3 notifications non lues
  }

  getRapportsAvecNotifications(partenaireId: number): Observable<{
    rapports: Rapport[];
    notifications: number;
    rapportsEnRetard: Rapport[];
  }> {
    return this.getRapportsParPartenaire(partenaireId).pipe(
      map(rapports => {
        const maintenant = new Date();
        const rapportsEnRetard = rapports.filter(r => 
          r.statut !== 'soumis' && 
          r.statut !== 'valide' && 
          new Date(r.dateEcheance) < maintenant
        );
        
        const notifications = rapportsEnRetard.length + 
          rapports.filter(r => r.notifications?.some(n => !n.lue)).length;

        return {
          rapports,
          notifications,
          rapportsEnRetard
        };
      })
    );
  }

  marquerNotificationLue(rapportId: number, notificationId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.apiUrl}/${rapportId}/notifications/${notificationId}`, 
      { lue: true }
    );
  }

  // ==================== TEMPLATES ====================

  private getTemplateTrimestriel(): any {
    return {
      sections: [
        {
          titre: 'Activités réalisées',
          type: 'textarea',
          required: true,
          placeholder: 'Décrivez les principales activités réalisées durant le trimestre...'
        },
        {
          titre: 'Résultats obtenus',
          type: 'textarea',
          required: true,
          placeholder: 'Indiquez les résultats concrets obtenus...'
        },
        {
          titre: 'Difficultés rencontrées',
          type: 'textarea',
          required: false,
          placeholder: 'Listez les difficultés rencontrées...'
        },
        {
          titre: 'Perspectives',
          type: 'textarea',
          required: true,
          placeholder: 'Précisez les perspectives pour le prochain trimestre...'
        },
        {
          titre: 'Indicateurs de performance',
          type: 'table',
          colonnes: ['Indicateur', 'Valeur cible', 'Valeur atteinte', 'Commentaires'],
          lignes: []
        }
      ]
    };
  }

  private getTemplateFinMission(): any {
    return {
      sections: [
        {
          titre: 'Bilan général de la mission',
          type: 'textarea',
          required: true
        },
        {
          titre: 'Objectifs atteints',
          type: 'textarea',
          required: true
        },
        {
          titre: 'Impacts sur la communauté',
          type: 'textarea',
          required: true
        },
        {
          titre: 'Recommandations',
          type: 'textarea',
          required: true
        },
        {
          titre: 'Évaluation des volontaires',
          type: 'table',
          colonnes: ['Volontaire', 'Contribution', 'Points forts', 'Axes d\'amélioration', 'Note (1-5)'],
          lignes: []
        }
      ]
    };
  }

  private getTemplateSemestriel(): any {
    return {
      sections: [
        {
          titre: 'Synthèse des activités',
          type: 'textarea',
          required: true
        },
        {
          titre: 'Analyse financière',
          type: 'textarea',
          required: true
        },
        {
          titre: 'Impact et résultats',
          type: 'textarea',
          required: true
        }
      ]
    };
  }

  private getTemplateAnnuel(): any {
    return {
      sections: [
        {
          titre: 'Rapport annuel d\'activités',
          type: 'textarea',
          required: true
        },
        {
          titre: 'Bilan financier',
          type: 'textarea',
          required: true
        },
        {
          titre: 'Perspectives stratégiques',
          type: 'textarea',
          required: true
        }
      ]
    };
  }

  private calculerDateEcheance(typeRapportId: number): string {
    const date = new Date();
    // Ajouter le délai de soumission selon le type
    const delais: {[key: number]: number} = {
      1: 15,  // Trimestriel: 15 jours
      2: 30,  // Fin mission: 30 jours
      3: 20,  // Semestriel: 20 jours
      4: 30   // Annuel: 30 jours
    };
    
    date.setDate(date.getDate() + (delais[typeRapportId] || 30));
    return date.toISOString();
  }

  // ==================== UTILITAIRES ====================

  formaterDateEcheance(dateEcheance: string): { texte: string; classe: string } {
    const echeance = new Date(dateEcheance);
    const aujourdhui = new Date();
    const diffJours = Math.ceil((echeance.getTime() - aujourdhui.getTime()) / (1000 * 3600 * 24));
    
    if (diffJours < 0) {
      return { texte: `${Math.abs(diffJours)} jours de retard`, classe: 'danger' };
    } else if (diffJours === 0) {
      return { texte: 'Aujourd\'hui', classe: 'warning' };
    } else if (diffJours <= 7) {
      return { texte: `Dans ${diffJours} jours`, classe: 'warning' };
    } else {
      return { texte: `Dans ${diffJours} jours`, classe: 'success' };
    }
  }

  genererRapportPDF(rapportId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${rapportId}/pdf`, {
      responseType: 'blob'
    });
  }

  exporterRapports(partenaireId: number, format: 'excel' | 'pdf'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export?partenaireId=${partenaireId}&format=${format}`, {
      responseType: 'blob'
    });
  }
}