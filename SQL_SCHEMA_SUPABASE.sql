-- ============================================================================
-- SCRIPT SQL COMPLET POUR SUPABASE - HRConnect-Front Migration
-- ============================================================================
-- Ce script crée le schéma PostgreSQL complet pour la migration
-- Exécuter dans Supabase SQL Editor en ordre

-- ============================================================================
-- 1. CRÉATION DES TYPES ENUM
-- ============================================================================

CREATE TYPE user_role AS ENUM ('candidat', 'partenaire', 'admin');
CREATE TYPE sexe_enum AS ENUM ('M', 'F', 'Autre');
CREATE TYPE statut_volontaire AS ENUM ('En attente', 'Actif', 'Inactif', 'Rejeté', 'Suspendu');
CREATE TYPE disponibilite_enum AS ENUM ('Temps plein', 'Temps partiel', 'Flexible');
CREATE TYPE niveau_etudes_enum AS ENUM ('Bac', 'BTS', 'Licence', 'Master', 'Doctorat', 'CEP', 'BEPC');
CREATE TYPE type_structure_enum AS ENUM ('SecteurPrive', 'PTF', 'InstitutionAcademique', 'NGO', 'Gouvernement', 'Autre');
CREATE TYPE statut_projet AS ENUM ('ouvert', 'cloture', 'en_cours', 'suspendu');
CREATE TYPE contact_subject AS ENUM ('question-generale', 'technique', 'probleme-connexion', 'autre');
CREATE TYPE contact_status AS ENUM ('new', 'responded', 'closed');
CREATE TYPE contact_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE statut_candidature AS ENUM ('en_attente', 'acceptee', 'rejetee', 'retiree');
CREATE TYPE statut_affectation AS ENUM ('active', 'suspendue', 'terminee', 'annulee');

-- ============================================================================
-- 2. TABLE USERS
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'candidat',
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20),
  profil_complete BOOLEAN DEFAULT FALSE,
  volontaire_id UUID,
  date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT email_valid CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT telephone_valid CHECK (telephone IS NULL OR telephone ~ '^[0-9+\s\-()]+$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- 3. TABLE ADMINS
-- ============================================================================

CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20),
  permissions TEXT[] DEFAULT ARRAY['all'],
  actif BOOLEAN DEFAULT TRUE,
  date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT email_valid CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_actif ON admins(actif);

-- ============================================================================
-- 4. TABLE PARTENAIRES
-- ============================================================================

CREATE TABLE partenaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_structure VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  telephone VARCHAR(20),
  adresse TEXT,
  personne_contact_nom VARCHAR(100),
  personne_contact_email VARCHAR(255),
  personne_contact_telephone VARCHAR(20),
  personne_contact_fonction VARCHAR(100),
  type_structures type_structure_enum[] DEFAULT ARRAY[]::type_structure_enum[],
  domaine_activite VARCHAR(100),
  site_web VARCHAR(255),
  description TEXT,
  est_active BOOLEAN DEFAULT TRUE,
  mot_de_passe_temporaire VARCHAR(255),
  compte_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{"peutCreerProjets":true,"peutGererVolontaires":true,"peutVoirStatistiques":true,"peutVoirRapports":true,"accesZonePTF":false}',
  permissions_par_type JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{"totalProjets":0,"projetsActifs":0,"projetsTermines":0,"projetsEnAttente":0,"volontairesAffectes":0}',
  types_principaux type_structure_enum[] DEFAULT ARRAY[]::type_structure_enum[],
  date_activation TIMESTAMP,
  cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  mis_a_jour_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT email_valid CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_partenaires_email ON partenaires(email);
CREATE INDEX idx_partenaires_est_active ON partenaires(est_active);
CREATE INDEX idx_partenaires_type_structures ON partenaires USING GIN (type_structures);

-- ============================================================================
-- 5. TABLE VOLONTAIRES
-- ============================================================================

CREATE TABLE volontaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telephone VARCHAR(20),
  date_naissance DATE,
  sexe sexe_enum,
  nationalite VARCHAR(100),
  statut statut_volontaire DEFAULT 'En attente',
  competences TEXT[] DEFAULT ARRAY[]::TEXT[],
  region_geographique VARCHAR(100),
  motivation TEXT,
  disponibilite disponibilite_enum,
  adresse_residence VARCHAR(255),
  niveau_etudes niveau_etudes_enum,
  domaine_etudes VARCHAR(100),
  url_cv VARCHAR(255),
  url_piece_identite VARCHAR(255),
  type_piece VARCHAR(50),
  numero_piece VARCHAR(50),
  date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT age_valid CHECK (date_naissance IS NULL OR date_naissance <= CURRENT_DATE - INTERVAL '16 years')
);

CREATE INDEX idx_volontaires_user_id ON volontaires(user_id);
CREATE INDEX idx_volontaires_email ON volontaires(email);
CREATE INDEX idx_volontaires_statut ON volontaires(statut);
CREATE INDEX idx_volontaires_competences ON volontaires USING GIN (competences);

-- ============================================================================
-- 6. TABLE PROJETS
-- ============================================================================

CREATE TABLE projets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partenaire_id UUID NOT NULL REFERENCES partenaires(id) ON DELETE CASCADE,
  titre VARCHAR(255) NOT NULL,
  description_longue TEXT,
  description_courte VARCHAR(500),
  domaine_activite VARCHAR(100),
  competences_requises TEXT[] DEFAULT ARRAY[]::TEXT[],
  type_mission VARCHAR(100),
  region_affectation VARCHAR(100),
  ville_commune VARCHAR(100),
  nombre_volontaires_requis INTEGER DEFAULT 1,
  nombre_volontaires_actuels INTEGER DEFAULT 0,
  avantages_volontaire TEXT,
  date_debut DATE,
  date_fin DATE,
  date_limite_candidature DATE,
  conditions_particulieres TEXT,
  contact_responsable VARCHAR(100),
  email_contact VARCHAR(255),
  statut_projet statut_projet DEFAULT 'ouvert',
  date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_cloture TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT date_logic CHECK (date_debut <= date_fin),
  CONSTRAINT volontaires_logic CHECK (nombre_volontaires_actuels <= nombre_volontaires_requis)
);

CREATE INDEX idx_projets_partenaire_id ON projets(partenaire_id);
CREATE INDEX idx_projets_statut ON projets(statut_projet);
CREATE INDEX idx_projets_region ON projets(region_affectation);
CREATE INDEX idx_projets_competences ON projets USING GIN (competences_requises);
CREATE INDEX idx_projets_date_limite ON projets(date_limite_candidature);

-- ============================================================================
-- 7. TABLE CANDIDATURES
-- ============================================================================

CREATE TABLE candidatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volontaire_id UUID NOT NULL REFERENCES volontaires(id) ON DELETE CASCADE,
  projet_id UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  statut statut_candidature DEFAULT 'en_attente',
  date_candidature TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lettre_motivation TEXT,
  raison_rejet VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(volontaire_id, projet_id)
);

CREATE INDEX idx_candidatures_volontaire_id ON candidatures(volontaire_id);
CREATE INDEX idx_candidatures_projet_id ON candidatures(projet_id);
CREATE INDEX idx_candidatures_statut ON candidatures(statut);

-- ============================================================================
-- 8. TABLE AFFECTATIONS
-- ============================================================================

CREATE TABLE affectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volontaire_id UUID NOT NULL REFERENCES volontaires(id) ON DELETE CASCADE,
  projet_id UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  date_affectation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_debut_effectif DATE,
  date_fin_effectif DATE,
  statut statut_affectation DEFAULT 'active',
  notes_supervision TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(volontaire_id, projet_id)
);

CREATE INDEX idx_affectations_volontaire_id ON affectations(volontaire_id);
CREATE INDEX idx_affectations_projet_id ON affectations(projet_id);
CREATE INDEX idx_affectations_statut ON affectations(statut);

-- ============================================================================
-- 9. TABLE CONTACT MESSAGES
-- ============================================================================

CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject contact_subject,
  message TEXT NOT NULL,
  status contact_status DEFAULT 'new',
  priority contact_priority DEFAULT 'low',
  admin_notes TEXT,
  assigned_to UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  responded_at TIMESTAMP
);

CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_email ON contact_messages(email);
CREATE INDEX idx_contact_messages_priority ON contact_messages(priority);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- ============================================================================
-- 10. TABLE ALERTES
-- ============================================================================

CREATE TABLE alertes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  cible_utilisateur_id UUID REFERENCES users(id) ON DELETE CASCADE,
  est_lue BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alertes_utilisateur ON alertes(cible_utilisateur_id);
CREATE INDEX idx_alertes_est_lue ON alertes(est_lue);

-- ============================================================================
-- 11. TABLE PARAMETRES
-- ============================================================================

CREATE TABLE parametres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cle VARCHAR(100) NOT NULL UNIQUE,
  valeur TEXT,
  description TEXT,
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parametres_cle ON parametres(cle);

-- ============================================================================
-- 12. TABLE OFFRES MISSION
-- ============================================================================

CREATE TABLE offres_mission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id UUID REFERENCES projets(id) ON DELETE CASCADE,
  titre VARCHAR(255),
  description TEXT,
  competences_requises TEXT[] DEFAULT ARRAY[]::TEXT[],
  salaire_mensuel NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_offres_mission_projet_id ON offres_mission(projet_id);

-- ============================================================================
-- 13. TABLE RAPPORTS
-- ============================================================================

CREATE TABLE rapports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100),
  titre VARCHAR(255),
  contenu TEXT,
  auteur_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date_rapport DATE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rapports_auteur_id ON rapports(auteur_id);
CREATE INDEX idx_rapports_type ON rapports(type);
CREATE INDEX idx_rapports_date ON rapports(date_rapport DESC);

-- ============================================================================
-- 14. TABLE RAPPORTS PTF
-- ============================================================================

CREATE TABLE rapports_ptf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partenaire_id UUID NOT NULL REFERENCES partenaires(id) ON DELETE CASCADE,
  titre VARCHAR(255),
  contenu TEXT,
  type VARCHAR(100),
  date_rapport DATE,
  is_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rapports_ptf_partenaire_id ON rapports_ptf(partenaire_id);
CREATE INDEX idx_rapports_ptf_type ON rapports_ptf(type);

-- ============================================================================
-- 15. TABLE TYPES
-- ============================================================================

CREATE TABLE types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie VARCHAR(100),
  valeur VARCHAR(100),
  description TEXT,
  ordre INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(categorie, valeur)
);

CREATE INDEX idx_types_categorie ON types(categorie);
CREATE INDEX idx_types_actif ON types(actif);

-- ============================================================================
-- 16. FOREIGN KEY POUR users.volontaire_id
-- ============================================================================

ALTER TABLE users 
ADD CONSTRAINT fk_users_volontaire_id 
FOREIGN KEY (volontaire_id) 
REFERENCES volontaires(id) ON DELETE SET NULL;

CREATE INDEX idx_users_volontaire_id ON users(volontaire_id);

-- ============================================================================
-- 17. FONCTION POUR METTRE À JOUR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partenaires_updated_at BEFORE UPDATE ON partenaires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volontaires_updated_at BEFORE UPDATE ON volontaires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projets_updated_at BEFORE UPDATE ON projets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidatures_updated_at BEFORE UPDATE ON candidatures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affectations_updated_at BEFORE UPDATE ON affectations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON contact_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alertes_updated_at BEFORE UPDATE ON alertes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parametres_updated_at BEFORE UPDATE ON parametres
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offres_mission_updated_at BEFORE UPDATE ON offres_mission
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rapports_updated_at BEFORE UPDATE ON rapports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rapports_ptf_updated_at BEFORE UPDATE ON rapports_ptf
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_types_updated_at BEFORE UPDATE ON types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 18. VUES POUR STATISTIQUES
-- ============================================================================

CREATE VIEW statistiques_projets AS
SELECT 
  p.id,
  p.titre,
  p.partenaire_id,
  pt.nom_structure as partenaire_nom,
  COUNT(DISTINCT c.volontaire_id) as total_candidats,
  COUNT(DISTINCT a.volontaire_id) as total_affectes,
  p.nombre_volontaires_requis,
  p.statut_projet,
  p.created_at
FROM projets p
LEFT JOIN partenaires pt ON p.partenaire_id = pt.id
LEFT JOIN candidatures c ON p.id = c.projet_id
LEFT JOIN affectations a ON p.id = a.projet_id
GROUP BY p.id, p.titre, p.partenaire_id, pt.nom_structure, p.nombre_volontaires_requis, p.statut_projet, p.created_at;

CREATE VIEW statistiques_volontaires AS
SELECT 
  v.id,
  v.nom,
  v.prenom,
  v.email,
  COUNT(DISTINCT c.projet_id) as total_candidatures,
  COUNT(DISTINCT a.projet_id) as total_affectations,
  v.statut,
  v.created_at
FROM volontaires v
LEFT JOIN candidatures c ON v.id = c.volontaire_id
LEFT JOIN affectations a ON v.id = a.volontaire_id
GROUP BY v.id, v.nom, v.prenom, v.email, v.statut, v.created_at;

CREATE VIEW statistiques_partenaires AS
SELECT 
  p.id,
  p.nom_structure,
  p.email,
  COUNT(DISTINCT pr.id) as total_projets,
  COUNT(DISTINCT CASE WHEN pr.statut_projet = 'ouvert' THEN pr.id END) as projets_ouverts,
  COUNT(DISTINCT a.volontaire_id) as total_volontaires_affectes,
  p.created_at
FROM partenaires p
LEFT JOIN projets pr ON p.id = pr.partenaire_id
LEFT JOIN affectations a ON pr.id = a.projet_id
GROUP BY p.id, p.nom_structure, p.email, p.created_at;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
