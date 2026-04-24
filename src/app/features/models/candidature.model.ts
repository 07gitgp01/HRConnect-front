import { Volontaire } from './volontaire.model';

export interface Candidature {
  // ✅ FIX : string | number pour supporter les IDs hex de json-server ("7f1a")
  id?: number | string;

  // Références
  volontaireId: number | string;
  projectId: number | string;     // ✅ FIX : était "number" → bloquait les IDs hex

  // Informations de base (du volontaire)
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  typePiece: 'CNIB' | 'PASSEPORT';
  numeroPiece: string;

  // Candidature spécifique
  poste_vise: string;
  lettreMotivation?: string;
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
  // ✅ FIX : clé string pour supporter les IDs hex
  par_projet: { [projectId: string]: number };
  par_statut: { [statut: string]: number };
  par_type_piece: { [typePiece: string]: number };
}

export interface CandidatureFiltres {
  searchTerm: string;
  statut: string;
  // ✅ FIX : string | number | null
  projectId: number | string | null;
  competence: string;
  disponibilite: string;
  niveau_experience: string;
  region?: string;
  typePiece?: string;
}