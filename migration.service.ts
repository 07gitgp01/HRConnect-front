// ============================================================================
// SCRIPT DE MIGRATION - bd.json vers Supabase (HRConnect-Front)
// ============================================================================
// À exécuter dans une app Angular service ou Node.js
// npm install bcryptjs @supabase/supabase-js

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';

interface BdJsonData {
  users?: any[];
  admins?: any[];
  partenaires?: any[];
  volontaires?: any[];
  projets?: any[];
  candidatures?: any[];
  contactMessages?: any[];
  [key: string]: any;
}

export class MigrationService {
  private supabase: SupabaseClient;
  private bdData: BdJsonData = {};
  private logFile: string = 'migration.log';

  constructor(
    private supabaseUrl: string,
    private supabaseKey: string,
    private bdJsonPath: string = 'bd.json'
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.loadBdJson();
  }

  // ========================================================================
  // 1. CHARGEMENT DES DONNÉES
  // ========================================================================

  private loadBdJson(): void {
    try {
      const content = fs.readFileSync(this.bdJsonPath, 'utf-8');
      this.bdData = JSON.parse(content);
      this.log('✅ bd.json chargé avec succès');
    } catch (error) {
      this.log(`❌ Erreur lors du chargement de bd.json: ${error}`);
      throw error;
    }
  }

  // ========================================================================
  // 2. FONCTION DE HACHAGE DE MOT DE PASSE
  // ========================================================================

  private async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      this.log(`❌ Erreur lors du hachage du password: ${error}`);
      throw error;
    }
  }

  // ========================================================================
  // 3. MIGRATION DES ADMINS
  // ========================================================================

  async migrateAdmins(): Promise<void> {
    if (!this.bdData.admins || this.bdData.admins.length === 0) {
      this.log('⚠️  Aucun admin à migrer');
      return;
    }

    this.log(`📦 Migration de ${this.bdData.admins.length} admins...`);

    for (const admin of this.bdData.admins) {
      try {
        const passwordHash = await this.hashPassword(admin.password);

        const { data, error } = await this.supabase
          .from('admins')
          .insert([
            {
              id: admin.id,
              username: admin.username,
              email: admin.email,
              password_hash: passwordHash,
              prenom: admin.prenom,
              nom: admin.nom,
              telephone: admin.telephone,
              permissions: admin.permissions || ['all'],
              actif: admin.actif !== undefined ? admin.actif : true,
              date_inscription: admin.date_inscription || new Date().toISOString(),
              date_creation: admin.dateCreation || new Date().toISOString(),
            },
          ]);

        if (error) throw error;
        this.log(`✅ Admin migré: ${admin.username}`);
      } catch (error) {
        this.log(`❌ Erreur migration admin ${admin.username}: ${error}`);
      }
    }
  }

  // ========================================================================
  // 4. MIGRATION DES PARTENAIRES
  // ========================================================================

  async migratePartenaires(): Promise<void> {
    if (!this.bdData.partenaires || this.bdData.partenaires.length === 0) {
      this.log('⚠️  Aucun partenaire à migrer');
      return;
    }

    this.log(`📦 Migration de ${this.bdData.partenaires.length} partenaires...`);

    for (const partenaire of this.bdData.partenaires) {
      try {
        const passwordHash = partenaire.motDePasseTemporaire
          ? await this.hashPassword(partenaire.motDePasseTemporaire)
          : null;

        const { data, error } = await this.supabase
          .from('partenaires')
          .insert([
            {
              id: partenaire.id,
              nom_structure: partenaire.nomStructure,
              email: partenaire.email,
              telephone: partenaire.telephone || null,
              adresse: partenaire.adresse || null,
              personne_contact_nom: partenaire.personneContactNom || null,
              personne_contact_email: partenaire.personneContactEmail || null,
              personne_contact_telephone: partenaire.personneContactTelephone || null,
              personne_contact_fonction: partenaire.personneContactFonction || null,
              type_structures: partenaire.typeStructures || [],
              domaine_activite: partenaire.domaineActivite || null,
              site_web: partenaire.siteWeb || null,
              description: partenaire.description || null,
              est_active: partenaire.estActive !== undefined ? partenaire.estActive : true,
              mot_de_passe_temporaire: passwordHash,
              compte_active: partenaire.compteActive !== undefined ? partenaire.compteActive : true,
              permissions: partenaire.permissions || {},
              permissions_par_type: partenaire.permissionsParType || {},
              stats: partenaire.stats || {},
              types_principaux: partenaire.typesPrincipaux || [],
              date_activation: partenaire.dateActivation || new Date().toISOString(),
              cree_le: partenaire.cree_le || new Date().toISOString(),
              mis_a_jour_le: partenaire.mis_a_jour_le || new Date().toISOString(),
            },
          ]);

        if (error) throw error;
        this.log(`✅ Partenaire migré: ${partenaire.nomStructure}`);
      } catch (error) {
        this.log(`❌ Erreur migration partenaire ${partenaire.nomStructure}: ${error}`);
      }
    }
  }

  // ========================================================================
  // 5. MIGRATION DES USERS
  // ========================================================================

  async migrateUsers(): Promise<void> {
    if (!this.bdData.users || this.bdData.users.length === 0) {
      this.log('⚠️  Aucun user à migrer');
      return;
    }

    this.log(`📦 Migration de ${this.bdData.users.length} users...`);

    for (const user of this.bdData.users) {
      try {
        const passwordHash = await this.hashPassword(user.password);

        const { data, error } = await this.supabase
          .from('users')
          .insert([
            {
              id: user.id,
              username: user.username,
              email: user.email,
              password_hash: passwordHash,
              role: user.role || 'candidat',
              prenom: user.prenom,
              nom: user.nom,
              telephone: user.telephone || null,
              profil_complete: user.profilComplete !== undefined ? user.profilComplete : false,
              volontaire_id: user.volontaireId || null,
              date_inscription: user.date_inscription || new Date().toISOString(),
            },
          ]);

        if (error) throw error;
        this.log(`✅ User migré: ${user.username}`);
      } catch (error) {
        this.log(`❌ Erreur migration user ${user.username}: ${error}`);
      }
    }
  }

  // ========================================================================
  // 6. MIGRATION DES VOLONTAIRES
  // ========================================================================

  async migrateVolontaires(): Promise<void> {
    if (!this.bdData.volontaires || this.bdData.volontaires.length === 0) {
      this.log('⚠️  Aucun volontaire à migrer');
      return;
    }

    this.log(`📦 Migration de ${this.bdData.volontaires.length} volontaires...`);

    for (const volontaire of this.bdData.volontaires) {
      try {
        const { data: user } = await this.supabase
          .from('users')
          .select('id')
          .eq('id', volontaire.userId)
          .single();

        if (!user) {
          throw new Error(`User ${volontaire.userId} not found`);
        }

        const { data, error } = await this.supabase
          .from('volontaires')
          .insert([
            {
              id: volontaire.id,
              user_id: volontaire.userId,
              nom: volontaire.nom,
              prenom: volontaire.prenom,
              email: volontaire.email,
              telephone: volontaire.telephone || null,
              date_naissance: volontaire.dateNaissance || null,
              sexe: volontaire.sexe || null,
              nationalite: volontaire.nationalite || null,
              statut: volontaire.statut || 'En attente',
              competences: volontaire.competences || [],
              region_geographique: volontaire.regionGeographique || null,
              motivation: volontaire.motivation || null,
              disponibilite: volontaire.disponibilite || null,
              adresse_residence: volontaire.adresseResidence || null,
              niveau_etudes: volontaire.niveauEtudes || null,
              domaine_etudes: volontaire.domaineEtudes || null,
              url_cv: volontaire.urlCV || null,
              url_piece_identite: volontaire.urlPieceIdentite || null,
              type_piece: volontaire.typePiece || null,
              numero_piece: volontaire.numeroPiece || null,
              date_inscription: volontaire.dateInscription || new Date().toISOString(),
            },
          ]);

        if (error) throw error;
        this.log(`✅ Volontaire migré: ${volontaire.prenom} ${volontaire.nom}`);

        await this.supabase
          .from('users')
          .update({ volontaire_id: volontaire.id })
          .eq('id', volontaire.userId);
      } catch (error) {
        this.log(`❌ Erreur migration volontaire ${volontaire.prenom} ${volontaire.nom}: ${error}`);
      }
    }
  }

  // ========================================================================
  // 7. MIGRATION DES PROJETS
  // ========================================================================

  async migrateProjects(): Promise<void> {
    if (!this.bdData.projets || this.bdData.projets.length === 0) {
      this.log('⚠️  Aucun projet à migrer');
      return;
    }

    this.log(`📦 Migration de ${this.bdData.projets.length} projets...`);

    for (const projet of this.bdData.projets) {
      try {
        const { data: partenaire } = await this.supabase
          .from('partenaires')
          .select('id')
          .eq('id', projet.partenaireId)
          .single();

        if (!partenaire) {
          throw new Error(`Partenaire ${projet.partenaireId} not found`);
        }

        const { data, error } = await this.supabase
          .from('projets')
          .insert([
            {
              id: projet.id,
              partenaire_id: projet.partenaireId,
              titre: projet.titre,
              description_longue: projet.descriptionLongue || null,
              description_courte: projet.descriptionCourte || null,
              domaine_activite: projet.domaineActivite || null,
              competences_requises: projet.competences_requises || [],
              type_mission: projet.type_mission || null,
              region_affectation: projet.regionAffectation || null,
              ville_commune: projet.ville_commune || null,
              nombre_volontaires_requis: projet.nombreVolontairesRequis || 1,
              nombre_volontaires_actuels: projet.nombreVolontairesActuels || 0,
              avantages_volontaire: projet.avantagesVolontaire || null,
              date_debut: projet.dateDebut || null,
              date_fin: projet.dateFin || null,
              date_limite_candidature: projet.dateLimiteCandidature || null,
              conditions_particulieres: projet.conditions_particulieres || null,
              contact_responsable: projet.contact_responsable || null,
              email_contact: projet.email_contact || null,
              statut_projet: projet.statutProjet || 'ouvert',
              date_publication: projet.datePublication || new Date().toISOString(),
              date_cloture: projet.dateCloture || null,
            },
          ]);

        if (error) throw error;
        this.log(`✅ Projet migré: ${projet.titre}`);
      } catch (error) {
        this.log(`❌ Erreur migration projet ${projet.titre}: ${error}`);
      }
    }
  }

  // ========================================================================
  // 8. MIGRATION DES MESSAGES DE CONTACT
  // ========================================================================

  async migrateContactMessages(): Promise<void> {
    if (!this.bdData.contactMessages || this.bdData.contactMessages.length === 0) {
      this.log('⚠️  Aucun message de contact à migrer');
      return;
    }

    this.log(`📦 Migration de ${this.bdData.contactMessages.length} messages de contact...`);

    for (const msg of this.bdData.contactMessages) {
      try {
        const { data, error } = await this.supabase
          .from('contact_messages')
          .insert([
            {
              id: msg.id,
              full_name: msg.fullName,
              email: msg.email,
              subject: msg.subject || 'question-generale',
              message: msg.message,
              status: msg.status || 'new',
              priority: msg.priority || 'low',
              admin_notes: msg.adminNotes || null,
              assigned_to: msg.assignedTo || null,
              created_at: msg.createdAt || new Date().toISOString(),
              updated_at: msg.updatedAt || new Date().toISOString(),
              read_at: msg.readAt || null,
              responded_at: msg.respondedAt || null,
            },
          ]);

        if (error) throw error;
        this.log(`✅ Message de contact migré: ${msg.fullName}`);
      } catch (error) {
        this.log(`❌ Erreur migration message de contact ${msg.fullName}: ${error}`);
      }
    }
  }

  // ========================================================================
  // 9. MIGRATION COMPLÈTE
  // ========================================================================

  async migrateAll(): Promise<void> {
    this.log('🚀 DÉBUT DE LA MIGRATION COMPLÈTE');
    this.log('='.repeat(60));

    const startTime = Date.now();

    try {
      await this.migrateAdmins();
      await this.migratePartenaires();
      await this.migrateUsers();
      await this.migrateVolontaires();
      await this.migrateProjects();
      await this.migrateContactMessages();

      const duration = (Date.now() - startTime) / 1000;
      this.log('='.repeat(60));
      this.log(`✅ MIGRATION COMPLÉTÉE EN ${duration}s`);
    } catch (error) {
      this.log(`❌ ERREUR DURANT LA MIGRATION: ${error}`);
      throw error;
    }
  }

  // ========================================================================
  // 10. VÉRIFICATION DES DONNÉES
  // ========================================================================

  async verifyMigration(): Promise<void> {
    this.log('\n🔍 VÉRIFICATION DES DONNÉES MIGRÉES');
    this.log('='.repeat(60));

    try {
      const tables = [
        'admins',
        'partenaires',
        'users',
        'volontaires',
        'projets',
        'contact_messages',
      ];

      for (const table of tables) {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          this.log(`❌ Erreur lors de la vérification de ${table}: ${error}`);
        } else {
          this.log(`✅ ${table}: ${count} enregistrements`);
        }
      }

      this.log('='.repeat(60));
    } catch (error) {
      this.log(`❌ Erreur lors de la vérification: ${error}`);
    }
  }

  // ========================================================================
  // 11. LOGGING
  // ========================================================================

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);

    try {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      console.error('Erreur lors de l\'écriture du log:', error);
    }
  }
}

export default MigrationService;
