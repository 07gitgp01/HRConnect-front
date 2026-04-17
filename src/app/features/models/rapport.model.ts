// src/app/features/models/rapport.model.ts

export type FrequenceRapport = 'trimestriel' | 'semestriel' | 'annuel' | 'fin_mission';

export type StatutRapport = 'brouillon' | 'soumis' | 'valide' | 'rejete' | 'en_retard';

export interface TypeRapport {
  id:              number;
  code:            string;
  label:           string;
  frequence:       FrequenceRapport;
  delaiSoumission: number;
  template?:       any;
}

export interface PieceJointe {
  id:           number;
  nom:          string;
  url:          string;
  type:         string;
  taille:       number;
  dateUpload:   string;
}

export interface Notification {
  id:       number;
  message:  string;
  lue:      boolean;
  date:     string;
}

export interface Rapport {
  id:              number | string;
  typeRapportId:   number;
  titre:           string;
  description?:    string;
  partenaireId:    number | string;
  projetId?:       number | string;
  missionId?:      number | string;
  contenu?:        any;
  statut:          StatutRapport;
  dateCreation:    string;
  dateSoumission?: string;
  dateEcheance:    string;
  piecesJointes?:  PieceJointe[];
  notifications?:  Notification[];
  created_at?:     string;
  updated_at?:     string;
}

export interface RapportStatistiques {
  total:              number;
  soumis:             number;
  enRetard:           number;
  valides:            number;
  brouillons:         number;
  tauxSoumission:     number;
  prochainsEcheances: Rapport[];
  rapportsEnRetard:   Rapport[];
}