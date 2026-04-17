// partenaire.model.ts

export interface Partenaire {
  // ============================================
  // IDENTIFICATION ET BASE
  // ============================================
  id?: number | string;
  nomStructure: string;
  email: string;
  telephone: string;
  adresse: string;

  // ============================================
  // PERSONNE CONTACT
  // ============================================
  personneContactNom: string;
  personneContactEmail: string;
  personneContactTelephone: string;
  personneContactFonction: string;

  // ============================================
  // CLASSIFICATION PNVB - TYPES MULTIPLES
  // ============================================
  typeStructures: TypeStructurePNVB[];
  domaineActivite: string;

  // ============================================
  // DESCRIPTION ET VALIDATION
  // ============================================
  description: string;
  estActive: boolean;
  urlDocumentAccord?: string;

  // ============================================
  // DATES IMPORTANTES
  // ============================================
  dateCreationCompte: string;
  dateActivation?: string;
  dateDerniereConnexion?: string;

  // ============================================
  // SITE WEB ET LOGO
  // ============================================
  siteWeb?: string;
  logoUrl?: string;

  // ============================================
  // GESTION DES COMPTES
  // ============================================
  role: 'partenaire';
  motDePasseTemporaire?: string;

  // ============================================
  // PERMISSIONS MULTI-RÔLES
  // ============================================
  permissions: PartenairePermissions;

  // ============================================
  // STATISTIQUES — Structure d'accueil (projets/volontaires)
  // ============================================
  stats?: PartenaireStats;

  // ============================================
  // STATISTIQUES — PTF uniquement (consultation rapports)
  // ============================================
  statsPTF?: PartenairePTFStats;

  // ============================================
  // COMPATIBILITÉ
  // ============================================
  cree_le?: string;
  mis_a_jour_le?: string;
  compteActive?: boolean;
  typesPrincipaux?: string[];
}

// ============================================
// INTERFACES DES PERMISSIONS
// ============================================

export interface PartenairePermissions {
  peutCreerProjets: boolean;
  peutGererVolontaires: boolean;
  peutVoirStatistiques: boolean;
  peutVoirRapports: boolean;
  accesZonePTF: boolean;
  permissionsParType: {
    [type: string]: {
      peutCreerProjets: boolean;
      peutGererVolontaires: boolean;
      peutVoirStatistiques: boolean;
      peutVoirRapports: boolean;
      accesZonePTF: boolean;
    }
  };
}

// ============================================
// STATS STRUCTURE D'ACCUEIL
// ============================================

export interface PartenaireStats {
  totalProjets: number;
  projetsActifs: number;
  projetsTermines: number;
  projetsEnAttente: number;
  volontairesAffectes: number;
  dateDernierProjet?: string;
  statsParType: {
    [type: string]: {
      projets: number;
      volontaires: number;
      budgetTotal?: number;
    }
  };
}

// ============================================
// ✅ STATS PTF (consultation de rapports PNVB)
// Utilisé dans partenaires-list et partenaire-detail
// pour les partenaires de type PTF uniquement.
// Alimenté par RapportsPtfConsultationService.getStatsConsultation()
// ============================================

export interface PartenairePTFStats {
  totalRapports:        number;   // Nombre de rapports accessibles à ce PTF
  rapportsConsultes:    number;   // Rapports distincts consultés au moins une fois
  rapportsNonConsultes: number;   // totalRapports - rapportsConsultes
  tauxConsultation:     number;   // 0-100 (%)
  derniereConsultation: string | null; // ISO date ou null si jamais consulté
}

// ============================================
// TYPES DE STRUCTURES PNVB
// ============================================

export const TYPES_STRUCTURE_PNVB = [
  {
    value: 'Public-Administration',
    label: 'Administration Publique',
    description: 'Ministères, agences gouvernementales',
    peutCreerProjets: true,
    peutGererVolontaires: true,
    peutVoirStatistiques: true,
    peutVoirRapports: false,
    accesZonePTF: false
  },
  {
    value: 'Public-Collectivite',
    label: 'Collectivité Territoriale',
    description: 'Communes, régions, mairies',
    peutCreerProjets: true,
    peutGererVolontaires: true,
    peutVoirStatistiques: true,
    peutVoirRapports: false,
    accesZonePTF: false
  },
  {
    value: 'SocieteCivile',
    label: 'Société Civile',
    description: 'ONG, associations, fondations',
    peutCreerProjets: true,
    peutGererVolontaires: true,
    peutVoirStatistiques: true,
    peutVoirRapports: false,
    accesZonePTF: false
  },
  {
    value: 'SecteurPrive',
    label: 'Secteur Privé',
    description: 'Entreprises, chambres de commerce',
    peutCreerProjets: true,
    peutGererVolontaires: true,
    peutVoirStatistiques: true,
    peutVoirRapports: false,
    accesZonePTF: false
  },
  {
    value: 'PTF',
    label: 'Partenaire Technique et Financier',
    description: 'Bailleurs de fonds, coopérations internationales',
    peutCreerProjets: false,
    peutGererVolontaires: false,
    peutVoirStatistiques: true,
    peutVoirRapports: true,
    accesZonePTF: true
  },
  {
    value: 'InstitutionAcademique',
    label: 'Institution Académique',
    description: 'Universités, centres de recherche',
    peutCreerProjets: true,
    peutGererVolontaires: true,
    peutVoirStatistiques: true,
    peutVoirRapports: false,
    accesZonePTF: false
  }
] as const;

export type TypeStructurePNVB = typeof TYPES_STRUCTURE_PNVB[number]['value'];

// ============================================
// SERVICE DE GESTION DES PERMISSIONS
// ============================================

export class PartenairePermissionsService {

  static calculerPermissionsGlobales(typeStructures: TypeStructurePNVB[]): PartenairePermissions {
    const permissionsParType: PartenairePermissions['permissionsParType'] = {};

    typeStructures.forEach((type: TypeStructurePNVB) => {
      const configType = TYPES_STRUCTURE_PNVB.find(t => t.value === type);
      if (configType) {
        permissionsParType[type] = {
          peutCreerProjets:     configType.peutCreerProjets,
          peutGererVolontaires: configType.peutGererVolontaires,
          peutVoirStatistiques: configType.peutVoirStatistiques,
          peutVoirRapports:     configType.peutVoirRapports,
          accesZonePTF:         configType.accesZonePTF
        };
      }
    });

    return {
      peutCreerProjets:     typeStructures.some(t => TYPES_STRUCTURE_PNVB.find(c => c.value === t)?.peutCreerProjets     || false),
      peutGererVolontaires: typeStructures.some(t => TYPES_STRUCTURE_PNVB.find(c => c.value === t)?.peutGererVolontaires || false),
      peutVoirStatistiques: typeStructures.some(t => TYPES_STRUCTURE_PNVB.find(c => c.value === t)?.peutVoirStatistiques || false),
      peutVoirRapports:     typeStructures.some(t => TYPES_STRUCTURE_PNVB.find(c => c.value === t)?.peutVoirRapports     || false),
      accesZonePTF:         typeStructures.some(t => TYPES_STRUCTURE_PNVB.find(c => c.value === t)?.accesZonePTF         || false),
      permissionsParType
    };
  }

  static creerPartenaireAvecPermissions(data: InscriptionPartenaire): Partenaire {
    const permissions = this.calculerPermissionsGlobales(data.typeStructures);
    const estPTF      = this.estPTF({ typeStructures: data.typeStructures } as Partenaire);

    return {
      ...data,
      nomStructure: data.nomStructure,
      estActive:    false,
      compteActive: false,
      role:         'partenaire',
      dateCreationCompte: new Date().toISOString(),
      permissions,
      // Stats projet uniquement pour les structures d'accueil
      stats: !estPTF ? {
        totalProjets: 0, projetsActifs: 0, projetsTermines: 0,
        projetsEnAttente: 0, volontairesAffectes: 0,
        statsParType: this.initialiserStatsParType(data.typeStructures)
      } : undefined,
      // Stats PTF initialisées à zéro (alimentées dynamiquement depuis consultations-ptf)
      statsPTF: estPTF ? {
        totalRapports: 0, rapportsConsultes: 0, rapportsNonConsultes: 0,
        tauxConsultation: 0, derniereConsultation: null
      } : undefined,
      cree_le:       new Date().toISOString(),
      mis_a_jour_le: new Date().toISOString(),
      typesPrincipaux: data.typeStructures
    };
  }

  private static initialiserStatsParType(typeStructures: TypeStructurePNVB[]): PartenaireStats['statsParType'] {
    const stats: PartenaireStats['statsParType'] = {};
    typeStructures.forEach(type => {
      stats[type] = { projets: 0, volontaires: 0, budgetTotal: 0 };
    });
    return stats;
  }

  static aLeType(partenaire: Partenaire, type: TypeStructurePNVB): boolean {
    return partenaire.typeStructures.includes(type);
  }

  static estPTF(partenaire: Partenaire): boolean {
    return this.aLeType(partenaire, 'PTF');
  }

  static estStructureAccueil(partenaire: Partenaire): boolean {
    return partenaire.typeStructures.some(type =>
      type !== 'PTF' && TYPES_STRUCTURE_PNVB.some(t => t.value === type && t.peutCreerProjets)
    );
  }
}

// ============================================
// INTERFACES POUR FORMULAIRES
// ============================================

export interface InscriptionPartenaire {
  nomStructure: string;
  email: string;
  telephone: string;
  adresse: string;
  personneContactNom: string;
  personneContactEmail: string;
  personneContactTelephone: string;
  personneContactFonction: string;
  typeStructures: TypeStructurePNVB[];
  domaineActivite: string;
  description: string;
  siteWeb?: string;
  motDePasseTemporaire?: string;
}

// ============================================
// DOMAINES D'ACTIVITÉ
// ============================================

export const DOMAINES_ACTIVITE = [
  'Éducation',
  'Santé',
  'Agriculture',
  'Environnement',
  'Développement Communautaire',
  'Technologies de l\'Information',
  'Gouvernance',
  'Culture et Patrimoine',
  'Eau et Assainissement',
  'Énergie',
  'Autre'
] as const;

export type DomaineActivite = typeof DOMAINES_ACTIVITE[number];

// ============================================
// INTERFACES POUR LE DASHBOARD
// ============================================

export interface PartenaireDashboardStats {
  totalProjets: number;
  projetsActifs: number;
  projetsEnAttente: number;
  projetsTermines: number;
  totalCandidatures: number;
  nouvellesCandidatures: number;
  volontairesActuels: number;
  evolutionCandidatures: { date: string; count: number }[];
  alertes: Alerte[];
}

export interface Alerte {
  id: number;
  type: 'nouvelle_candidature' | 'projet_echeance' | 'action_requise' | 'validation_requise' | 'rapport_a_soumettre';
  titre: string;
  message: string;
  date: string;
  lu: boolean;
  lien?: string;
}

// ============================================
// INTERFACES POUR LE DASHBOARD PTF
// ============================================

export interface PTFDashboard {
  projetsFinances: ProjetFinance[];
  statistiquesFinancement: {
    totalInvesti: number;
    projetsActifs: number;
    projetsTermines: number;
    impactCommunautaire: number;
    volontairesSupportes: number;
  };
  rapports: RapportPTF[];
  alertes: AlertePTF[];
}

export interface ProjetFinance {
  id: number;
  titre: string;
  structurePorteuse: string;
  montantFinance: number;
  dateDebut: string;
  dateFin: string;
  statut: 'actif' | 'termine' | 'en_attente';
  volontairesAffectes: number;
}

export interface RapportPTF {
  id: number;
  titre: string;
  type: 'rapport_trimestriel' | 'rapport_annuel' | 'rapport_impact';
  date: string;
  url: string;
}

export interface AlertePTF {
  id: number;
  type: 'rapport_a_soumettre' | 'projet_echeance' | 'nouveau_projet';
  titre: string;
  message: string;
  date: string;
  lu: boolean;
  lien?: string;
}

// ============================================
// INTERFACE POUR LES STATISTIQUES GLOBALES
// ============================================

export interface PartenaireGlobalStats {
  totalPartenaires: number;
  partenairesActifs: number;
  partenairesInactifs: number;
  types: { [key: string]: number };
  domaines: { [key: string]: number };
  statsRoles: {
    totalPTF: number;
    totalStructuresAccueil: number;
    totalMixtes: number;
  };
}

