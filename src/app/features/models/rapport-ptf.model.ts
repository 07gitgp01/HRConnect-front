// src/app/features/admin/models/rapport-ptf.model.ts
export interface RapportPTF {
  id: number;
  titre: string;
  type: string;
  description?: string;
  date: string;
  url: string;
  partenairePTFId?: string | number;
  categories?: string[];
  taille?: number;
  statut: string;
  metadata?: {
    periode?: string;
    zoneGeographique?: string[];
    themes?: string[];
  };
}

export interface RapportPTFUploadRequest {
  titre: string;
  type: string;
  description?: string;
  partenairePTFId?: string | number;
  categories?: string[];
  metadata?: {
    periode?: string;
    zoneGeographique?: string[];
    themes?: string[];
  };
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
  type?: string;
  categorie?: string;
  periode?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}