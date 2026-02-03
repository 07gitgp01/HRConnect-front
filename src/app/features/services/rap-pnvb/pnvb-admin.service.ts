import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface CriteresEvaluation {
  integration?: number;
  competences?: number;
  initiative?: number;
  collaboration?: number;
  respectEngagement?: number;
  [key: string]: number | undefined;
}

export interface RapportAdmin {
  id: number | string;
  partenaireNom: string;
  partenaireId: string | number;
  volontaireNomComplet: string;
  missionVolontaire: string;
  periode: string;
  evaluationGlobale: number;
  commentaires: string;
  statut: string;
  dateSoumission: string;
  dateValidation?: string;
  validePar?: string;
  feedbackPNVB?: string;
  volontaireId?: string | number;
  projectId?: string | number;
  
  // Propriétés dynamiques
  created_at?: string;
  updated_at?: string;
  dateModification?: string;
  criteres?: CriteresEvaluation;
  urlDocumentAnnexe?: string;
  nomDocumentAnnexe?: string;
  raisonRejet?: string;
  observations?: string;
  remarques?: string;
  noteFinale?: number;
  recommandation?: string;
  forcePoints?: string[];
  pointsAmelioration?: string[];
  
  [key: string]: any;
}

export interface StatsAdmin {
  totalRapports: number;
  rapportsSoumis: number;
  rapportsValides: number;
  rapportsEnAttente: number;
  rapportsRejetes: number;
  moyenneGenerale: number;
  partenairesActifs: number;
}

export interface PartenaireStats {
  id: string | number;
  nom: string;
  totalRapports: number;
  rapportsValides: number;
  moyenneEvaluation: number;
  dernierRapport?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PnvbAdminService {
  private baseUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // ============================================
  // MÉTHODES PUBLIQUES PRINCIPALES
  // ============================================

  getAllRapports(filters?: any): Observable<RapportAdmin[]> {
    console.log('🔍 Chargement dynamique de tous les rapports...');
    
    return forkJoin({
      rapportsEvaluation: this.http.get<any[]>(`${this.baseUrl}/rapports-evaluation`).pipe(
        catchError(() => {
          console.log('⚠️ Collection rapports-evaluation non trouvée');
          return of([]);
        })
      ),
      rapports: this.http.get<any[]>(`${this.baseUrl}/rapports`).pipe(
        catchError(() => {
          console.log('⚠️ Collection rapports non trouvée');
          return of([]);
        })
      ),
      evaluations: this.http.get<any[]>(`${this.baseUrl}/evaluations`).pipe(
        catchError(() => {
          console.log('⚠️ Collection evaluations non trouvée');
          return of([]);
        })
      ),
      partenaires: this.http.get<any[]>(`${this.baseUrl}/partenaires`).pipe(
        catchError(() => {
          console.log('⚠️ Collection partenaires non trouvée');
          return of([]);
        })
      ),
      volontaires: this.http.get<any[]>(`${this.baseUrl}/volontaires`).pipe(
        catchError(() => {
          console.log('⚠️ Collection volontaires non trouvée');
          return of([]);
        })
      ),
      projets: this.http.get<any[]>(`${this.baseUrl}/projets`).pipe(
        catchError(() => {
          console.log('⚠️ Collection projets non trouvée');
          return of([]);
        })
      )
    }).pipe(
      map(({ rapportsEvaluation, rapports, evaluations, partenaires, volontaires, projets }) => {
        const tousLesRapports = [...rapportsEvaluation, ...rapports, ...evaluations];
        console.log(`📊 ${tousLesRapports.length} rapports trouvés`);
        
        const rapportsAdmin = tousLesRapports.map(rapport => {
          const partenaireInfo = this.trouverPartenaire(rapport, partenaires);
          const volontaireInfo = this.trouverVolontaire(rapport, volontaires);
          const projetInfo = this.trouverProjet(rapport, projets);
          
          const periode = this.calculerPeriode(rapport);
          const evaluationGlobale = this.calculerEvaluation(rapport);
          const mission = this.determinerMission(rapport, projetInfo);
          const statut = this.determinerStatut(rapport);
          const commentaires = this.extraireCommentaires(rapport);
          
          const rapportAdmin: RapportAdmin = {
            id: rapport.id || this.genererId(),
            partenaireNom: partenaireInfo.nom,
            partenaireId: rapport.partenaireId || rapport.structureId || partenaireInfo.id,
            volontaireNomComplet: volontaireInfo.nom,
            missionVolontaire: mission,
            periode: periode,
            evaluationGlobale: evaluationGlobale,
            commentaires: commentaires,
            statut: statut,
            dateSoumission: rapport.dateSoumission || rapport.created_at || rapport.date || new Date().toISOString(),
            ...this.extraireProprietesDynamiques(rapport)
          };
          
          return rapportAdmin;
        });
        
        console.log(`✅ ${rapportsAdmin.length} rapports transformés`);
        
        if (filters) {
          return this.appliquerFiltres(rapportsAdmin, filters);
        }
        
        return rapportsAdmin;
      }),
      catchError(error => {
        console.error('❌ Erreur chargement rapports:', error);
        return of([]);
      })
    );
  }

  getRapportAdmin(id: number | string): Observable<RapportAdmin> {
    return this.getAllRapports().pipe(
      map(rapports => {
        const rapport = rapports.find(r => r.id.toString() === id.toString());
        if (!rapport) {
          throw new Error(`Rapport ${id} non trouvé`);
        }
        return rapport;
      }),
      catchError(error => {
        console.error('❌ Erreur récupération rapport:', error);
        throw error;
      })
    );
  }

  getHistorique(id: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/rapports-evaluation/${id}/historique`).pipe(
      catchError(() => {
        console.log('ℹ️ Calcul historique à partir des données');
        return this.calculerHistoriqueLocal(id);
      })
    );
  }

  getStatsAdmin(): Observable<StatsAdmin> {
    return this.getAllRapports().pipe(
      map(rapports => {
        console.log('📈 Calcul statistiques sur', rapports.length, 'rapports');
        
        if (rapports.length === 0) {
          return this.getStatsVides();
        }
        
        const totalRapports = rapports.length;
        const rapportsValides = rapports.filter(r => r.statut === 'Validé').length;
        const rapportsEnAttente = rapports.filter(r => 
          ['Soumis', 'En attente', 'Brouillon'].includes(r.statut)
        ).length;
        const rapportsRejetes = rapports.filter(r => r.statut === 'Rejeté').length;
        const rapportsSoumis = rapports.filter(r => r.statut === 'Soumis').length;
        
        const evaluations = rapports
          .filter(r => r.evaluationGlobale > 0)
          .map(r => r.evaluationGlobale);
        
        const sommeEvaluations = evaluations.reduce((total: number, note: number) => total + note, 0);
        const moyenneGenerale = evaluations.length > 0 
          ? Number((sommeEvaluations / evaluations.length).toFixed(1))
          : 0;

        const troisMoisAgo = new Date();
        troisMoisAgo.setMonth(troisMoisAgo.getMonth() - 3);
        
        const partenairesActifs = new Set(
          rapports
            .filter(r => {
              try {
                const dateRapport = new Date(r.dateSoumission);
                return !isNaN(dateRapport.getTime()) && dateRapport > troisMoisAgo;
              } catch {
                return false;
              }
            })
            .map(r => r.partenaireId)
        ).size;

        return {
          totalRapports,
          rapportsSoumis,
          rapportsValides,
          rapportsEnAttente,
          rapportsRejetes,
          moyenneGenerale,
          partenairesActifs
        };
      }),
      catchError(error => {
        console.error('❌ Erreur calcul stats:', error);
        return of(this.getStatsVides());
      })
    );
  }

  getStatsPartenaires(): Observable<PartenaireStats[]> {
    return forkJoin({
      rapports: this.getAllRapports(),
      partenaires: this.http.get<any[]>(`${this.baseUrl}/partenaires`).pipe(
        catchError(() => of([]))
      )
    }).pipe(
      map(({ rapports, partenaires }) => {
        console.log('📊 Calcul stats pour', rapports.length, 'rapports et', partenaires.length, 'partenaires');
        
        const rapportsParPartenaire = new Map<string | number, RapportAdmin[]>();
        
        rapports.forEach(rapport => {
          const key = rapport.partenaireId;
          if (!rapportsParPartenaire.has(key)) {
            rapportsParPartenaire.set(key, []);
          }
          rapportsParPartenaire.get(key)!.push(rapport);
        });

        const stats: PartenaireStats[] = [];
        
        partenaires.forEach(partenaire => {
          const rapportsDuPartenaire = rapportsParPartenaire.get(partenaire.id) || [];
          
          if (rapportsDuPartenaire.length > 0) {
            const statsPartenaire = this.calculerStatsPartenaire(partenaire, rapportsDuPartenaire);
            stats.push(statsPartenaire);
          }
        });

        rapportsParPartenaire.forEach((rapportsPartenaire, partenaireId) => {
          const partenaireExiste = stats.some(s => s.id.toString() === partenaireId.toString());
          
          if (!partenaireExiste && rapportsPartenaire.length > 0) {
            const statsPartenaire = this.calculerStatsPartenaire(
              { id: partenaireId, nomStructure: `Partenaire ${partenaireId}` },
              rapportsPartenaire
            );
            stats.push(statsPartenaire);
          }
        });

        return stats.sort((a, b) => b.totalRapports - a.totalRapports);
      }),
      catchError(error => {
        console.error('❌ Erreur calcul stats partenaires:', error);
        return of([]);
      })
    );
  }

  // ============================================
  // ACTIONS D'ADMINISTRATION
  // ============================================

  validerRapport(id: number | string, feedback?: string): Observable<any> {
    console.log(`✅ Validation du rapport ${id}`);
    
    const updates = {
      statut: 'Validé',
      feedbackPNVB: feedback || 'Rapport validé par l\'administration PNVB',
      dateValidation: new Date().toISOString(),
      validePar: 'Administrateur PNVB'
    };
    
    return this.http.patch(`${this.baseUrl}/rapports-evaluation/${id}`, {
      ...updates,
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error('❌ Erreur API, mise à jour locale:', error);
        return this.mettreAJourRapportLocal(id, updates);
      })
    );
  }

  rejeterRapport(id: number | string, raison: string): Observable<any> {
    console.log(`❌ Rejet du rapport ${id}: ${raison}`);
    
    const updates = {
      statut: 'Rejeté',
      feedbackPNVB: raison,
      dateValidation: new Date().toISOString(),
      validePar: 'Administrateur PNVB'
    };
    
    return this.http.patch(`${this.baseUrl}/rapports-evaluation/${id}`, {
      ...updates,
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error('❌ Erreur API, mise à jour locale:', error);
        return this.mettreAJourRapportLocal(id, updates);
      })
    );
  }

  marquerCommeLu(id: number | string): Observable<any> {
    console.log(`👁️ Marquage comme lu du rapport ${id}`);
    
    const updates = {
      statut: 'Lu par PNVB'
    };
    
    return this.http.patch(`${this.baseUrl}/rapports-evaluation/${id}`, {
      ...updates,
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error('❌ Erreur API, mise à jour locale:', error);
        return this.mettreAJourRapportLocal(id, updates);
      })
    );
  }

  ajouterCommentaire(id: number | string, commentaire: string): Observable<any> {
    console.log(`💬 Ajout commentaire au rapport ${id}`);
    
    const updates = {
      feedbackPNVB: commentaire,
      commentairePar: 'Admin PNVB',
      commentaireDate: new Date().toISOString()
    };
    
    return this.http.patch(`${this.baseUrl}/rapports-evaluation/${id}`, {
      ...updates,
      updated_at: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error('❌ Erreur API, mise à jour locale:', error);
        return this.mettreAJourRapportLocal(id, updates);
      })
    );
  }

  exportRapports(format: 'excel' | 'pdf', filters?: any): Observable<Blob> {
    return this.getAllRapports(filters).pipe(
      map(rapports => {
        console.log(`📤 Export ${format} de ${rapports.length} rapports`);
        
        let content: string;
        let mimeType: string;
        
        if (format === 'excel') {
          const headers = ['ID', 'Partenaire', 'Volontaire', 'Mission', 'Période', 'Évaluation', 'Statut', 'Date Soumission'];
          const rows = rapports.map(r => [
            r.id,
            r.partenaireNom,
            r.volontaireNomComplet,
            r.missionVolontaire,
            r.periode,
            r.evaluationGlobale.toString(),
            r.statut,
            new Date(r.dateSoumission).toLocaleDateString('fr-FR')
          ]);
          
          content = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
          mimeType = 'text/csv;charset=utf-8;';
        } else {
          content = `Rapports PNVB - Export du ${new Date().toLocaleDateString('fr-FR')}\n\n`;
          content += `Total: ${rapports.length} rapports\n\n`;
          
          rapports.forEach((r, index) => {
            content += `Rapport ${index + 1}:\n`;
            content += `  Partenaire: ${r.partenaireNom}\n`;
            content += `  Volontaire: ${r.volontaireNomComplet}\n`;
            content += `  Mission: ${r.missionVolontaire}\n`;
            content += `  Période: ${r.periode}\n`;
            content += `  Évaluation: ${r.evaluationGlobale}/10\n`;
            content += `  Statut: ${r.statut}\n`;
            content += `  Date: ${new Date(r.dateSoumission).toLocaleDateString('fr-FR')}\n`;
            if (r.feedbackPNVB) {
              content += `  Feedback: ${r.feedbackPNVB}\n`;
            }
            content += '\n';
          });
          
          mimeType = 'text/plain';
        }
        
        return new Blob([content], { type: mimeType });
      }),
      catchError(error => {
        console.error('❌ Erreur export:', error);
        throw error;
      })
    );
  }

  // ============================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ============================================

  private trouverPartenaire(rapport: any, partenaires: any[]): any {
    const partenaireId = rapport.partenaireId || rapport.structureId;
    
    if (partenaireId && partenaires.length > 0) {
      const partenaire = partenaires.find(p => 
        p.id?.toString() === partenaireId.toString()
      );
      
      if (partenaire) {
        return {
          id: partenaire.id,
          nom: partenaire.nomStructure || partenaire.nom || `Partenaire ${partenaireId}`
        };
      }
    }
    
    return {
      id: partenaireId || 'inconnu',
      nom: `Partenaire ${partenaireId || 'inconnu'}`
    };
  }

  private trouverVolontaire(rapport: any, volontaires: any[]): any {
    const volontaireId = rapport.volontaireId;
    
    if (volontaireId && volontaires.length > 0) {
      const volontaire = volontaires.find(v => 
        v.id?.toString() === volontaireId.toString()
      );
      
      if (volontaire) {
        return {
          nom: `${volontaire.prenom || ''} ${volontaire.nom || ''}`.trim() || `Volontaire ${volontaireId}`
        };
      }
    }
    
    return {
      nom: `Volontaire ${volontaireId || 'inconnu'}`
    };
  }

  private trouverProjet(rapport: any, projets: any[]): any {
    const projetId = rapport.projectId || rapport.projetId;
    
    if (projetId && projets.length > 0) {
      return projets.find(p => p.id?.toString() === projetId.toString()) || null;
    }
    
    return null;
  }

  private calculerPeriode(rapport: any): string {
    const dateStr = rapport.dateSoumission || rapport.created_at || rapport.date;
    
    if (!dateStr) {
      return rapport.periode || 'Non spécifié';
    }
    
    try {
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return rapport.periode || 'Date invalide';
      }
      
      const mois = date.getMonth() + 1;
      const annee = date.getFullYear();
      
      let trimestre = 1;
      if (mois >= 4 && mois <= 6) trimestre = 2;
      if (mois >= 7 && mois <= 9) trimestre = 3;
      if (mois >= 10) trimestre = 4;
      
      return rapport.periode || `Trimestre ${trimestre} ${annee}`;
    } catch (error) {
      return rapport.periode || 'Période non spécifiée';
    }
  }

  private calculerEvaluation(rapport: any): number {
    if (rapport.evaluationGlobale && typeof rapport.evaluationGlobale === 'number') {
      return Number(rapport.evaluationGlobale.toFixed(1));
    }
    
    if (rapport.noteFinale && typeof rapport.noteFinale === 'number') {
      return Number(rapport.noteFinale.toFixed(1));
    }
    
    if (rapport.criteres) {
      let total = 0;
      let count = 0;
      
      if (Array.isArray(rapport.criteres)) {
        rapport.criteres.forEach((critere: any) => {
          if (typeof critere.note === 'number') {
            total += critere.note;
            count++;
          } else if (typeof critere.score === 'number') {
            total += critere.score;
            count++;
          }
        });
      } else if (typeof rapport.criteres === 'object') {
        Object.values(rapport.criteres).forEach((valeur: any) => {
          if (typeof valeur === 'number') {
            total += valeur;
            count++;
          }
        });
      }
      
      if (count > 0) {
        return Number((total / count).toFixed(1));
      }
    }
    
    return 0;
  }

  private determinerMission(rapport: any, projet: any): string {
    if (rapport.mission) return rapport.mission;
    
    if (projet?.title) return projet.title;
    if (projet?.nom) return projet.nom;
    
    if (rapport.poste) return rapport.poste;
    if (rapport.role) return rapport.role;
    
    return 'Mission non spécifiée';
  }

  private determinerStatut(rapport: any): string {
    if (rapport.statut) {
      const statutLower = rapport.statut.toLowerCase();
      
      if (statutLower.includes('valid') || statutLower.includes('approuv')) {
        return 'Validé';
      }
      if (statutLower.includes('rejet') || statutLower.includes('refus')) {
        return 'Rejeté';
      }
      if (statutLower.includes('lu')) {
        return 'Lu par PNVB';
      }
      if (statutLower.includes('soumis') || statutLower.includes('submit')) {
        return 'Soumis';
      }
      if (statutLower.includes('attente') || statutLower.includes('pending')) {
        return 'En attente';
      }
      if (statutLower.includes('brouillon') || statutLower.includes('draft')) {
        return 'Brouillon';
      }
      
      return rapport.statut;
    }
    
    if (rapport.dateValidation) {
      return 'Validé';
    }
    
    if (rapport.feedbackPNVB && rapport.feedbackPNVB.toLowerCase().includes('rejet')) {
      return 'Rejeté';
    }
    
    if (rapport.feedbackPNVB) {
      return 'Lu par PNVB';
    }
    
    return 'Soumis';
  }

  private extraireCommentaires(rapport: any): string {
    const sources = [
      rapport.commentaires,
      rapport.observations,
      rapport.remarques,
      rapport.comments,
      rapport.feedback,
      rapport.notes,
      rapport.description
    ];
    
    for (const source of sources) {
      if (source && typeof source === 'string' && source.trim().length > 0) {
        return source.trim();
      }
    }
    
    return 'Aucun commentaire fourni';
  }

  private extraireProprietesDynamiques(rapport: any): any {
    const proprietesDynamiques: any = {};
    
    const proprietesAExtraire = [
      'created_at',
      'updated_at',
      'dateModification',
      'criteres',
      'urlDocumentAnnexe',
      'nomDocumentAnnexe',
      'raisonRejet',
      'observations',
      'remarques',
      'noteFinale',
      'recommandation',
      'forcePoints',
      'pointsAmelioration',
      'dateValidation',
      'validePar',
      'feedbackPNVB',
      'volontaireId',
      'projectId'
    ];
    
    proprietesAExtraire.forEach(prop => {
      if (rapport[prop] !== undefined) {
        proprietesDynamiques[prop] = rapport[prop];
      }
    });
    
    return proprietesDynamiques;
  }

  private appliquerFiltres(rapports: RapportAdmin[], filters?: any): RapportAdmin[] {
    if (!filters || Object.keys(filters).length === 0) {
      return rapports;
    }
    
    return rapports.filter(rapport => {
      let matches = true;
      
      if (filters.statut && rapport.statut !== filters.statut) {
        matches = false;
      }
      
      if (filters.partenaireId && rapport.partenaireId.toString() !== filters.partenaireId.toString()) {
        matches = false;
      }
      
      if (filters.dateDebut) {
        try {
          const dateRapport = new Date(rapport.dateSoumission);
          const dateDebut = new Date(filters.dateDebut);
          dateDebut.setHours(0, 0, 0, 0);
          
          if (dateRapport < dateDebut) {
            matches = false;
          }
        } catch {
          matches = false;
        }
      }
      
      if (filters.dateFin) {
        try {
          const dateRapport = new Date(rapport.dateSoumission);
          const dateFin = new Date(filters.dateFin);
          dateFin.setHours(23, 59, 59, 999);
          
          if (dateRapport > dateFin) {
            matches = false;
          }
        } catch {
          matches = false;
        }
      }
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const champsRecherche = [
          rapport.partenaireNom,
          rapport.volontaireNomComplet,
          rapport.commentaires,
          rapport.missionVolontaire,
          rapport.periode,
          rapport.feedbackPNVB
        ].filter((champ): champ is string => typeof champ === 'string' && champ.length > 0);
        
        const match = champsRecherche.some(champ => 
          champ.toLowerCase().includes(searchTerm)
        );
        
        if (!match) {
          matches = false;
        }
      }
      
      if (filters.periode && rapport.periode !== filters.periode) {
        matches = false;
      }
      
      return matches;
    });
  }

  private calculerHistoriqueLocal(id: number | string): Observable<any[]> {
    return this.getRapportAdmin(id).pipe(
      map(rapport => {
        const historique: any[] = [];
        
        if (!rapport) {
          return historique;
        }
        
        if (rapport.created_at) {
          historique.push({
            date: rapport.created_at,
            action: 'Création',
            utilisateur: 'Système',
            details: 'Rapport créé initialement',
            type: 'creation'
          });
        }
        
        if (rapport.dateSoumission && rapport.dateSoumission !== rapport.created_at) {
          historique.push({
            date: rapport.dateSoumission,
            action: 'Soumission',
            utilisateur: 'Partenaire',
            details: 'Rapport soumis pour évaluation',
            type: 'soumission'
          });
        }
        
        if (rapport.dateValidation) {
          const action = rapport.statut === 'Rejeté' ? 'Rejet' : 'Validation';
          historique.push({
            date: rapport.dateValidation,
            action: action,
            utilisateur: rapport.validePar || 'Administrateur',
            details: rapport.feedbackPNVB || `${action} du rapport`,
            type: action.toLowerCase()
          });
        }
        
        if (rapport.updated_at && rapport.updated_at !== rapport.created_at) {
          historique.push({
            date: rapport.updated_at,
            action: 'Modification',
            utilisateur: 'Système',
            details: 'Mise à jour des données',
            type: 'modification'
          });
        }
        
        return historique.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      }),
      catchError(() => of([]))
    );
  }

  private calculerStatsPartenaire(partenaire: any, rapports: RapportAdmin[]): PartenaireStats {
    const totalRapports = rapports.length;
    const rapportsValides = rapports.filter(r => r.statut === 'Validé').length;
    
    const evaluations = rapports
      .filter(r => r.evaluationGlobale > 0)
      .map(r => r.evaluationGlobale);
    
    let moyenneEvaluation = 0;
    
    if (evaluations.length > 0) {
      const somme = evaluations.reduce((total: number, note: number) => total + note, 0);
      moyenneEvaluation = Number((somme / evaluations.length).toFixed(1));
    }
    
    let dernierRapport: string | undefined;
    
    if (rapports.length > 0) {
      const dates = rapports
        .map(r => r.dateSoumission)
        .filter(d => d)
        .sort()
        .reverse();
      
      dernierRapport = dates[0];
    }
    
    return {
      id: partenaire.id,
      nom: partenaire.nomStructure || partenaire.nom || `Partenaire ${partenaire.id}`,
      totalRapports,
      rapportsValides,
      moyenneEvaluation,
      dernierRapport
    };
  }

  private mettreAJourRapportLocal(id: number | string, updates: any): Observable<any> {
    console.log(`💾 Mise à jour locale du rapport ${id}`);
    
    try {
      const rapportsLocauxStr = localStorage.getItem('rapports_admin_locaux');
      const rapportsLocaux = rapportsLocauxStr ? JSON.parse(rapportsLocauxStr) : {};
      
      if (!rapportsLocaux[id]) {
        rapportsLocaux[id] = {};
      }
      
      Object.assign(rapportsLocaux[id], updates, {
        updated_at: new Date().toISOString(),
        updated_locally: true
      });
      
      localStorage.setItem('rapports_admin_locaux', JSON.stringify(rapportsLocaux));
      
      console.log(`✅ Rapport ${id} mis à jour localement`);
      
      return of({
        success: true,
        id: id,
        message: 'Rapport mis à jour localement',
        updates: updates,
        local: true
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour locale:', error);
      return of({
        success: false,
        id: id,
        message: 'Erreur lors de la mise à jour locale'
      });
    }
  }

  private genererId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private getStatsVides(): StatsAdmin {
    return {
      totalRapports: 0,
      rapportsSoumis: 0,
      rapportsValides: 0,
      rapportsEnAttente: 0,
      rapportsRejetes: 0,
      moyenneGenerale: 0,
      partenairesActifs: 0
    };
  }
}