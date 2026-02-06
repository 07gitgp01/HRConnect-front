import { Partenaire } from "./partenaire.model";
import { Volontaire } from "./volontaire.model";

export interface RapportEvaluation {
  // === IDENTIFICATION ===
  id?: number | string;
  volontaireId: number | string;
  partenaireId: number | string;
  
  // === PÉRIODE ET SUIVI ===
  periode: string;
  dateSoumission: string;
  dateModification?: string;
  
  // === ÉVALUATION ===
  evaluationGlobale: number; // 0-10
  commentaires: string;
  
  // === CRITÈRES D'ÉVALUATION DÉTAILLÉS ===
  criteres?: {
    integration: number; // 0-5
    competences: number; // 0-5
    initiative: number; // 0-5
    collaboration: number; // 0-5
    respectEngagement: number; // 0-5
  };
  
  // === DOCUMENTATION ===
  urlDocumentAnnexe?: string;
  nomDocumentAnnexe?: string;
  
  // === STATUT ET VALIDATION ===
  statut: 'Brouillon' | 'Soumis' | 'En attente' | 'Lu par PNVB' | 'Validé' | 'Rejeté';
  feedbackPNVB?: string;
  dateValidation?: string;
  validePar?: string;
  
  // === DONNÉES DE JOINTURE (pour l'affichage) ===
  volontaire?: Volontaire;
  partenaire?: Partenaire;
  
  // === MÉTADONNÉES ===
  created_at?: string;
  updated_at?: string;
}

export interface RapportAvecDetails extends RapportEvaluation {
  volontaireNomComplet: string;
  partenaireNom: string;
  missionVolontaire?: string;
  dureeMission?: string;
}

export interface RapportStats {
  total: number;
  soumis: number;
  valide: number;
  brouillon: number;
  rejete: number;
  enAttente: number;
  moyenneEvaluation: number;
  parStatut: { [statut: string]: number };
  parPeriode: { [periode: string]: number };
  parPartenaire: { [partenaireId: string]: number };
}

export interface NouveauRapport {
  volontaireId: number | string;
  periode: string;
  evaluationGlobale: number;
  criteres: {
    integration: number;
    competences: number;
    initiative: number;
    collaboration: number;
    respectEngagement: number;
  };
  commentaires: string;
  urlDocumentAnnexe?: string;
  statut: 'Brouillon' | 'Soumis';
}

export interface FiltreRapport {
  periode?: string;
  statut?: string;
  volontaireId?: number | string;
  dateDebut?: string;
  dateFin?: string;
  minEvaluation?: number;
}