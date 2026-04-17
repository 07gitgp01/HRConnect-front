// partenaire.model.ts

export interface Partenaire {
  // ============================================
  // IDENTIFICATION ET BASE
  // ============================================
  id?: number;
  nomStructure: string;
  email: string;
  telephone: string;
  adresse: string;
  
  // ============================================
  // PERSONNE CONTACT
  // ============================================
  personneContactNom: string;
  personneContactEmail: string; // NOUVEAU CHAMP
  personneContactTelephone: string;
  personneContactFonction: string;
  
  // ============================================
  // CLASSIFICATION PNVB - TYPES MULTIPLES
  // ============================================
  typeStructures: TypeStructurePNVB[];  // Tableau de types
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
  // STATISTIQUES
  // ============================================
  stats?: PartenaireStats;

  // ============================================
  // COMPATIBILITÉ
  // ============================================
  cree_le?: string;
  mis_a_jour_le?: string;
  compteActive?: boolean;
  typesPrincipaux?: string[]; // Pour la rétro-compatibilité
}

// ============================================
// INTERFACES DES PERMISSIONS
// ============================================

export interface PartenairePermissions {
  // Permissions globales calculées depuis typeStructures
  peutCreerProjets: boolean;
  peutGererVolontaires: boolean;
  peutVoirStatistiques: boolean;
  peutVoirRapports: boolean;
  accesZonePTF: boolean;
  
  // Détail des permissions par type
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

export interface PartenaireStats {
  totalProjets: number;
  projetsActifs: number;
  projetsTermines: number;
  projetsEnAttente: number;
  volontairesAffectes: number;
  dateDernierProjet?: string;
  
  // Statistiques par type de structure
  statsParType: {
    [type: string]: {
      projets: number;
      volontaires: number;
      budgetTotal?: number;
    }
  };
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
  
  // Calculer les permissions globales basées sur les types multiples
  static calculerPermissionsGlobales(typeStructures: TypeStructurePNVB[]): PartenairePermissions {
    const permissionsParType: PartenairePermissions['permissionsParType'] = {};
    
    // Récupérer les permissions pour chaque type
    typeStructures.forEach((type: TypeStructurePNVB) => {
      const configType = TYPES_STRUCTURE_PNVB.find(t => t.value === type);
      if (configType) {
        permissionsParType[type] = {
          peutCreerProjets: configType.peutCreerProjets,
          peutGererVolontaires: configType.peutGererVolontaires,
          peutVoirStatistiques: configType.peutVoirStatistiques,
          peutVoirRapports: configType.peutVoirRapports,
          accesZonePTF: configType.accesZonePTF
        };
      }
    });

    // Calculer les permissions globales (OR logique entre tous les types)
    const permissionsGlobales = {
      peutCreerProjets: typeStructures.some((type: TypeStructurePNVB) => 
        TYPES_STRUCTURE_PNVB.find(t => t.value === type)?.peutCreerProjets || false
      ),
      peutGererVolontaires: typeStructures.some((type: TypeStructurePNVB) => 
        TYPES_STRUCTURE_PNVB.find(t => t.value === type)?.peutGererVolontaires || false
      ),
      peutVoirStatistiques: typeStructures.some((type: TypeStructurePNVB) => 
        TYPES_STRUCTURE_PNVB.find(t => t.value === type)?.peutVoirStatistiques || false
      ),
      peutVoirRapports: typeStructures.some((type: TypeStructurePNVB) => 
        TYPES_STRUCTURE_PNVB.find(t => t.value === type)?.peutVoirRapports || false
      ),
      accesZonePTF: typeStructures.some((type: TypeStructurePNVB) => 
        TYPES_STRUCTURE_PNVB.find(t => t.value === type)?.accesZonePTF || false
      )
    };

    return {
      ...permissionsGlobales,
      permissionsParType
    };
  }

  // Créer un partenaire avec permissions multi-types
  static creerPartenaireAvecPermissions(data: InscriptionPartenaire): Partenaire {
    const permissions = this.calculerPermissionsGlobales(data.typeStructures);
    
    return {
      ...data,
      nomStructure: data.nomStructure,
      estActive: false,
      compteActive: false,
      role: 'partenaire',
      dateCreationCompte: new Date().toISOString(),
      permissions: permissions,
      stats: {
        totalProjets: 0,
        projetsActifs: 0,
        projetsTermines: 0,
        projetsEnAttente: 0,
        volontairesAffectes: 0,
        statsParType: this.initialiserStatsParType(data.typeStructures)
      },
      // Compatibilité
      cree_le: new Date().toISOString(),
      mis_a_jour_le: new Date().toISOString(),
      typesPrincipaux: data.typeStructures // Pour rétro-compatibilité
    };
  }

  private static initialiserStatsParType(typeStructures: TypeStructurePNVB[]): PartenaireStats['statsParType'] {
    const stats: PartenaireStats['statsParType'] = {};
    typeStructures.forEach((type: TypeStructurePNVB) => {
      stats[type] = {
        projets: 0,
        volontaires: 0,
        budgetTotal: 0
      };
    });
    return stats;
  }

  // Vérifier si un partenaire a un type spécifique
  static aLeType(partenaire: Partenaire, type: TypeStructurePNVB): boolean {
    return partenaire.typeStructures.includes(type);
  }

  // Vérifier si un partenaire est PTF
  static estPTF(partenaire: Partenaire): boolean {
    return this.aLeType(partenaire, 'PTF');
  }

  // Vérifier si un partenaire est Structure d'Accueil
  static estStructureAccueil(partenaire: Partenaire): boolean {
    return partenaire.typeStructures.some((type: TypeStructurePNVB) => 
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
  personneContactEmail: string; // NOUVEAU CHAMP
  personneContactTelephone: string;
  personneContactFonction: string;
  typeStructures: TypeStructurePNVB[];  // Maintenant un tableau
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