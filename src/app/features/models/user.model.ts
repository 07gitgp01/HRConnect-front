import { Partenaire } from "./partenaire.model";

// src/app/models/user.model.ts
export interface User {
  id?: number | string;
  username: string;
  email: string;
  password: string;
  role: 'candidat'; // ✅ SEULEMENT 'candidat' pour l'inscription publique
  
  // Champs de liaison avec le profil volontaire
  volontaireId?: number | string;
  profilComplete?: boolean;
  
  // Informations de profil supplémentaires
  prenom?: string;
  nom?: string;
  telephone?: string;
  avatar?: string;
  date_inscription?: string;
}

// Les admin et partenaires sont créés différemment
export interface AdminUser {
  id?: number | string;
  username: string;
  email: string;
  password: string;
  role: 'admin';
  // Champs spécifiques admin
}

export type AuthenticatedUser = User | Partenaire | AdminUser | null;