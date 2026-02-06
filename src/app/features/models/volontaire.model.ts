// src/app/models/volontaire.model.ts

/**
 * Interface principale Volontaire
 * Représente un volontaire dans le système PNVB
 */
export interface Volontaire {
  // === IDENTITÉ OBLIGATOIRE (renseignée lors de l'inscription) ===
  id?: number | string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  nationalite: string;
  sexe: 'M' | 'F';
  
  // === PROFIL À COMPLÉTER (optionnel lors de l'inscription, requis pour candidater) ===
  adresseResidence?: string;
  regionGeographique?: string;
  niveauEtudes?: string;
  domaineEtudes?: string;
  competences?: string[];
  motivation?: string;
  disponibilite?: 'Temps plein' | 'Temps partiel';
  urlCV?: string;
  
  // === PIÈCE D'IDENTITÉ (à compléter dans le profil) ===
  typePiece?: 'CNIB' | 'PASSEPORT';
  numeroPiece?: string;
  urlPieceIdentite?: string; // ✅ Document scanné de la pièce d'identité
  
  // === STATUT PNVB ===
  // Candidat → En attente → Actif | Refusé | Inactif
  statut: 'Candidat' | 'En attente' | 'Actif' | 'Inactif' | 'Refusé';
  
  // === DATES IMPORTANTES ===
  dateInscription: string;
  dateValidation?: string;          // Date de validation par l'admin
  dateDerniereConnexion?: string;
  
  // === GESTION ADMIN ===
  notesInterne?: string;            // Notes privées de l'administration
  projetsAffectes?: number[];       // IDs des projets assignés
  
  // === MÉTADONNÉES ===
  created_at?: string;
  updated_at?: string;
  
  // === LIEN AVEC USER ===
  userId?: number | string;         // Référence vers l'utilisateur connecté
}

/**
 * Interface pour l'inscription initiale d'un volontaire
 * Utilisée lors de la création du compte public
 */
export interface InscriptionVolontaire {
  // Identité obligatoire
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  sexe: 'M' | 'F';
  nationalite: string;
  
  // Compte utilisateur
  motDePasse: string;
  confirmerMotDePasse: string;
  consentementPolitique: boolean;
}

/**
 * Interface pour la complétion du profil
 * Tous les champs sont REQUIS pour atteindre 100% de complétion
 * Utilisée pour la mise à jour du profil après inscription
 */
export interface ProfilVolontaire {
  // Informations de résidence
  adresseResidence: string;
  regionGeographique: string;
  
  // Formation et compétences
  niveauEtudes: string;
  domaineEtudes: string;
  competences: string[];
  motivation: string;
  disponibilite: 'Temps plein' | 'Temps partiel';
  
  // Documents
  urlCV: string;
  
  // ✅ CORRECTION: Pièce d'identité REQUISE dans le profil complet
  typePiece: 'CNIB' | 'PASSEPORT';
  numeroPiece: string;
  urlPieceIdentite: string; // ✅ OBLIGATOIRE (non optionnel)
}

/**
 * Interface pour les statistiques des volontaires
 * Utilisée dans le dashboard admin
 */
export interface VolontaireStats {
  // Compteurs globaux
  total: number;
  candidats: number;
  enAttente: number;
  actifs: number;
  inactifs: number;
  refuses: number;
  
  // Répartitions
  parRegion: { [region: string]: number };
  parDomaine: { [domaine: string]: number };
  parSexe: { [sexe: string]: number };
  parTypePiece: { [typePiece: string]: number };
}

/**
 * Interface pour les filtres de recherche
 */
export interface VolontaireFiltres {
  statut?: Volontaire['statut'];
  region?: string;
  domaine?: string;
  competence?: string;
  typePiece?: 'CNIB' | 'PASSEPORT';
  profilComplet?: boolean;
  dateInscriptionDebut?: string;
  dateInscriptionFin?: string;
}

/**
 * Type pour le statut d'un volontaire
 */
export type VolontaireStatut = 'Candidat' | 'En attente' | 'Actif' | 'Inactif' | 'Refusé';

/**
 * Type pour le type de pièce d'identité
 */
export type TypePiece = 'CNIB' | 'PASSEPORT';

/**
 * Type pour la disponibilité
 */
export type Disponibilite = 'Temps plein' | 'Temps partiel';

/**
 * Interface pour la mise à jour partielle d'un volontaire
 */
export interface VolontaireUpdate extends Partial<Volontaire> {
  id: number | string;
}

/**
 * Interface pour le changement de statut
 */
export interface ChangementStatut {
  volontaireId: number | string;
  ancienStatut: VolontaireStatut;
  nouveauStatut: VolontaireStatut;
  raison?: string;
  date: string;
  adminId?: number | string;
}