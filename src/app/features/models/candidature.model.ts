import { Volontaire } from './volontaire.model';

export interface Candidature {
  id?: number;
  
  // Références
  volontaireId: number | string;
  projectId: number;
  
  // Informations de base (du volontaire)
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  typePiece: 'CNIB' | 'PASSEPORT'; // Nouveau champ
  numeroPiece: string; // Nouveau champ
  
  // Candidature spécifique
  poste_vise: string;
  lettre_motivation?: string;
  cv_url?: string;
  
  // Statut
  statut: 'en_attente' | 'entretien' | 'refusee' | 'acceptee';
  
  // Dates
  cree_le?: string;
  mis_a_jour_le?: string;
  
  // Informations complémentaires
  competences?: string[] | string;
  disponibilite?: string;
  notes_interne?: string;
  date_entretien?: string;
  niveau_experience?: 'debutant' | 'intermediaire' | 'expert';
  
  // Champs de liaison
  volontaire?: Volontaire;
}

export interface CandidatureStats {
  total: number;
  en_attente: number;
  entretien: number;
  acceptee: number;
  refusee: number;
  par_projet: { [projectId: number]: number };
  par_statut: { [statut: string]: number };
  par_type_piece: { [typePiece: string]: number };
}

export interface CandidatureFiltres {
  searchTerm: string;
  statut: string;
  projectId: number | null;
  competence: string;
  disponibilite: string;
  niveau_experience: string;
  region?: string;
  typePiece?: string;
}