// src/app/features/models/rapport.model.ts
export interface TypeRapport {
  id: number;
  code: string;
  label: string;
  frequence: 'trimestriel' | 'semestriel' | 'annuel' | 'fin_mission';
  delaiSoumission: number; // en jours
  template: any; // Structure du template
}

export interface Rapport {
  id: number;
  titre: string;
  description: string;
  typeRapportId: number;
  typeRapport?: TypeRapport;
  partenaireId: number;
  projetId?: number;
  volontaireId?: number;
  missionId?: number;
  statut: 'brouillon' | 'soumis' | 'valide' | 'rejete' | 'en_retard';
  contenu: any; // Données du rapport structurées
  dateCreation: string;
  dateEcheance: string;
  dateSoumission?: string;
  dateValidation?: string;
  validePar?: number;
  commentairesValidation?: string;
  piecesJointes: PieceJointe[];
  notifications: NotificationRapport[];
}

export interface PieceJointe {
  id: number;
  nom: string;
  type: string;
  taille: number;
  url: string;
  dateUpload: string;
}

export interface NotificationRapport {
  id: number;
  type: 'rappel' | 'retard' | 'validation' | 'rejet';
  message: string;
  dateEnvoi: string;
  lue: boolean;
}

export interface RapportStatistiques {
  total: number;
  soumis: number;
  enRetard: number;
  valides: number;
  brouillons: number;
  tauxSoumission: number;
  prochainsEcheances: Rapport[];
  rapportsEnRetard: Rapport[];
}