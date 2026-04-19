-- ========================================================================
-- SCRIPT D'IMPORTATION DES DONNÉES EXISTANTES VERS SUPABASE
-- ========================================================================
-- À exécuter dans le SQL Editor de Supabase APRÈS avoir créé les tables

-- 1. INSÉRER LES UTILISATEURS EXISTANTS (users)
-- Note: Les mots de passe sont en clair, Supabase va les hasher automatiquement

INSERT INTO users (
  id, 
  username, 
  email, 
  password_hash, 
  role, 
  prenom, 
  nom, 
  telephone, 
  profil_complete, 
  date_inscription, 
  volontaire_id, 
  updated_at, 
  actif,
  date_naissance,
  sexe,
  nationalite,
  type_piece,
  numero_piece
) VALUES 
  (
    gen_random_uuid(), -- ID UUID généré
    'leon',
    'leon2026@gmail.com',
    'leon2026', -- Supabase va hasher ce mot de passe
    'volontaire',
    'Messi',
    'Leonnel',
    '09992212',
    true,
    '2026-01-27T13:59:12.192Z',
    (SELECT gen_random_uuid()), -- Générer un UUID pour volontaire_id
    '2026-03-17T22:38:13.144Z',
    true,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    gen_random_uuid(),
    'l11',
    'l1@gmail.com',
    'l12026',
    'candidat',
    'p1',
    'l1',
    '66156895',
    false,
    '2026-02-18T22:19:54.290Z',
    (SELECT gen_random_uuid()),
    '2026-03-17T22:38:35.459Z',
    true,
    '2000-03-29',
    'M',
    'Burkinabè',
    'PASSEPORT',
    'AB2345678'
  ),
  (
    gen_random_uuid(),
    'Pauline',
    'guigmawpaulin@gmail.com',
    '123456',
    'volontaire',
    'Pauline',
    'Guigma',
    '64095771',
    true,
    '2026-03-02T14:18:47.624Z',
    (SELECT gen_random_uuid()),
    NULL,
    true,
    '2003-01-07',
    'F',
    'Burkinabè',
    'CNIB',
    '02993855868577577'
  );

-- 2. INSÉRER LES ADMINISTRATEURS S'IL Y EN A
-- (Vérifiez d'abord si vous avez des admins dans votre bd.json)

-- 3. INSÉRER LES PARTENAIRES S'IL Y EN A
-- (Vérifiez d'abord si vous avez des partenaires dans votre bd.json)

-- 4. INSÉRER LES PROJETS
-- Note: Convertir les partenaireId en UUID si nécessaire

-- 5. CRÉER LES COMPTES SUPABASE AUTH
-- Supabase va créer automatiquement les comptes d'authentification
-- lorsque les utilisateurs tenteront de se connecter

-- ========================================================================
-- VÉRIFICATION
-- ========================================================================

-- Vérifier les utilisateurs insérés
SELECT * FROM users;

-- Compter les utilisateurs par rôle
SELECT role, COUNT(*) as count FROM users GROUP BY role;
