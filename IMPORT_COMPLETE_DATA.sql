-- ========================================================================
-- SCRIPT D'IMPORTATION COMPLÈTE DES DONNÉES VERS SUPABASE
-- ========================================================================
-- À exécuter dans le SQL Editor de Supabase APRÈS avoir créé les tables

-- 0. NETTOYER LES TABLES EXISTANTES
DELETE FROM affectations;
DELETE FROM candidatures;
DELETE FROM projets;
DELETE FROM volontaires;
DELETE FROM partenaires;
DELETE FROM users;
DELETE FROM admins;

-- Réinitialiser les séquences UUID
-- (Pas nécessaire avec gen_random_uuid())

-- 1. INSÉRER LES ADMINISTRATEURS (password_hash géré par Supabase Auth)
INSERT INTO admins (
  id,
  username,
  email,
  password_hash,
  prenom,
  nom,
  telephone,
  permissions,
  actif,
  date_inscription,
  date_creation,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    'admin',
    'admin@pnvb.gov.bf',
    'managed_by_supabase_auth',
    'Administrateur',
    'PNVB',
    '70123456',
    ARRAY['all'],
    true,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:00:00.000Z',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- 2. INSÉRER LES UTILISATEURS (uniquement les candidats et volontaires)
-- Les admins et partenaires sont dans leurs propres tables
-- Les mots de passe sont gérés par Supabase Auth
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
  updated_at
) VALUES
  (
    gen_random_uuid(),
    'l11',
    'l1@gmail.com',
    'managed_by_supabase_auth',
    'candidat',
    'p1',
    'l1',
    '66156895',
    false,
    '2026-02-18T22:19:54.290Z',
    NULL,
    '2026-03-17T22:38:35.459Z'
  ),
  (
    gen_random_uuid(),
    'leon',
    'leon2026@gmail.com',
    'managed_by_supabase_auth',
    'candidat',
    'Messi',
    'Leonnel',
    '09992212',
    true,
    '2026-01-27T13:59:12.192Z',
    NULL,
    '2026-03-17T22:38:13.144Z'
  ),
  (
    gen_random_uuid(),
    'Pauline',
    'guigmawpaulin@gmail.com',
    'managed_by_supabase_auth',
    'candidat',
    'Pauline',
    'Guigma',
    '64095771',
    true,
    '2026-03-02T14:18:47.624Z',
    NULL,
    CURRENT_TIMESTAMP
  );

-- 2.5. INSÉRER LES VOLONTAIRES (informations détaillées)
INSERT INTO volontaires (
  id,
  user_id,
  nom,
  prenom,
  email,
  telephone,
  date_naissance,
  sexe,
  nationalite,
  statut,
  type_piece,
  numero_piece,
  date_inscription,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'leon2026@gmail.com' LIMIT 1),
    'Leonnel',
    'Messi',
    'leon2026@gmail.com',
    '09992212',
    NULL,
    NULL,
    NULL,
    'Actif',
    NULL,
    NULL,
    '2026-01-27T13:59:12.192Z',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'guigmawpaulin@gmail.com' LIMIT 1),
    'Guigma',
    'Pauline',
    'guigmawpaulin@gmail.com',
    '64095771',
    '2003-01-07',
    'F',
    'Burkinabè',
    'Actif',
    'CNIB',
    '02993855868577577',
    '2026-03-02T14:18:47.624Z',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- 2.6. METTRE À JOUR LES VOLONTAIRE_ID DANS USERS
UPDATE users SET volontaire_id = (SELECT id FROM volontaires WHERE email = 'leon2026@gmail.com' LIMIT 1) WHERE email = 'leon2026@gmail.com';
UPDATE users SET volontaire_id = (SELECT id FROM volontaires WHERE email = 'guigmawpaulin@gmail.com' LIMIT 1) WHERE email = 'guigmawpaulin@gmail.com';

-- 3. INSÉRER LES PARTENAIRES
INSERT INTO partenaires (
  id,
  nom_structure,
  email,
  telephone,
  adresse,
  personne_contact_nom,
  personne_contact_email,
  personne_contact_telephone,
  personne_contact_fonction,
  type_structures,
  domaine_activite,
  site_web,
  description,
  est_active,
  mot_de_passe_temporaire,
  compte_active,
  permissions,
  stats,
  types_principaux,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    'startupEnter',
    'startup@gmail.com',
    '55221133',
    'bobo',
    'luffy',
    'luffy@gmail.com',
    '66332211',
    'charge de mission',
    ARRAY['SecteurPrive', 'PTF']::type_structure_enum[],
    'Éducation',
    '',
    'ils sont dans le domaine de l''informatique.....',
    true,
    'OOLXOU9uFL$0',
    true,
    '{"peutCreerProjets":true,"peutGererVolontaires":true,"peutVoirStatistiques":true,"peutVoirRapports":true,"accesZonePTF":false}',
    '{"totalProjets":0,"projetsActifs":0,"projetsTermines":0,"projetsEnAttente":0,"volontairesAffectes":0}',
    ARRAY['SecteurPrive', 'PTF']::type_structure_enum[],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'sahelinfo',
    'sahelinfo@gmail.com',
    '25334400',
    'ouaga',
    'messi',
    'messi@gmail.com',
    '65443322',
    'DG',
    ARRAY['InstitutionAcademique']::type_structure_enum[],
    'Éducation',
    '',
    'nous sommes une structure...................',
    true,
    'i&BSZMw&Bb4o',
    true,
    '{"peutCreerProjets":true,"peutGererVolontaires":true,"peutVoirStatistiques":true,"peutVoirRapports":true,"accesZonePTF":false}',
    '{"totalProjets":0,"projetsActifs":0,"projetsTermines":0,"projetsEnAttente":0,"volontairesAffectes":0}',
    ARRAY['InstitutionAcademique']::type_structure_enum[],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'ptf1',
    'ptf1@gmail.com',
    '25660000',
    'ouagadougou',
    'tom',
    'tom@gmail.com',
    '66778800',
    'charge de mission',
    ARRAY['PTF']::type_structure_enum[],
    'Développement Communautaire',
    '',
    'ils sont une entreprise ................................................',
    true,
    'Vwe0oBJmWSz3',
    true,
    '{"peutCreerProjets":true,"peutGererVolontaires":true,"peutVoirStatistiques":true,"peutVoirRapports":true,"accesZonePTF":false}',
    '{"totalProjets":0,"projetsActifs":0,"projetsTermines":0,"projetsEnAttente":0,"volontairesAffectes":0}',
    ARRAY['PTF']::type_structure_enum[],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- 4. INSÉRER QUELQUES PROJETS (les 3 premiers)
INSERT INTO projets (
  id,
  titre,
  partenaire_id,
  description_courte,
  description_longue,
  domaine_activite,
  competences_requises,
  type_mission,
  region_affectation,
  ville_commune,
  nombre_volontaires_requis,
  nombre_volontaires_actuels,
  avantages_volontaire,
  date_debut,
  date_fin,
  date_limite_candidature,
  date_publication,
  statut_projet,
  conditions_particulieres,
  contact_responsable,
  email_contact,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    'Alphabétisation des femmes en milieu rural',
    (SELECT id FROM partenaires WHERE nom_structure = 'startupEnter' LIMIT 1),
    'Programme d''alphabétisation pour 500 femmes rurales du Centre-Nord',
    'Ce projet vise à réduire l''analphabétisme chez les femmes rurales de la région du Centre-Nord. Les volontaires animeront des sessions d''alphabétisation fonctionnelle en mooré et en français, organiseront des activités d''éducation civique et de santé.',
    'Éducation',
    ARRAY['Animation de groupe', 'Pédagogie', 'Connaissance des langues locales', 'Alphabétisation']::TEXT[],
    'Education',
    'Centre-Nord',
    'Kaya',
    10,
    1,
    'Formation en alphabétisation, per diem mensuel de 50 000 FCFA, prise en charge transport, attestation d''engagement',
    '2026-03-01',
    '2026-08-31',
    '2026-02-20',
    '2026-01-15T10:00:00.000Z',
    'cloture',
    'Maîtrise du mooré obligatoire, disponibilité pour déplacements en brousse, sens de l''écoute et patience',
    'OUEDRAOGO Marie',
    'marie.ouedraogo@alphabetisation.bf',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'Vaccination et nutrition infantile',
    (SELECT id FROM partenaires WHERE nom_structure = 'startupEnter' LIMIT 1),
    'Campagne vaccination et nutrition pour enfants dans les Cascades',
    'Campagne de vaccination et de sensibilisation nutritionnelle pour les enfants de 0 à 5 ans dans les Cascades. Les volontaires appuieront les agents de santé dans l''organisation de journées de vaccination.',
    'Santé',
    ARRAY['Notions en santé publique', 'Animation communautaire', 'Communication', 'Gestion de données'],
    'Sante',
    'Cascades',
    'Banfora',
    12,
    0,
    'Formation en santé communautaire, vaccination gratuite, per diem 55 000 FCFA/mois, transport pris en charge',
    '2026-04-01',
    '2026-09-30',
    '2026-03-10',
    '2026-01-20T14:00:00.000Z',
    'cloture',
    'Vaccination à jour obligatoire, disponibilité weekends, aisance relationnelle avec les mères',
    'Dr TRAORE Salif',
    'salif.traore@sante.gov.bf',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'Construction de latrines familiales',
    (SELECT id FROM partenaires WHERE nom_structure = 'ptf1' LIMIT 1),
    'Construction de 200 latrines et sensibilisation hygiène en Boucle du Mouhoun',
    'Projet d''amélioration de l''assainissement dans 30 villages de la Boucle du Mouhoun par la construction de 200 latrines familiales.',
    'Développement Communautaire',
    ARRAY['Notions en génie civil', 'Formation d''adultes', 'Mobilisation communautaire', 'Gestion de projet'],
    'Autre',
    'Boucle du Mouhoun',
    'Dédougou',
    8,
    0,
    'Formation en WASH, équipements de sécurité, per diem 60 000 FCFA/mois, logement fourni, certificat',
    '2026-06-01',
    '2026-12-31',
    '2026-05-15',
    '2026-02-10T08:00:00.000Z',
    'ouvert',
    'Permis moto souhaité, capacité à vivre en zone rurale, esprit pratique, leadership',
    'KONATE Aminata',
    'aminata.konate@wash.bf',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- ========================================================================
-- VÉRIFICATION
-- ========================================================================

-- Compter les utilisateurs par rôle
SELECT 'users' as table_name, role, COUNT(*) as count FROM users GROUP BY role
UNION ALL
SELECT 'admins' as table_name, 'admin' as role, COUNT(*) as count FROM admins
UNION ALL
SELECT 'partenaires' as table_name, 'partenaire' as role, COUNT(*) as count FROM partenaires;

-- Vérifier les projets
SELECT COUNT(*) as total_projets FROM projets;

-- Afficher les comptes de test
SELECT 'ADMIN' as type, email, 'admin@pnvb.gov.bf' as password FROM admins WHERE email = 'admin@pnvb.gov.bf'
UNION ALL
SELECT 'CANDIDAT' as type, email, 'l12026' as password FROM users WHERE role = 'candidat' AND email = 'l1@gmail.com'
UNION ALL
SELECT 'VOLONTAIRE 1' as type, email, 'leon2026' as password FROM users WHERE role = 'candidat' AND email = 'leon2026@gmail.com'
UNION ALL
SELECT 'VOLONTAIRE 2' as type, email, '123456' as password FROM users WHERE role = 'candidat' AND email = 'guigmawpaulin@gmail.com'
UNION ALL
SELECT 'PARTENAIRE 1' as type, email, 'OOLXOU9uFL$0' as password FROM partenaires WHERE email = 'startup@gmail.com'
UNION ALL
SELECT 'PARTENAIRE 2' as type, email, 'i&BSZMw&Bb4o' as password FROM partenaires WHERE email = 'sahelinfo@gmail.com'
UNION ALL
SELECT 'PARTENAIRE 3' as type, email, 'Vwe0oBJmWSz3' as password FROM partenaires WHERE email = 'ptf1@gmail.com';
