// src/app/features/admin/models/rapport-ptf.model.ts

/**
 * Interface principale pour un rapport PTF
 */
export interface RapportPTF {
  id: number;
  titre: string;
  type: RapportType;
  description?: string;
  date: string; // ISO date string
  url: string;
  partenairePTFId?: string | number; // Peut être undefined = "tous PTF"
  categories?: string[];
  taille?: number; // Taille en octets
  statut: RapportStatut;
  metadata?: RapportMetadata;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Types de rapports disponibles
 */
export type RapportType = 
  | 'rapport_trimestriel'
  | 'rapport_annuel'
  | 'rapport_impact'
  | 'rapport_special'
  | 'autre';

/**
 * Statuts possibles d'un rapport
 */
export type RapportStatut = 
  | 'actif'
  | 'archive'
  | 'brouillon';

/**
 * Métadonnées optionnelles d'un rapport
 */
export interface RapportMetadata {
  periode?: string; // Ex: "Q1 2024", "Année 2023"
  zoneGeographique?: string[]; // Ex: ["Dakar", "Thiès"]
  themes?: string[]; // Ex: ["Éducation", "Santé"]
  auteur?: string;
  version?: string;
  nombrePages?: number;
  langue?: string;
}

/**
 * Requête pour uploader un nouveau rapport
 */
export interface RapportPTFUploadRequest {
  titre: string;
  type: RapportType;
  description?: string;
  partenairePTFId?: string | number;
  categories?: string[];
  metadata?: RapportMetadata;
}

/**
 * Réponse de l'API pour la liste des rapports
 */
export interface RapportPTFResponse {
  rapports: RapportPTF[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paramètres de recherche et filtrage
 */
export interface RapportPTFSearchParams {
  page?: number;
  limit?: number;
  type?: RapportType;
  categorie?: string;
  periode?: string;
  search?: string;
  sortBy?: 'titre' | 'date' | 'type' | 'taille';
  sortOrder?: 'asc' | 'desc';
  partenairePTFId?: string | number;
  statut?: RapportStatut;
}

/**
 * Statistiques de consultation pour un PTF
 */
export interface StatsConsultation {
  totalRapports: number;
  rapportsConsultes: number;
  derniereConsultation: string | null;
  tauxConsultation?: number;
  consultationsParMois?: { [mois: string]: number };
}

/**
 * Enregistrement d'une consultation
 */
export interface ConsultationRapport {
  id: number;
  rapportId: number;
  partenairePTFId: number;
  dateConsultation: string;
  typeConsultation: 'telechargement' | 'preview';
}

/**
 * Statistiques globales (pour admin)
 */
export interface StatsGlobales {
  totalRapports: number;
  rapportsParType: { [type: string]: number };
  consultationsTotal: number;
  consultationsParMois: { [mois: string]: number };
  ptfLesPlsActifs: Array<{
    ptfId: number;
    ptfNom: string;
    nombreConsultations: number;
  }>;
}