import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { RapportEvaluation, RapportAvecDetails, NouveauRapport, RapportStats, FiltreRapport } from '../../models/rapport-evaluation.model';
import { Partenaire } from '../../models/partenaire.model';
import { Volontaire } from '../../models/volontaire.model';

@Injectable({
  providedIn: 'root'
})
export class RapportService {
  private apiUrl = 'http://localhost:3000';
  
  constructor(private http: HttpClient) { }
  
  // ============================================
  // CRUD BASIQUE
  // ============================================
  
  getRapports(): Observable<RapportEvaluation[]> {
    return this.http.get<RapportEvaluation[]>(`${this.apiUrl}/rapports`);
  }
  
  getRapport(id: number | string): Observable<RapportEvaluation> {
    return this.http.get<RapportEvaluation>(`${this.apiUrl}/rapports/${id}`);
  }
  
  createRapport(rapport: NouveauRapport): Observable<RapportEvaluation> {
    const rapportComplet: RapportEvaluation = {
      ...rapport,
      partenaireId: this.getPartenaireIdFromAuth(),
      dateSoumission: new Date().toISOString(),
      dateModification: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return this.http.post<RapportEvaluation>(`${this.apiUrl}/rapports`, rapportComplet);
  }
  
  updateRapport(id: number | string, rapport: Partial<RapportEvaluation>): Observable<RapportEvaluation> {
    const updates = {
      ...rapport,
      dateModification: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return this.http.patch<RapportEvaluation>(`${this.apiUrl}/rapports/${id}`, updates);
  }
  
  deleteRapport(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/rapports/${id}`);
  }
  
  // ============================================
  // MÉTHODES SPÉCIFIQUES AUX PARTENAIRES
  // ============================================
  
  getRapportsByPartenaire(partenaireId: number | string): Observable<RapportAvecDetails[]> {
    return forkJoin({
      rapports: this.http.get<RapportEvaluation[]>(`${this.apiUrl}/rapports?partenaireId=${partenaireId}`),
      volontaires: this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires`),
      partenaires: this.http.get<Partenaire[]>(`${this.apiUrl}/partenaires`)
    }).pipe(
      map(({ rapports, volontaires, partenaires }) => {
        return rapports.map(rapport => {
          const volontaire = volontaires.find(v => v.id == rapport.volontaireId);
          const partenaire = partenaires.find(p => p.id == rapport.partenaireId);
          
          return {
            ...rapport,
            volontaire,
            partenaire,
            volontaireNomComplet: volontaire ? `${volontaire.prenom} ${volontaire.nom}` : 'Non disponible',
            partenaireNom: partenaire ? partenaire.nomStructure : 'Non disponible',
            missionVolontaire: volontaire?.domaineEtudes || 'Non spécifié'
          };
        });
      })
    );
  }
  
  getRapportsByVolontaire(volontaireId: number | string): Observable<RapportAvecDetails[]> {
    return forkJoin({
      rapports: this.http.get<RapportEvaluation[]>(`${this.apiUrl}/rapports?volontaireId=${volontaireId}`),
      volontaires: this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires`),
      partenaires: this.http.get<Partenaire[]>(`${this.apiUrl}/partenaires`)
    }).pipe(
      map(({ rapports, volontaires, partenaires }) => {
        return rapports.map(rapport => {
          const volontaire = volontaires.find(v => v.id == rapport.volontaireId);
          const partenaire = partenaires.find(p => p.id == rapport.partenaireId);
          
          return {
            ...rapport,
            volontaire,
            partenaire,
            volontaireNomComplet: volontaire ? `${volontaire.prenom} ${volontaire.nom}` : 'Non disponible',
            partenaireNom: partenaire ? partenaire.nomStructure : 'Non disponible',
            missionVolontaire: volontaire?.domaineEtudes || 'Non spécifié'
          };
        });
      })
    );
  }
  
  // ============================================
  // VOLONTAIRES DISPONIBLES POUR ÉVALUATION
  // ============================================
  
  getVolontairesAEvaluer(partenaireId: number | string): Observable<Volontaire[]> {
    return this.http.get<Volontaire[]>(`${this.apiUrl}/volontaires?statut=Actif`);
  }
  
  getVolontaireAvecProgression(volontaireId: number | string): Observable<any> {
    return forkJoin({
      volontaire: this.http.get<Volontaire>(`${this.apiUrl}/volontaires/${volontaireId}`),
      rapports: this.getRapportsByVolontaire(volontaireId)
    }).pipe(
      map(({ volontaire, rapports }) => ({
        ...volontaire,
        historiqueEvaluations: rapports,
        moyenneEvaluations: this.calculerMoyenne(rapports),
        derniereEvaluation: rapports.length > 0 ? rapports[rapports.length - 1] : null
      }))
    );
  }
  
  // ============================================
  // STATISTIQUES
  // ============================================
  
  getStatsPartenaire(partenaireId: number | string): Observable<RapportStats> {
    return this.getRapportsByPartenaire(partenaireId).pipe(
      map(rapports => this.calculerStats(rapports))
    );
  }
  
  // ============================================
  // GESTION DES ÉTATS
  // ============================================
  
  soumettreRapport(id: number | string): Observable<RapportEvaluation> {
    return this.updateRapport(id, {
      statut: 'Soumis',
      dateSoumission: new Date().toISOString()
    });
  }
  
  sauvegarderBrouillon(rapport: NouveauRapport): Observable<RapportEvaluation> {
    return this.createRapport({
      ...rapport,
      statut: 'Brouillon'
    });
  }
  
  validerRapport(id: number | string, feedback?: string): Observable<RapportEvaluation> {
    return this.updateRapport(id, {
      statut: 'Validé',
      feedbackPNVB: feedback,
      dateValidation: new Date().toISOString(),
      validePar: 'admin@pnvb.sn'
    });
  }
  
  rejeterRapport(id: number | string, raison: string): Observable<RapportEvaluation> {
    return this.updateRapport(id, {
      statut: 'Rejeté',
      feedbackPNVB: raison
    });
  }
  
  // ============================================
  // MÉTHODES UTILITAIRES
  // ============================================
  
  private getPartenaireIdFromAuth(): number {
    // À implémenter selon votre système d'authentification
    return 201; // ID fictif pour les tests
  }
  
  private calculerStats(rapports: RapportAvecDetails[]): RapportStats {
    const total = rapports.length;
    const soumis = rapports.filter(r => r.statut === 'Soumis').length;
    const valide = rapports.filter(r => r.statut === 'Validé').length;
    const brouillon = rapports.filter(r => r.statut === 'Brouillon').length;
    const rejete = rapports.filter(r => r.statut === 'Rejeté').length;
    const enAttente = rapports.filter(r => r.statut === 'Lu par PNVB').length;
    
    const moyennes = rapports
      .filter(r => r.statut === 'Validé' || r.statut === 'Soumis')
      .map(r => r.evaluationGlobale);
    
    const moyenneEvaluation = moyennes.length > 0 
      ? moyennes.reduce((a, b) => a + b, 0) / moyennes.length 
      : 0;
    
    const parStatut = rapports.reduce((acc: { [statut: string]: number }, rapport) => {
      acc[rapport.statut] = (acc[rapport.statut] || 0) + 1;
      return acc;
    }, {});
    
    const parPeriode = rapports.reduce((acc: { [periode: string]: number }, rapport) => {
      acc[rapport.periode] = (acc[rapport.periode] || 0) + 1;
      return acc;
    }, {});
    
    const parPartenaire = rapports.reduce((acc: { [partenaireId: string]: number }, rapport) => {
      const id = rapport.partenaireId.toString();
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total,
      soumis,
      valide,
      brouillon,
      rejete,
      enAttente,
      moyenneEvaluation: Number(moyenneEvaluation.toFixed(1)),
      parStatut,
      parPeriode,
      parPartenaire
    };
  }
  
  private calculerMoyenne(rapports: RapportAvecDetails[]): number {
    if (rapports.length === 0) return 0;
    const total = rapports.reduce((sum, r) => sum + r.evaluationGlobale, 0);
    return Number((total / rapports.length).toFixed(1));
  }
  
  // ============================================
  // CONFIGURATION
  // ============================================
  
  getPeriodesDisponibles(): string[] {
    const annee = new Date().getFullYear();
    return [
      `T1-${annee}`,
      `T2-${annee}`,
      `T3-${annee}`,
      `T4-${annee}`,
      'Final',
      'Exceptionnel'
    ];
  }
  
  getStatutsDisponibles(): string[] {
    return ['Brouillon', 'Soumis', 'Lu par PNVB', 'Validé', 'Rejeté'];
  }
  
  getCriteresEvaluation(): { code: string; libelle: string; description: string }[] {
    return [
      { code: 'integration', libelle: 'Intégration', description: 'Capacité à s\'intégrer dans l\'équipe et la structure' },
      { code: 'competences', libelle: 'Compétences', description: 'Maîtrise des compétences requises pour la mission' },
      { code: 'initiative', libelle: 'Initiative', description: 'Prise d\'initiative et autonomie' },
      { code: 'collaboration', libelle: 'Collaboration', description: 'Travail en équipe et communication' },
      { code: 'respectEngagement', libelle: 'Respect des engagements', description: 'Ponctualité et respect des délais' }
    ];
  }
}