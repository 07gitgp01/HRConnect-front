// src/app/models/user.model.ts

import { Partenaire } from "./partenaire.model";

/**
 * Interface User - Utilisateur de base (candidat/volontaire)
 */
export interface User {
  id?: number | string;
  username: string;
  email: string;
  password: string;
  
  // ✅ CORRECTION: 'candidat' OU 'volontaire' selon l'évolution du profil
  role: 'candidat' | 'volontaire';
  
  // ✅ NOUVEAU: Champ actif pour gérer l'état du compte
  actif?: boolean;  // true par défaut à la création
  
  // Champs de liaison avec le profil volontaire
  volontaireId?: number | string;
  profilComplete?: boolean;
  
  // Informations personnelles (FIXES - saisies à l'inscription)
  prenom?: string;
  nom?: string;
  telephone?: string;
  dateNaissance?: string;
  nationalite?: string;
  sexe?: 'M' | 'F';
  
  // ✅ Pièce d'identité (FIXES - saisies à l'inscription)
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
  username: string;
  email: string;
  password: string;
  role: 'admin';
  
  // ✅ NOUVEAU: Champ actif pour les admins aussi
  actif?: boolean;
  
  // Champs spécifiques admin
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
  username: string;
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