-- ========================================================================
-- RÉCUPÉRER UN UTILISATEUR AVEC SON RÔLE DIRECTEMENT
-- ========================================================================

-- Méthode 1: Recherche avec UNION et rôle explicite
SELECT 
  id,
  username,
  email,
  prenom,
  nom,
  telephone,
  'admin' as role,
  actif as statut,
  date_inscription,
  created_at
FROM admins 
WHERE email = 'votre_email@example.com'

UNION ALL

SELECT 
  id,
  username,
  email,
  prenom,
  nom,
  telephone,
  role,
  profil_complete as statut,
  date_inscription,
  created_at
FROM users 
WHERE email = 'votre_email@example.com'

UNION ALL

SELECT 
  id,
  nom_structure as username,
  email,
  personne_contact_nom as prenom,
  personne_contact_email as nom,
  telephone,
  'partenaire' as role,
  CASE 
    WHEN est_active = true AND compte_active = true THEN 'actif'
    ELSE 'inactif'
  END as statut,
  cree_le as date_inscription,
  created_at
FROM partenaires 
WHERE email = 'votre_email@example.com';

-- Méthode 2: Recherche avec CASE pour déterminer la table
SELECT 
  COALESCE(admins.id, users.id, partenaires.id, volontaires.id) as id,
  COALESCE(admins.username, users.username, partenaires.nom_structure, volontaires.nom) as username,
  COALESCE(admins.email, users.email, partenaires.email, volontaires.email) as email,
  COALESCE(admins.prenom, users.prenom, partenaires.personne_contact_nom, volontaires.prenom) as prenom,
  COALESCE(admins.nom, users.nom, partenaires.personne_contact_email, volontaires.nom) as nom,
  COALESCE(admins.telephone, users.telephone, partenaires.telephone, volontaires.telephone) as telephone,
  CASE 
    WHEN admins.id IS NOT NULL THEN 'admin'
    WHEN users.id IS NOT NULL THEN users.role
    WHEN partenaires.id IS NOT NULL THEN 'partenaire'
    WHEN volontaires.id IS NOT NULL THEN 'candidat'
  END as role,
  CASE 
    WHEN admins.id IS NOT NULL THEN admins.actif
    WHEN users.id IS NOT NULL THEN users.profil_complete
    WHEN partenaires.id IS NOT NULL THEN (partenaires.est_active AND partenaires.compte_active)
    WHEN volontaires.id IS NOT NULL THEN true
  END as statut,
  COALESCE(admins.date_inscription, users.date_inscription, partenaires.cree_le, volontaires.date_inscription) as date_inscription,
  COALESCE(admins.created_at, users.created_at, partenaires.created_at, volontaires.created_at) as created_at
FROM 
  (SELECT email FROM admins WHERE email = 'votre_email@example.com'
   UNION SELECT email FROM users WHERE email = 'votre_email@example.com'
   UNION SELECT email FROM partenaires WHERE email = 'votre_email@example.com'
   UNION SELECT email FROM volontaires WHERE email = 'votre_email@example.com'
  ) search_emails
LEFT JOIN admins ON admins.email = search_emails.email
LEFT JOIN users ON users.email = search_emails.email  
LEFT JOIN partenaires ON partenaires.email = search_emails.email
LEFT JOIN volontaires ON volontaires.email = search_emails.email
WHERE COALESCE(admins.id, users.id, partenaires.id, volontaires.id) IS NOT NULL;
