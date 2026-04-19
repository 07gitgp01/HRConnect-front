-- ========================================================================
-- CORRECTION DES PERMISSIONS POUR LES TABLES
-- ========================================================================

-- Activer l'accès à la table admins pour les utilisateurs authentifiés
CREATE POLICY "Enable read access for all authenticated users" ON admins
  FOR SELECT USING (auth.role() = 'authenticated');

-- Activer l'accès à la table users pour les utilisateurs authentifiés
CREATE POLICY "Enable read access for all authenticated users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Activer l'accès à la table partenaires pour les utilisateurs authentifiés
CREATE POLICY "Enable read access for all authenticated users" ON partenaires
  FOR SELECT USING (auth.role() = 'authenticated');

-- Activer l'accès à la table volontaires pour les utilisateurs authentifiés
CREATE POLICY "Enable read access for all authenticated users" ON volontaires
  FOR SELECT USING (auth.role() = 'authenticated');

-- Activer RLS sur toutes les tables (si pas déjà fait)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partenaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE volontaires ENABLE ROW LEVEL SECURITY;
