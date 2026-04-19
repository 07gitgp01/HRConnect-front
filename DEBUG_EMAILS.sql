-- ========================================================================
-- SCRIPT DE DÉBOGAGE POUR VÉRIFIER LES EMAILS
-- ========================================================================

-- Vérifier l'email de l'admin dans la table admins
SELECT email, username, prenom, nom FROM admins WHERE email LIKE '%admin%';

-- Vérifier les emails dans la table users
SELECT email, username, role, prenom, nom FROM users;

-- Vérifier les emails dans la table partenaires
SELECT email, nom_structure, personne_contact_nom FROM partenaires;

-- Vérifier les emails dans la table volontaires
SELECT email, prenom, nom FROM volontaires;

-- Test spécifique pour admin@pnvb.gov.bf dans chaque table
SELECT 'admins' as table_name, email FROM admins WHERE email = 'admin@pnvb.gov.bf';
SELECT 'users' as table_name, email FROM users WHERE email = 'admin@pnvb.gov.bf';
SELECT 'partenaires' as table_name, email FROM partenaires WHERE email = 'admin@pnvb.gov.bf';
SELECT 'volontaires' as table_name, email FROM volontaires WHERE email = 'admin@pnvb.gov.bf';
