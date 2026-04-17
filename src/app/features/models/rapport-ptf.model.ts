// src/app/features/models/rapport-ptf.model.ts

export interface RapportPTF {
  id: number;
  titre: string;
  type: RapportType;
  description?: string;
  date: string;
  url: string;
  /** Nouveau format multi-PTF */
  partenairePTFIds?: string[];
  /** Ancien format singulier — conservé pour rétrocompatibilité db.json */
  partenairePTFId?: string | number | null;
  categories?: string[];
  taille?: number;
  statut: RapportStatut;
  metadata?: RapportMetadata;
  createdAt?: string;
  updatedAt?: string;
}

export type RapportType =
  | 'rapport_trimestriel'
  | 'rapport_annuel'
  | 'rapport_impact'
  | 'rapport_special'
  | 'autre';

export type RapportStatut = 'actif' | 'archive' | 'brouillon';

export interface RapportMetadata {
  periode?: string | null;
  zoneGeographique?: string[];
  themes?: string[];
  auteur?: string;
  version?: string;
  nombrePages?: number;
  langue?: string;
}

export interface RapportPTFUploadRequest {
  titre: string;
  type: RapportType;
  description?: string;
  /** IDs des PTF destinataires. Vide = visible par tous */
  partenairePTFIds?: string[];
  categories?: string[];
  metadata?: RapportMetadata;
}

export interface RapportPTFResponse {
  rapports: RapportPTF[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

export interface StatsConsultation {
  totalRapports: number;
  rapportsConsultes: number;
  derniereConsultation: string | null;
  tauxConsultation?: number;
  consultationsParMois?: { [mois: string]: number };
}

export interface ConsultationRapport {
  id: number;
  rapportId: number;
  partenairePTFId: string;
  dateConsultation: string;
  typeConsultation: 'telechargement' | 'preview';
}

export interface StatsGlobales {
  totalRapports: number;
  rapportsParType: { [type: string]: number };
  consultationsTotal: number;
  consultationsParMois: { [mois: string]: number };
  ptfLesPlsActifs: Array<{
    ptfId: string;
    ptfNom: string;
    nombreConsultations: number;
  }>;
}