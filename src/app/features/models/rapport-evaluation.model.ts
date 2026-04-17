import { Partenaire } from "./partenaire.model";
import { Project } from "./projects.model";

// ============================================================
// MODÈLE RAPPORT D'ÉVALUATION — centré sur le projet
// (le champ volontaireId a été supprimé)
// ============================================================

export interface RapportEvaluation {
  // === IDENTIFICATION ===
  id?: number | string;
  partenaireId: number | string;

  // === PROJET / MISSION ASSOCIÉ ===
  projetId: number | string;        // Obligatoire : rapport lié à un projet
  missionNom?: string;              // Dénormalisé pour l'affichage admin

  // === PÉRIODE ET SUIVI ===
  periode: string;
  dateSoumission: string;
  dateModification?: string;

  // === ÉVALUATION ===
  evaluationGlobale: number;        // 0-10
  commentaires: string;

  // === CRITÈRES DÉTAILLÉS ===
  criteres?: {
    integration:       number;      // 0-5
    competences:       number;      // 0-5
    initiative:        number;      // 0-5
    collaboration:     number;      // 0-5
    respectEngagement: number;      // 0-5
  };

  // === DOCUMENTATION ===
  urlDocumentAnnexe?: string;
  nomDocumentAnnexe?: string;

  // === STATUT ET VALIDATION ===
  statut: 'Brouillon' | 'Soumis' | 'En attente' | 'Lu par PNVB' | 'Validé' | 'Rejeté';
  feedbackPNVB?: string;
  dateValidation?: string;
  validePar?: string;

  // === DONNÉES DE JOINTURE (affichage) ===
  partenaire?: Partenaire;
  projet?: Project;

  // === MÉTADONNÉES ===
  created_at?: string;
  updated_at?: string;
}

// ---- Vue enrichie pour les listes -------------------------
export interface RapportAvecDetails extends RapportEvaluation {
  partenaireNom:     string;
  missionVolontaire?: string;  // alias de missionNom pour rétro-compatibilité
  dureeMission?:     string;
}

// ---- Statistiques -----------------------------------------
export interface RapportStats {
  total:             number;
  soumis:            number;
  valide:            number;
  brouillon:         number;
  rejete:            number;
  enAttente:         number;
  moyenneEvaluation: number;
  parStatut:         { [statut: string]: number };
  parPeriode:        { [periode: string]: number };
  parPartenaire:     { [partenaireId: string]: number };
}

// ---- DTO création -----------------------------------------
export interface NouveauRapport {
  partenaireId:  number | string;
  projetId:      number | string;   // Obligatoire
  missionNom?:   string;            // Renseigné automatiquement par le composant
  periode:       string;
  evaluationGlobale: number;
  criteres: {
    integration:       number;
    competences:       number;
    initiative:        number;
    collaboration:     number;
    respectEngagement: number;
  };
  commentaires:       string;
  urlDocumentAnnexe?: string;
  statut: 'Brouillon' | 'Soumis';
}

// ---- Filtres -----------------------------------------------
export interface FiltreRapport {
  periode?:       string;
  statut?:        string;
  projetId?:      number | string;
  partenaireId?:  number | string;
  dateDebut?:     string;
  dateFin?:       string;
  minEvaluation?: number;
}