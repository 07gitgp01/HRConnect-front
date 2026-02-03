export interface Volontaire {
  // === IDENTITÉ OBLIGATOIRE ===
  id?: number | string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  nationalite: string;
  sexe: 'M' | 'F';
  
  // === PROFIL À COMPLÉTER ===
  adresseResidence?: string;
  regionGeographique?: string;
  niveauEtudes?: string;
  domaineEtudes?: string;
  competences?: string[];
  motivation?: string;
  disponibilite?: 'Temps plein' | 'Temps partiel';
  urlCV?: string;
  
  // === NOUVEAUX CHAMPS TYPE DE PIÈCE (dans le profil à compléter) ===
  typePiece?: 'CNIB' | 'PASSEPORT'; // Optionnel lors de l'inscription
  numeroPiece?: string; // Optionnel lors de l'inscription
  urlPieceIdentite?: string; // ✅ AJOUTÉ

  
  // === STATUT PNVB ===
  statut: 'Candidat' | 'En attente' | 'Actif' | 'Inactif' | 'Refusé';
  
  // === DATES IMPORTANTES ===
  dateInscription: string;
  dateValidation?: string;
  dateDerniereConnexion?: string;
  
  // === GESTION ADMIN ===
  notesInterne?: string;
  projetsAffectes?: number[];
  created_at?: string;
  updated_at?: string;
  
  // === LIEN AVEC USER ===
  userId?: number | string;
}

// Interface pour l'inscription initiale
export interface InscriptionVolontaire {
  // Identité obligatoire
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  sexe: 'M' | 'F';
  nationalite: string;
  
  // Compte
  motDePasse: string;
  confirmerMotDePasse: string;
  consentementPolitique: boolean;
}

// Interface pour la mise à jour du profil
export interface ProfilVolontaire {
  adresseResidence: string;
  regionGeographique: string;
  niveauEtudes: string;
  domaineEtudes: string;
  competences: string[];
  motivation: string;
  disponibilite: 'Temps plein' | 'Temps partiel';
  urlCV: string;
  
  // NOUVEAUX CHAMPS dans le profil à compléter
  typePiece: 'CNIB' | 'PASSEPORT';
  numeroPiece: string;
  urlPieceIdentite?: string; // ✅ AJOUTÉ

}

// Interface pour les statistiques
export interface VolontaireStats {
  total: number;
  candidats: number;
  enAttente: number;
  actifs: number;
  inactifs: number;
  refuses: number;
  parRegion: { [region: string]: number };
  parDomaine: { [domaine: string]: number };
  parSexe: { [sexe: string]: number };
  parTypePiece: { [typePiece: string]: number };
}