// src/app/features/services/service_parten/partenaire.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { 
  Partenaire, 
  PartenaireDashboardStats, 
  InscriptionPartenaire,
  PartenairePermissionsService,
  TypeStructurePNVB,
  Alerte
} from '../../models/partenaire.model';

@Injectable({
  providedIn: 'root',
})
export class PartenaireService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  /** 🔹 Récupérer tous les partenaires */
  getAll(): Observable<Partenaire[]> {
    return this.http.get<Partenaire[]>(`${this.apiUrl}/partenaires`);
  }

  /** 🔹 Récupérer un partenaire par son ID (accepte string et number) */
  getById(id: string | number): Observable<Partenaire> {
    const idString = id.toString();
    console.log('🔍 Recherche partenaire par ID:', idString);
    return this.http.get<Partenaire>(`${this.apiUrl}/partenaires/${idString}`).pipe(
      catchError((error: any) => {
        console.error('❌ Erreur chargement partenaire:', error);
        throw error;
      })
    );
  }

  /** 🔹 Inscrire un partenaire avec types multiples */
  inscrirePartenaire(data: InscriptionPartenaire): Observable<Partenaire> {
    const partenaire = PartenairePermissionsService.creerPartenaireAvecPermissions(data);
    
    console.log('🔄 Création nouveau partenaire multi-types:', partenaire);
    
    return this.http.post<Partenaire>(`${this.apiUrl}/partenaires`, partenaire).pipe(
      tap((newPartenaire: Partenaire) => console.log('✅ Partenaire créé:', newPartenaire)),
      catchError((error: any) => {
        console.error('❌ Erreur création partenaire:', error);
        throw error;
      })
    );
  }

  /** 🔹 Créer un partenaire (méthode existante pour compatibilité) */
  create(partenaire: Partenaire): Observable<Partenaire> {
    const partenaireAvecDates = {
      ...partenaire,
      cree_le: new Date().toISOString(),
      mis_a_jour_le: new Date().toISOString()
    };
    return this.http.post<Partenaire>(`${this.apiUrl}/partenaires`, partenaireAvecDates);
  }

  /** 🔹 Mettre à jour un partenaire existant (accepte string et number) */
  update(id: string | number, partenaire: Partenaire): Observable<Partenaire> {
    const idString = id.toString();
    const partenaireAvecDate = {
      ...partenaire,
      mis_a_jour_le: new Date().toISOString()
    };
    return this.http.put<Partenaire>(`${this.apiUrl}/partenaires/${idString}`, partenaireAvecDate);
  }

  /** 🔹 Supprimer un partenaire (accepte string et number) */
  delete(id: string | number): Observable<any> {
    const idString = id.toString();
    return this.http.delete(`${this.apiUrl}/partenaires/${idString}`);
  }

  /** 🔹 Activer/Désactiver un compte partenaire (accepte string et number) */
  toggleAccountStatus(id: string | number, active: boolean): Observable<Partenaire> {
    const idString = id.toString();
    const updateData: any = { 
      estActive: active,
      compteActive: active,
      mis_a_jour_le: new Date().toISOString()
    };

    if (active) {
      updateData.dateActivation = new Date().toISOString();
    }
    
    return this.http.patch<Partenaire>(`${this.apiUrl}/partenaires/${idString}`, updateData);
  }

  /** 🔹 Vérifier les permissions d'un partenaire (accepte string et number) */
  verifierPermissionsPartenaire(partenaireId: string | number): Observable<any> {
    const idString = partenaireId.toString();
    return this.getById(idString).pipe(
      map((partenaire: Partenaire) => {
        if (!partenaire) {
          throw new Error('Partenaire non trouvé');
        }
        
        return {
          // Permissions globales
          peutCreerProjets: partenaire.permissions?.peutCreerProjets ?? false,
          peutGererVolontaires: partenaire.permissions?.peutGererVolontaires ?? false,
          peutVoirStatistiques: partenaire.permissions?.peutVoirStatistiques ?? true,
          peutVoirRapports: partenaire.permissions?.peutVoirRapports ?? false,
          accesZonePTF: partenaire.permissions?.accesZonePTF ?? false,
          
          // Informations sur les types
          typeStructures: partenaire.typeStructures || [],
          estPTF: PartenairePermissionsService.estPTF(partenaire),
          estStructureAccueil: PartenairePermissionsService.estStructureAccueil(partenaire),
          
          // Détail des permissions par type
          permissionsParType: partenaire.permissions?.permissionsParType || {}
        };
      }),
      catchError((error: any) => {
        console.warn('Erreur vérification permissions, retour permissions par défaut');
        return of({
          peutCreerProjets: true,
          peutGererVolontaires: true,
          peutVoirStatistiques: true,
          peutVoirRapports: false,
          accesZonePTF: false,
          typeStructures: [],
          estPTF: false,
          estStructureAccueil: true,
          permissionsParType: {}
        });
      })
    );
  }

  /** 🔹 Récupérer le dashboard adapté aux types multiples (accepte string et number) */
  getDashboardAdapte(partenaireId: string | number): Observable<any> {
    const idString = partenaireId.toString();
    console.log('🔄 Chargement dashboard adapté pour:', idString);
    
    return forkJoin({
      partenaire: this.getById(idString),
      projets: this.getProjetsAvecCandidatures(idString)
    }).pipe(
      map(({ partenaire, projets }: { partenaire: Partenaire; projets: any[] }) => {
        const estPTF = PartenairePermissionsService.estPTF(partenaire);
        const estStructureAccueil = PartenairePermissionsService.estStructureAccueil(partenaire);

        let dashboardData: any = {
          partenaireInfo: {
            nomStructure: partenaire.nomStructure,
            typeStructures: partenaire.typeStructures,
            estPTF,
            estStructureAccueil
          }
        };

        // Dashboard pour PTF
        if (estPTF) {
          const dashboardPTF = this.genererDashboardPTF(partenaire, projets);
          dashboardData = { ...dashboardData, ...dashboardPTF };
        }

        // Dashboard pour Structure d'Accueil
        if (estStructureAccueil) {
          const dashboardStructure = this.genererDashboardStructureAccueil(projets);
          dashboardData = { ...dashboardData, ...dashboardStructure };
        }

        // Dashboard mixte si les deux rôles
        if (estPTF && estStructureAccueil) {
          dashboardData.dashboardMixte = this.genererDashboardMixte(partenaire, projets);
        }

        return dashboardData;
      }),
      catchError((error: any) => {
        console.error('❌ Erreur chargement dashboard adapté:', error);
        return of(this.getDashboardParDefaut());
      })
    );
  }

  /** 🔹 Récupérer les statistiques dashboard (accepte string et number) */
  getDashboardStats(partenaireId: string | number): Observable<PartenaireDashboardStats> {
    const idString = partenaireId.toString();
    console.log('📊 Chargement stats dashboard pour:', idString);
    
    return this.getProjetsAvecCandidatures(idString).pipe(
      map((projets: any[]) => this.calculerStatsDashboard(projets)),
      catchError((error: any) => {
        console.error('❌ Erreur calcul stats dashboard:', error);
        return of(this.getStatsParDefaut());
      })
    );
  }

  /** 🔹 Récupérer les statistiques complètes (accepte string et number) */
  getStatsCompletesPartenaire(partenaireId: string | number): Observable<any> {
    const idString = partenaireId.toString();
    
    return forkJoin({
      partenaire: this.getById(idString),
      projets: this.getProjetsAvecCandidatures(idString)
    }).pipe(
      map(({ partenaire, projets }: { partenaire: Partenaire; projets: any[] }) => {
        if (!projets || projets.length === 0) {
          return {
            totalProjets: 0,
            projetsActifs: 0,
            projetsTermines: 0,
            projetsEnAttente: 0,
            volontairesAffectes: 0,
            dateDernierProjet: undefined,
            statsParType: this.initialiserStatsParType(partenaire.typeStructures)
          };
        }

        const totalVolontairesAffectes = projets.reduce((total: number, projet: any) => 
          total + (projet.volontairesAffectes || 0), 0
        );

        const totalProjets = projets.length;
        const projetsActifs = projets.filter((p: any) => 
          p.status === 'En cours' || p.status === 'en cours' || p.status === 'Actif'
        ).length;
        const projetsTermines = projets.filter((p: any) => 
          p.status === 'Clôturé' || p.status === 'clôturé' || p.status === 'Terminé'
        ).length;
        const projetsEnAttente = projets.filter((p: any) => 
          p.status === 'Soumis' || p.status === 'Planifié' || 
          p.status === 'soumis' || p.status === 'planifié' ||
          p.status === 'En attente'
        ).length;

        return {
          totalProjets: totalProjets,
          projetsActifs: projetsActifs,
          projetsTermines: projetsTermines,
          projetsEnAttente: projetsEnAttente,
          volontairesAffectes: totalVolontairesAffectes,
          dateDernierProjet: this.getDernierProjetDate(projets),
          statsParType: this.calculerStatsParType(partenaire.typeStructures, projets)
        };
      }),
      catchError((error: any) => {
        console.error('Erreur stats complètes partenaire:', error);
        return of({
          totalProjets: 0,
          projetsActifs: 0,
          projetsTermines: 0,
          projetsEnAttente: 0,
          volontairesAffectes: 0,
          dateDernierProjet: undefined,
          statsParType: {}
        });
      })
    );
  }

  // ============================================================================
  // MÉTHODES POUR LES PROJETS
  // ============================================================================

  /** 🔹 Créer un nouveau projet */
  createProjet(projet: any): Observable<any> {
    const projetAvecDates = {
      ...projet,
      cree_le: new Date().toISOString(),
      mis_a_jour_le: new Date().toISOString()
    };
    
    console.log('🔄 Création nouveau projet:', projetAvecDates);
    
    return this.http.post<any>(`${this.apiUrl}/projets`, projetAvecDates).pipe(
      tap((newProjet: any) => console.log('✅ Projet créé:', newProjet)),
      catchError((error: any) => {
        console.error('❌ Erreur création projet:', error);
        throw error;
      })
    );
  }

  /** 🔹 Mettre à jour un projet existant */
  updateProjet(id: number, projet: any): Observable<any> {
    const projetAvecDate = {
      ...projet,
      mis_a_jour_le: new Date().toISOString()
    };
    
    console.log('🔄 Mise à jour projet ID:', id, 'Données:', projetAvecDate);
    
    return this.http.put<any>(`${this.apiUrl}/projets/${id}`, projetAvecDate).pipe(
      tap((updatedProjet: any) => console.log('✅ Projet mis à jour:', updatedProjet)),
      catchError((error: any) => {
        console.error('❌ Erreur mise à jour projet:', error);
        throw error;
      })
    );
  }

  /** 🔹 Supprimer un projet */
  deleteProjet(projetId: number): Observable<any> {
    console.log('🔄 Suppression projet ID:', projetId);
    
    return this.http.delete(`${this.apiUrl}/projets/${projetId}`).pipe(
      tap(() => console.log('✅ Projet supprimé:', projetId)),
      catchError((error: any) => {
        console.error('❌ Erreur suppression projet:', error);
        throw error;
      })
    );
  }

  /** 🔹 Récupérer les projets d'un partenaire */
  getProjetsByPartenaire(partenaireId: number | string): Observable<any[]> {
    const partenaireIdStr = partenaireId.toString();
    
    return this.http.get<any[]>(`${this.apiUrl}/projets`).pipe(
      map((projets: any[]) => {
        const projetsFiltres = projets.filter((projet: any) => {
          if (!projet.partenaireId) return false;
          return projet.partenaireId.toString() === partenaireIdStr;
        });
        
        console.log(`🔍 Projets pour partenaire ${partenaireIdStr}:`, projetsFiltres.length, 'projets trouvés');
        return projetsFiltres;
      }),
      catchError((error: any) => {
        console.error('Erreur chargement projets partenaire:', error);
        return of([]);
      })
    );
  }

  /** 🔹 Récupère un projet spécifique avec toutes ses données */
  getProjetDetail(partenaireId: number | string, projetId: number | string): Observable<any> {
    const partenaireIdStr = partenaireId.toString();
    const projetIdStr = projetId.toString();

    return forkJoin({
      projets: this.getProjetsByPartenaire(partenaireIdStr),
      candidatures: this.http.get<any[]>(`${this.apiUrl}/candidatures`).pipe(catchError(() => of([]))),
      affectations: this.http.get<any[]>(`${this.apiUrl}/affectations`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ projets, candidatures, affectations }: { projets: any[]; candidatures: any[]; affectations: any[] }) => {
        console.log('🔍 Recherche projet', projetIdStr, 'parmi', projets.length, 'projets');
        
        const projetTrouve = projets.find((projet: any) => {
          const idProjet = projet.id?.toString();
          return idProjet === projetIdStr;
        });

        if (!projetTrouve) {
          console.warn('❌ Projet non trouvé. IDs disponibles:', projets.map((p: any) => p.id));
          throw new Error('Projet non trouvé');
        }

        console.log('✅ Projet trouvé:', projetTrouve);

        const candidaturesProjet = candidatures.filter((c: any) => 
          c.projectId?.toString() === projetIdStr
        );

        const affectationsProjet = affectations.filter((a: any) => 
          a.projectId?.toString() === projetIdStr && a.statut === 'active'
        );

        return {
          ...projetTrouve,
          total_candidatures: candidaturesProjet.length,
          candidatures_en_attente: candidaturesProjet.filter((c: any) => 
            c.statut === 'en_attente'
          ).length,
          volontairesAffectes: affectationsProjet.length,
          candidatures_entretien: candidaturesProjet.filter((c: any) => 
            c.statut === 'entretien'
          ).length,
          candidatures_acceptees: candidaturesProjet.filter((c: any) => 
            c.statut === 'acceptee'
          ).length,
          candidatures_refusees: candidaturesProjet.filter((c: any) => 
            c.statut === 'refusee'
          ).length,
          _candidatures: candidaturesProjet,
          _affectations: affectationsProjet
        };
      }),
      catchError((error: any) => {
        console.error('❌ Erreur chargement détail projet:', error);
        throw error;
      })
    );
  }

  /** 🔹 Récupère les projets avec candidatures ET affectations */
  getProjetsAvecCandidatures(partenaireId: number | string): Observable<any[]> {
    const partenaireIdStr = partenaireId.toString();
    
    return forkJoin({
      projets: this.getProjetsByPartenaire(partenaireIdStr),
      candidatures: this.http.get<any[]>(`${this.apiUrl}/candidatures`).pipe(catchError(() => of([]))),
      affectations: this.http.get<any[]>(`${this.apiUrl}/affectations`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ projets, candidatures, affectations }: { projets: any[]; candidatures: any[]; affectations: any[] }) => {
        console.log('📊 Données pour calcul stats - Projets:', projets.length, 'Candidatures:', candidatures.length, 'Affectations:', affectations.length);

        return projets.map((projet: any) => {
          const projetIdStr = projet.id.toString();

          const candidaturesProjet = candidatures.filter((c: any) => {
            if (!c.projectId) return false;
            return c.projectId.toString() === projetIdStr;
          });

          const affectationsProjet = affectations.filter((a: any) => {
            if (!a.projectId) return false;
            return a.projectId.toString() === projetIdStr && a.statut === 'active';
          });

          const total_candidatures = candidaturesProjet.length;
          const candidatures_en_attente = candidaturesProjet.filter((c: any) => 
            c.statut === 'en_attente'
          ).length;
          const volontairesAffectes = affectationsProjet.length;

          const candidatures_entretien = candidaturesProjet.filter((c: any) => 
            c.statut === 'entretien'
          ).length;
          const candidatures_acceptees = candidaturesProjet.filter((c: any) => 
            c.statut === 'acceptee'
          ).length;
          const candidatures_refusees = candidaturesProjet.filter((c: any) => 
            c.statut === 'refusee'
          ).length;

          return {
            ...projet,
            total_candidatures,
            candidatures_en_attente,
            volontairesAffectes,
            candidatures_entretien,
            candidatures_acceptees,
            candidatures_refusees,
            nouvellesCandidatures: candidatures_en_attente,
            currentVolunteers: volontairesAffectes,
            _candidatures: candidaturesProjet,
            _affectations: affectationsProjet
          };
        });
      }),
      catchError((error: any) => {
        console.error('❌ Erreur chargement projets avec candidatures:', error);
        return of([]);
      })
    );
  }

  // ============================================================================
  // MÉTHODES POUR LES STATISTIQUES
  // ============================================================================

  /** 🔹 Récupérer les statistiques globales */
  getStatsGlobales(): Observable<any> {
    return this.getAll().pipe(
      map((partenaires: Partenaire[]) => {
        const totalPartenaires = partenaires.length;
        const partenairesActifs = partenaires.filter((p: Partenaire) => p.estActive || p.compteActive).length;
        
        // Compter les types multiples
        const types = this.compterTypesMultiples(partenaires);
        const domaines = this.compterDomaines(partenaires);
        
        return {
          totalPartenaires,
          partenairesActifs,
          partenairesInactifs: totalPartenaires - partenairesActifs,
          types,
          domaines,
          // NOUVEAU : Statistiques par rôle
          statsRoles: {
            totalPTF: partenaires.filter((p: Partenaire) => PartenairePermissionsService.estPTF(p)).length,
            totalStructuresAccueil: partenaires.filter((p: Partenaire) => PartenairePermissionsService.estStructureAccueil(p)).length,
            totalMixtes: partenaires.filter((p: Partenaire) => 
              PartenairePermissionsService.estPTF(p) && PartenairePermissionsService.estStructureAccueil(p)
            ).length
          }
        };
      })
    );
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES
  // ============================================================================

  /** 🔹 Compter les types de partenaires (multiples) */
  private compterTypesMultiples(partenaires: Partenaire[]): any {
    const types: any = {};
    partenaires.forEach((p: Partenaire) => {
      p.typeStructures?.forEach((type: string) => {
        types[type] = (types[type] || 0) + 1;
      });
    });
    return types;
  }

  /** 🔹 Compter les domaines d'activité */
  private compterDomaines(partenaires: Partenaire[]): any {
    const domaines: any = {};
    partenaires.forEach((p: Partenaire) => {
      const domaine = p.domaineActivite || 'Non spécifié';
      domaines[domaine] = (domaines[domaine] || 0) + 1;
    });
    return domaines;
  }

  /** 🔹 Initialiser les statistiques par type */
  private initialiserStatsParType(typeStructures: TypeStructurePNVB[]): any {
    const stats: any = {};
    typeStructures.forEach((type: TypeStructurePNVB) => {
      stats[type] = {
        projets: 0,
        volontaires: 0,
        budgetTotal: 0
      };
    });
    return stats;
  }

  /** 🔹 Calculer les statistiques par type */
  private calculerStatsParType(typeStructures: TypeStructurePNVB[], projets: any[]): any {
    const stats = this.initialiserStatsParType(typeStructures);
    
    const projetsParType = Math.floor(projets.length / typeStructures.length) || 0;
    const volontairesParType = Math.floor(
      projets.reduce((total: number, p: any) => total + (p.volontairesAffectes || 0), 0) / typeStructures.length
    ) || 0;

    typeStructures.forEach((type: TypeStructurePNVB) => {
      stats[type] = {
        projets: projetsParType,
        volontaires: volontairesParType,
        budgetTotal: 0
      };
    });

    return stats;
  }

  /** 🔹 Vérifier si un projet est actif */
  private estProjetActif(projet: any): boolean {
    const status = projet.status || projet.statut || '';
    return [
      'en cours', 'actif', 'active', 'en_cours', 'published'
    ].includes(status.toLowerCase());
  }

  /** 🔹 Vérifier si un projet est en attente */
  private estProjetEnAttente(projet: any): boolean {
    const status = projet.status || projet.statut || '';
    return [
      'soumis', 'en attente', 'pending', 'submitted', 'en_attente', 'under_review'
    ].includes(status.toLowerCase());
  }

  /** 🔹 Vérifier si un projet est terminé */
  private estProjetTermine(projet: any): boolean {
    const status = projet.status || projet.statut || '';
    return [
      'clôturé', 'terminé', 'completed', 'closed', 'finished', 'cloture', 'termine'
    ].includes(status.toLowerCase());
  }

  /** 🔹 Obtenir le statut d'un projet pour PTF */
  private getStatutProjet(projet: any): 'actif' | 'termine' | 'en_attente' {
    if (this.estProjetActif(projet)) return 'actif';
    if (this.estProjetTermine(projet)) return 'termine';
    return 'en_attente';
  }

  /** 🔹 Générer l'évolution des candidatures */
  private genererEvolutionCandidatures(totalCandidatures: number): { date: string; count: number }[] {
    const today = new Date();
    const baseCount = Math.max(1, Math.floor(totalCandidatures / 30));
    
    return Array.from({ length: 30 }, (_, i: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * baseCount * 1.5) + 1
      };
    });
  }

  /** 🔹 Générer les rapports PTF */
  private genererRapportsPTF(partenaireId: number): any[] {
    return [
      {
        id: 1,
        titre: 'Rapport Trimestriel Q1 2024',
        type: 'rapport_trimestriel',
        date: '2024-03-31',
        url: `/rapports/trimestriel-q1-2024-${partenaireId}`
      },
      {
        id: 2,
        titre: 'Rapport d\'Impact Annuel 2023',
        type: 'rapport_annuel',
        date: '2024-01-15',
        url: `/rapports/impact-annuel-2023-${partenaireId}`
      }
    ];
  }

  /** 🔹 Générer les alertes PTF */
  private genererAlertesPTF(projetsFinances: any[]): any[] {
    const alertes: any[] = [];
    
    // Alerte rapport à soumettre
    alertes.push({
      id: 1,
      type: 'rapport_a_soumettre',
      titre: 'Rapport trimestriel à soumettre',
      message: 'Votre rapport trimestriel pour Q2 2024 est attendu avant le 30 juin',
      date: new Date().toISOString(),
      lu: false,
      lien: '/rapports/soumettre'
    });

    // Alertes échéances projets
    const dans30Jours = new Date();
    dans30Jours.setDate(dans30Jours.getDate() + 30);
    
    projetsFinances.forEach((projet: any) => {
      if (projet.statut === 'actif' && new Date(projet.dateFin) < dans30Jours) {
        alertes.push({
          id: alertes.length + 1,
          type: 'projet_echeance',
          titre: 'Projet arrivant à échéance',
          message: `Le projet "${projet.titre}" se termine le ${new Date(projet.dateFin).toLocaleDateString()}`,
          date: new Date().toISOString(),
          lu: false,
          lien: `/projets/${projet.id}`
        });
      }
    });

    return alertes;
  }

  /** 🔹 Générer les alertes du dashboard */
  private genererAlertesDashboard(projets: any[]): any[] {
    const alertes: any[] = [];
    
    if (!projets || !Array.isArray(projets)) return alertes;

    // Alertes nouvelles candidatures
    projets.forEach((projet: any) => {
      const nouvellesCandidatures = projet.candidatures_en_attente || projet.nouvellesCandidatures || 0;
      
      if (nouvellesCandidatures > 0) {
        alertes.push({
          id: Date.now() + alertes.length,
          type: 'nouvelle_candidature',
          titre: 'Nouvelles candidatures',
          message: `${nouvellesCandidatures} nouvelle(s) candidature(s) pour "${projet.title || projet.nom || 'Projet sans nom'}"`,
          date: new Date().toISOString(),
          lu: false,
          lien: `/features/partenaires/candidatures?projet=${projet.id}`
        });
      }
    });

    // Alertes échéances projets
    const dans7Jours = new Date();
    dans7Jours.setDate(dans7Jours.getDate() + 7);
    
    projets.forEach((projet: any) => {
      const endDate = projet.endDate || projet.dateFin;
      const isActif = this.estProjetActif(projet);
      
      if (endDate && isActif && new Date(endDate) < dans7Jours) {
        alertes.push({
          id: Date.now() + alertes.length,
          type: 'projet_echeance',
          titre: 'Projet arrivant à échéance',
          message: `Le projet "${projet.title || projet.nom}" se termine le ${new Date(endDate).toLocaleDateString()}`,
          date: new Date().toISOString(),
          lu: false,
          lien: `/features/partenaires/projets/${projet.id}`
        });
      }
    });

    // Alerte si aucun projet actif
    const projetsActifs = projets.filter((p: any) => this.estProjetActif(p));
    if (projetsActifs.length === 0 && projets.length > 0) {
      alertes.push({
        id: Date.now(),
        type: 'action_requise',
        titre: 'Aucun projet actif',
        message: 'Vous n\'avez actuellement aucun projet en cours. Souhaitez-vous en créer un nouveau ?',
        date: new Date().toISOString(),
        lu: false,
        lien: '/features/partenaires/soumettre'
      });
    }

    return alertes.slice(0, 5);
  }

  /** 🔹 Calculer les statistiques du dashboard */
  private calculerStatsDashboard(projets: any[]): PartenaireDashboardStats {
    console.log('📈 Calcul stats sur', projets?.length, 'projets');

    if (!projets || !Array.isArray(projets)) {
      console.warn('⚠️ Aucun projet trouvé pour calcul stats');
      return this.getStatsParDefaut();
    }

    const totalProjets = projets.length;
    const projetsActifs = projets.filter((p: any) => this.estProjetActif(p)).length;
    const projetsEnAttente = projets.filter((p: any) => this.estProjetEnAttente(p)).length;
    const projetsTermines = projets.filter((p: any) => this.estProjetTermine(p)).length;

    const totalCandidatures = projets.reduce((total: number, p: any) => 
      total + (p.total_candidatures || 0), 0
    );
    
    const nouvellesCandidatures = projets.reduce((total: number, p: any) => 
      total + (p.candidatures_en_attente || p.nouvellesCandidatures || 0), 0
    );

    const volontairesActuels = projets.reduce((total: number, p: any) => 
      total + (p.volontairesAffectes || p.currentVolunteers || 0), 0
    );

    const stats: PartenaireDashboardStats = {
      totalProjets,
      projetsActifs,
      projetsEnAttente,
      projetsTermines,
      totalCandidatures,
      nouvellesCandidatures,
      volontairesActuels,
      evolutionCandidatures: this.genererEvolutionCandidatures(totalCandidatures),
      alertes: this.genererAlertesDashboard(projets)
    };

    console.log('✅ Stats dashboard calculées:', stats);
    return stats;
  }

  /** 🔹 Stats par défaut */
  private getStatsParDefaut(): PartenaireDashboardStats {
    return {
      totalProjets: 0,
      projetsActifs: 0,
      projetsEnAttente: 0,
      projetsTermines: 0,
      totalCandidatures: 0,
      nouvellesCandidatures: 0,
      volontairesActuels: 0,
      evolutionCandidatures: [],
      alertes: []
    };
  }

  /** 🔹 Dashboard par défaut */
  private getDashboardParDefaut(): any {
    return {
      partenaireInfo: {
        nomStructure: '',
        typeStructures: [],
        estPTF: false,
        estStructureAccueil: false
      },
      dashboardStructure: this.getStatsParDefaut()
    };
  }

  /** 🔹 Méthode utilitaire pour obtenir la date du dernier projet */
  private getDernierProjetDate(projets: any[]): string | undefined {
    if (!projets.length) return undefined;
    
    const datesValides = projets
      .map((p: any) => new Date(p.cree_le || p.startDate || p.mis_a_jour_le || p.created_at))
      .filter((date: Date) => !isNaN(date.getTime()));
    
    if (!datesValides.length) return undefined;
    
    const derniereDate = new Date(Math.max(...datesValides.map((d: Date) => d.getTime())));
    return derniereDate.toLocaleDateString('fr-FR');
  }

  /** 🔹 Marquer une alerte comme lue */
  marquerAlerteCommeLue(alerteId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/alertes/${alerteId}`, { lu: true }).pipe(
      catchError((error: any) => {
        console.warn('Service alertes non disponible, marquage local');
        return of({ success: true });
      })
    );
  }

  // Version robuste de getPartenaireByEmail
  getPartenaireByEmail(email: string): Observable<Partenaire | null> {
    console.log('🔍 Recherche partenaire par email:', email);
    
    if (!email) {
      console.error('❌ Email non fourni');
      return of(null);
    }

    return this.http.get<Partenaire[]>(`${this.apiUrl}/partenaires`).pipe(
      map((partenaires: Partenaire[]) => {
        // Filtrer côté client pour plus de robustesse
        const partenaireTrouve = partenaires.find((p: Partenaire) => 
          p.email?.toLowerCase() === email.toLowerCase()
        );
        
        if (partenaireTrouve) {
          console.log('✅ Partenaire trouvé:', partenaireTrouve);
          return partenaireTrouve;
        } else {
          console.error('❌ Aucun partenaire trouvé pour email:', email);
          console.log('📋 Emails disponibles:', partenaires.map(p => p.email));
          return null;
        }
      }),
      catchError((error: any) => {
        console.error('💥 Erreur API recherche partenaire:', error);
        // En cas d'erreur, essayer de récupérer depuis le localStorage
        return this.getPartenaireFromLocalStorage(email);
      })
    );
  }

  /** 🔹 Méthode de secours - récupérer depuis localStorage */
  private getPartenaireFromLocalStorage(email: string): Observable<Partenaire | null> {
    try {
      const partenaireData = localStorage.getItem('currentPartenaire');
      if (partenaireData) {
        const partenaire = JSON.parse(partenaireData);
        if (partenaire.email === email) {
          console.log('✅ Partenaire récupéré depuis localStorage');
          return of(partenaire);
        }
      }
      
      // Essayer depuis currentUser
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.email === email && user.role === 'partenaire') {
          console.log('✅ Partenaire récupéré depuis currentUser');
          return of(user);
        }
      }
      
      return of(null);
    } catch (error) {
      console.error('Erreur lecture localStorage:', error);
      return of(null);
    }
  }

  /** 🔹 Générer le dashboard PTF */
  private genererDashboardPTF(partenaire: Partenaire, projets: any[]): any {
    const projetsFinances = projets.map((projet: any) => ({
      id: projet.id,
      titre: projet.title || projet.nom,
      structurePorteuse: projet.structurePorteuse || 'PNVB',
      montantFinance: projet.budget || 0,
      dateDebut: projet.startDate,
      dateFin: projet.endDate,
      statut: this.getStatutProjet(projet),
      volontairesAffectes: projet.volontairesAffectes || 0
    }));

    const totalInvesti = projetsFinances.reduce((total: number, projet: any) => total + projet.montantFinance, 0);
    const projetsActifs = projetsFinances.filter((p: any) => p.statut === 'actif').length;
    const projetsTermines = projetsFinances.filter((p: any) => p.statut === 'termine').length;
    const volontairesSupportes = projetsFinances.reduce((total: number, projet: any) => total + projet.volontairesAffectes, 0);

    return {
      dashboardPTF: {
        projetsFinances,
        statistiquesFinancement: {
          totalInvesti,
          projetsActifs,
          projetsTermines,
          impactCommunautaire: Math.round((volontairesSupportes / 100) * 75),
          volontairesSupportes
        },
        rapports: this.genererRapportsPTF(partenaire.id!),
        alertes: this.genererAlertesPTF(projetsFinances)
      }
    };
  }

  /** 🔹 Générer le dashboard Structure d'Accueil */
  private genererDashboardStructureAccueil(projets: any[]): any {
    const stats = this.calculerStatsDashboard(projets);
    
    return {
      dashboardStructure: {
        ...stats,
        projetsRecents: projets
          .sort((a: any, b: any) => new Date(b.cree_le).getTime() - new Date(a.cree_le).getTime())
          .slice(0, 5)
      }
    };
  }

  /** 🔹 Générer le dashboard mixte */
  private genererDashboardMixte(partenaire: Partenaire, projets: any[]): any {
    const dashboardPTF = this.genererDashboardPTF(partenaire, projets);
    const dashboardStructure = this.genererDashboardStructureAccueil(projets);

    return {
      resume: {
        totalProjets: dashboardStructure.dashboardStructure.totalProjets,
        totalInvestissements: dashboardPTF.dashboardPTF.statistiquesFinancement.totalInvesti,
        volontairesTotal: dashboardStructure.dashboardStructure.volontairesActuels + 
                         dashboardPTF.dashboardPTF.statistiquesFinancement.volontairesSupportes
      },
      alertesCombinees: [
        ...(dashboardPTF.dashboardPTF.alertes || []),
        ...(dashboardStructure.dashboardStructure.alertes || [])
      ].slice(0, 10)
    };
  }

  // Méthodes à ajouter dans la classe PartenaireService

/** 🔹 Récupérer les affectations d'un partenaire */
getAffectationsByPartenaire(partenaireId: string | number): Observable<any[]> {
  return forkJoin({
    projets: this.getProjetsByPartenaire(partenaireId),
    affectations: this.http.get<any[]>(`${this.apiUrl}/affectations`)
  }).pipe(
    map(({ projets, affectations }) => {
      const projetIds = projets.map((p: any) => p.id);
      return affectations.filter((affectation: any) => 
        projetIds.includes(affectation.projectId)
      );
    }),
    catchError(() => of([]))
  );
}

/** 🔹 Récupérer les volontaires disponibles */
getVolontairesDisponibles(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/volontaires`).pipe(
    catchError(() => of([]))
  );
}

/** 🔹 Soumettre un rapport d'évaluation */
soumettreRapportEvaluation(rapport: any): Observable<any> {
  const rapportAvecDates = {
    ...rapport,
    dateSoumission: new Date().toISOString(),
    cree_le: new Date().toISOString()
  };
  
  return this.http.post(`${this.apiUrl}/rapports-evaluation`, rapportAvecDates);
}

/** 🔹 Récupérer les rapports d'évaluation d'un partenaire */
getRapportsEvaluation(partenaireId: string | number): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/rapports-evaluation`).pipe(
    map((rapports: any[]) => 
      rapports.filter((rapport: any) => 
        rapport.partenaireId === partenaireId.toString()
      )
    ),
    catchError(() => of([]))
  );
}

/** 🔹 Mettre à jour le statut d'une offre de mission */
updateStatutOffreMission(offreId: number, statut: string): Observable<any> {
  return this.http.patch(`${this.apiUrl}/offres-mission/${offreId}`, {
    statut,
    mis_a_jour_le: new Date().toISOString()
  });
}

/** 🔹 Récupérer les données financières PTF */
getDonneesFinancieresPTF(partenaireId: string | number): Observable<any> {
  return forkJoin({
    projets: this.getProjetsByPartenaire(partenaireId),
    rapports: this.http.get<any[]>(`${this.apiUrl}/rapports-financiers`)
  }).pipe(
    map(({ projets, rapports }) => {
      // Calculer les données financières
      const projetsPTF = projets.filter((p: any) => 
        p.type === 'finance_ptf' || p.financeParPTF === true
      );
      
      const montantTotal = projetsPTF.reduce((total: number, p: any) => 
        total + (p.budget || 0), 0
      );
      
      const rapportsPTF = rapports.filter((r: any) => 
        r.partenaireId === partenaireId.toString()
      );
      
      return {
        montantTotal,
        projetsFinances: projetsPTF.length,
        rapportsFinanciers: rapportsPTF,
        decompositionBudget: this.calculerDecompositionBudget(projetsPTF)
      };
    }),
    catchError(() => of({
      montantTotal: 0,
      projetsFinances: 0,
      rapportsFinanciers: [],
      decompositionBudget: {}
    }))
  );
}

private calculerDecompositionBudget(projets: any[]): any {
  const decomposition: any = {
    salaires: 0,
    equipement: 0,
    formation: 0,
    logistique: 0,
    autres: 0
  };
  
  projets.forEach((projet: any) => {
    if (projet.decompositionBudget) {
      Object.keys(projet.decompositionBudget).forEach((poste: string) => {
        if (decomposition[poste] !== undefined) {
          decomposition[poste] += projet.decompositionBudget[poste];
        }
      });
    }
  });
  
  return decomposition;
}

// Dans la classe PartenaireService

/** 🔹 Récupérer les offres de mission depuis le JSON */
getOffresMission(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/offresMission`).pipe(
    catchError(() => {
      // Si l'endpoint n'existe pas encore, retourner un tableau vide
      console.log('Endpoint offresMission non disponible, retour tableau vide');
      return of([]);
    })
  );
}

/** 🔹 Créer une nouvelle offre de mission */
creerOffreMission(offre: any): Observable<any> {
  const offreAvecDates = {
    ...offre,
    id: this.generateId(),
    dateCreation: new Date().toISOString(),
    cree_le: new Date().toISOString(),
    mis_a_jour_le: new Date().toISOString()
  };
  
  return this.http.post<any>(`${this.apiUrl}/offresMission`, offreAvecDates).pipe(
    tap((newOffre: any) => console.log('✅ Offre créée:', newOffre)),
    catchError((error: any) => {
      console.error('❌ Erreur création offre:', error);
      throw error;
    })
  );
}

/** 🔹 Mettre à jour une offre de mission */
updateOffreMission(id: string, offre: any): Observable<any> {
  const offreAvecDate = {
    ...offre,
    mis_a_jour_le: new Date().toISOString()
  };
  
  return this.http.put<any>(`${this.apiUrl}/offresMission/${id}`, offreAvecDate).pipe(
    tap((updatedOffre: any) => console.log('✅ Offre mise à jour:', updatedOffre)),
    catchError((error: any) => {
      console.error('❌ Erreur mise à jour offre:', error);
      throw error;
    })
  );
}

/** 🔹 Supprimer une offre de mission */
deleteOffreMission(id: string): Observable<any> {
  return this.http.delete(`${this.apiUrl}/offresMission/${id}`).pipe(
    tap(() => console.log('✅ Offre supprimée:', id)),
    catchError((error: any) => {
      console.error('❌ Erreur suppression offre:', error);
      throw error;
    })
  );
}

/** 🔹 Récupérer les offres de mission d'un partenaire spécifique */
getOffresMissionByPartenaire(partenaireId: string): Observable<any[]> {
  return this.getOffresMission().pipe(
    map((offres: any[]) => {
      const offresFiltrees = offres.filter((offre: any) => 
        offre.partenaireId === partenaireId
      );
      
      console.log(`🔍 Offres pour partenaire ${partenaireId}:`, offresFiltrees.length, 'offres trouvées');
      return offresFiltrees;
    }),
    catchError((error: any) => {
      console.error('Erreur chargement offres partenaire:', error);
      return of([]);
    })
  );
}

/** 🔹 Générer un ID unique */
private generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/** 🔹 Récupérer le partenaire connecté depuis localStorage */
getCurrentPartenaire(): any {
  try {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role === 'partenaire') {
        return user;
      }
    }
    return null;
  } catch (error) {
    console.error('Erreur récupération partenaire:', error);
    return null;
  }
}

/** 🔹 Récupérer les données détaillées d'un partenaire depuis le JSON */
getPartenaireFromJson(partenaireId: string): Observable<any> {
  return this.http.get<any[]>(`${this.apiUrl}/partenaires`).pipe(
    map((partenaires: any[]) => {
      const partenaire = partenaires.find(p => p.id === partenaireId);
      if (!partenaire) {
        throw new Error('Partenaire non trouvé');
      }
      return partenaire;
    }),
    catchError((error: any) => {
      console.error('Erreur récupération partenaire depuis JSON:', error);
      throw error;
    })
  );
}
}