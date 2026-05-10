import { Partenaire } from "./partenaire.model";

/**
 * Interface User - Utilisateur de base (candidat/volontaire)
 */
export interface User {
  id?: number | string;
  username?: string;                         // ✅ rendu optionnel
  email: string;
  password: string;

  role: 'candidat' | 'volontaire';

  actif?: boolean;

  volontaireId?: number | string;
  profilComplete?: boolean;

  // Informations personnelles
  prenom?: string;
  nom?: string;
  telephone?: string;
  dateNaissance?: string;
  nationalite?: string;
  sexe?: 'M' | 'F';

  // Pièce d'identité
  typePiece?: 'CNIB' | 'PASSEPORT';
  numeroPiece?: string;

  // Métadonnées
  avatar?: string;
  date_inscription?: string;
}

/**
 * Interface AdminUser - Administrateur système
 */
export interface AdminUser {
  id?: number | string;
  username?: string;                         // ✅ rendu optionnel
  email: string;
  password: string;
  role: 'admin';

  actif?: boolean;

  nom?: string;
  prenom?: string;
  telephone?: string;
  avatar?: string;
  date_inscription?: string;
  derniere_connexion?: string;
  permissions?: string[];
}

/**
 * Type union pour tous les utilisateurs authentifiés
 */
export type AuthenticatedUser = User | Partenaire | AdminUser | null;

/**
 * Type guard pour vérifier si un utilisateur est un User (candidat/volontaire)
 */
export function isUser(user: AuthenticatedUser): user is User {
  return user !== null && ('role' in user) && 
         (user.role === 'candidat' || user.role === 'volontaire');
}

/**
 * Type guard pour vérifier si un utilisateur est un Admin
 */
export function isAdmin(user: AuthenticatedUser): user is AdminUser {
  return user !== null && ('role' in user) && user.role === 'admin';
}

/**
 * Type guard pour vérifier si un utilisateur est un Partenaire
 */
export function isPartenaire(user: AuthenticatedUser): user is Partenaire {
  return user !== null && ('typeStructures' in user);
}

/**
 * Interface pour la réponse de login
 */
export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
  expiresIn?: number;
}

/**
 * Interface pour l'inscription d'un candidat
 */
export interface RegisterUserData {
  username?: string;                         // ✅ rendu optionnel
  email: string;
  password: string;
  confirmerMotDePasse: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
  dateNaissance?: string;
  sexe?: 'M' | 'F';
  nationalite?: string;

  typePiece: 'CNIB' | 'PASSEPORT';
  numeroPiece: string;

  consentementPolitique: boolean;
}