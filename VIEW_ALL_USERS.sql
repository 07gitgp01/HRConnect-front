-- ========================================================================
-- AFFICHER TOUS LES UTILISATEURS DE LA BASE DE DONNÉES
-- ========================================================================

-- Afficher tous les administrateurs
SELECT
  'admin' as type_utilisateur,
  id,
  username,
  email,
  prenom,
  nom,
  telephone,
  actif,
  date_inscription,
  created_at
FROM admins
ORDER BY created_at DESC;

-- Afficher tous les utilisateurs (candidats et volontaires)
SELECT
  'user' as type_utilisateur,
  id,
  username,
  email,
  role,
  prenom,
  nom,
  telephone,
  profil_complete,
  date_inscription,
  created_at
FROM users
ORDER BY created_at DESC;

-- Afficher tous les partenaires
SELECT
  'partenaire' as type_utilisateur,
  id,
  nom_structure,
  email,
  telephone,
  personne_contact_nom,
  personne_contact_email,
  est_active,
  compte_active,
  cree_le as date_inscription,
  created_at
FROM partenaires
ORDER BY created_at DESC;

-- Afficher tous les volontaires
SELECT
  'volontaire' as type_utilisateur,
  id,
  user_id,
  prenom,
  nom,
  email,
  telephone,
  date_naissance,
  sexe,
  nationalite,
  statut,
  date_inscription,
  created_at
FROM volontaires
ORDER BY created_at DESC;

-- Vue consolidée de tous les utilisateurs
SELECT
  'admin'::text as type_utilisateur,
  id::text,
  username::text,
  email::text,
  prenom::text,
  nom::text,
  telephone::text,
  CASE WHEN actif = true THEN 'actif'::text ELSE 'inactif'::text END as statut,
  date_inscription::text,
  created_at::text
FROM admins

UNION ALL

SELECT
  'user'::text as type_utilisateur,
  id::text,
  username::text,
  email::text,
  prenom::text,
  nom::text,
  telephone::text,
  CASE WHEN profil_complete = true THEN 'complet'::text ELSE 'incomplet'::text END as statut,
  date_inscription::text,
  created_at::text
FROM users

UNION ALL

SELECT
  'partenaire'::text as type_utilisateur,
  id::text,
  nom_structure::text as username,
  email::text,
  personne_contact_nom::text as prenom,
  personne_contact_email::text as nom,
  telephone::text,
  CASE
    WHEN est_active = true AND compte_active = true THEN 'actif'::text
    ELSE 'inactif'::text
  END::text as statut,
  cree_le::text as date_inscription,
  created_at::text
FROM partenaires

UNION ALL

SELECT
  'volontaire'::text as type_utilisateur,
  id::text,
  nom::text as username,
  email::text,
  prenom::text,
  nom::text,
  telephone::text,
  statut::text,
  date_inscription::text,
  created_at::text
FROM volontaires

ORDER BY created_at DESC;

-- Statistiques globales
SELECT
  'Statistiques' as type_utilisateur,
  'Total' as username,
  COUNT(*) as email,
  '' as prenom,
  '' as nom,
  '' as telephone,
  '' as statut,
  '' as date_inscription,
  '' as created_at
FROM (
  SELECT COUNT(*) as total FROM admins
  UNION ALL
  SELECT COUNT(*) as total FROM users
  UNION ALL
  SELECT COUNT(*) as total FROM partenaires
  UNION ALL
  SELECT COUNT(*) as total FROM volontaires
) as counts;
