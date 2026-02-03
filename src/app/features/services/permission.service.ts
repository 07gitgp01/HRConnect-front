// src/app/core/services/permission.service.ts
import { Injectable } from '@angular/core';
import { 
  Partenaire, 
  PartenairePermissions, 
  TYPES_STRUCTURE_PNVB,
  TypeStructurePNVB,
  PartenairePermissionsService 
} from '../models/partenaire.model';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  
  // ============================================================================
  // PERMISSIONS DE BASE
  // ============================================================================

  /**
   * Vérifie si le partenaire peut créer des projets
   */
  peutCreerProjets(partenaire: Partenaire): boolean {
    return partenaire?.permissions?.peutCreerProjets === true;
  }

  /**
   * Vérifie si le partenaire peut gérer les volontaires
   */
  peutGererVolontaires(partenaire: Partenaire): boolean {
    return partenaire?.permissions?.peutGererVolontaires === true;
  }

  /**
   * Vérifie si le partenaire peut voir les statistiques
   */
  peutVoirStatistiques(partenaire: Partenaire): boolean {
    return partenaire?.permissions?.peutVoirStatistiques ?? true; // Par défaut true
  }

  /**
   * Vérifie si le partenaire peut voir les rapports
   */
  peutVoirRapports(partenaire: Partenaire): boolean {
    return partenaire?.permissions?.peutVoirRapports === true;
  }

  /**
   * Vérifie si le partenaire a accès à la zone PTF
   */
  aAccesZonePTF(partenaire: Partenaire): boolean {
    return partenaire?.permissions?.accesZonePTF === true;
  }

  // ============================================================================
  // VÉRIFICATIONS DE TYPES DE STRUCTURES
  // ============================================================================

  /**
   * Vérifie si c'est un PTF (Partenaire Technique et Financier)
   */
  estPTF(partenaire: Partenaire): boolean {
    return PartenairePermissionsService.estPTF(partenaire);
  }

  /**
   * Vérifie si c'est une structure d'accueil (tous sauf PTF)
   */
  estStructureAccueil(partenaire: Partenaire): boolean {
    return PartenairePermissionsService.estStructureAccueil(partenaire);
  }

  /**
   * Vérifie si le partenaire a un type spécifique
   */
  aLeType(partenaire: Partenaire, type: TypeStructurePNVB): boolean {
    return PartenairePermissionsService.aLeType(partenaire, type);
  }

  /**
   * Vérifie si c'est une administration publique
   */
  estAdministrationPublique(partenaire: Partenaire): boolean {
    return this.aLeType(partenaire, 'Public-Administration');
  }

  /**
   * Vérifie si c'est une collectivité territoriale
   */
  estCollectiviteTerritoriale(partenaire: Partenaire): boolean {
    return this.aLeType(partenaire, 'Public-Collectivite');
  }

  /**
   * Vérifie si c'est une société civile (ONG, association)
   */
  estSocieteCivile(partenaire: Partenaire): boolean {
    return this.aLeType(partenaire, 'SocieteCivile');
  }

  /**
   * Vérifie si c'est une institution académique
   */
  estInstitutionAcademique(partenaire: Partenaire): boolean {
    return this.aLeType(partenaire, 'InstitutionAcademique');
  }

  /**
   * Vérifie si c'est une entreprise privée
   */
  estSecteurPrive(partenaire: Partenaire): boolean {
    return this.aLeType(partenaire, 'SecteurPrive');
  }

  // ============================================================================
  // GESTION DES UTILISATEURS
  // ============================================================================

  /**
   * Vérifie si un utilisateur est administrateur
   */
  estAdministrateur(user: any): boolean {
    return user?.role === 'admin';
  }

  /**
   * Vérifie si un utilisateur est candidat
   */
  estCandidat(user: any): boolean {
    return user?.role === 'candidat';
  }

  /**
   * Vérifie si un utilisateur est partenaire
   */
  estPartenaire(user: any): boolean {
    return user?.role === 'partenaire';
  }

  // ============================================================================
  // VALIDATION D'ACCÈS AVANCÉE
  // ============================================================================

  /**
   * Valide si un partenaire peut accéder à une fonctionnalité
   */
  validerAcces(partenaire: Partenaire, fonctionnalite: string): { autorise: boolean; message?: string } {
    if (!partenaire) {
      return { autorise: false, message: 'Partenaire non spécifié' };
    }

    switch (fonctionnalite) {
      case 'soumettre-projet':
        return this.peutCreerNouveauProjet(partenaire, 0);

      case 'gerer-candidatures':
        if (!this.peutGererVolontaires(partenaire)) {
          return {
            autorise: false,
            message: 'Vous n\'êtes pas autorisé à gérer les candidatures'
          };
        }
        return { autorise: true };

      case 'voir-statistiques':
        if (!this.peutVoirStatistiques(partenaire)) {
          return {
            autorise: false,
            message: 'Accès aux statistiques non autorisé'
          };
        }
        return { autorise: true };

      case 'zone-ptf':
        if (!this.aAccesZonePTF(partenaire)) {
          return {
            autorise: false,
            message: 'Accès à l\'espace PTF réservé aux partenaires techniques et financiers'
          };
        }
        return { autorise: true };

      case 'dashboard-ptf':
        if (!this.estPTF(partenaire)) {
          return {
            autorise: false,
            message: 'Dashboard PTF réservé aux partenaires techniques et financiers'
          };
        }
        return { autorise: true };

      case 'dashboard-structure':
        if (!this.estStructureAccueil(partenaire)) {
          return {
            autorise: false,
            message: 'Dashboard Structure d\'accueil réservé aux structures d\'accueil'
          };
        }
        return { autorise: true };

      case 'creer-projet':
        return this.peutCreerNouveauProjet(partenaire, 0);

      case 'voir-rapports':
        if (!this.peutVoirRapports(partenaire)) {
          return {
            autorise: false,
            message: 'Accès aux rapports détaillés non autorisé'
          };
        }
        return { autorise: true };

      default:
        return {
          autorise: false,
          message: `Fonctionnalité "${fonctionnalite}" non reconnue`
        };
    }
  }

  /**
   * Vérifie les permissions pour créer un projet
   */
  peutCreerNouveauProjet(partenaire: Partenaire, nombreProjetsActuels: number): { autorise: boolean; raison?: string } {
    if (!this.peutCreerProjets(partenaire)) {
      return {
        autorise: false,
        raison: 'Votre type de partenaire ne vous permet pas de créer des projets'
      };
    }

    // ✅ Plus de limite de projets - les partenaires peuvent créer autant de projets qu'ils veulent
    return { autorise: true };
  }

  // ============================================================================
  // INFORMATIONS ET AFFICHAGE
  // ============================================================================

  /**
   * Obtient les permissions complètes d'un partenaire
   */
  getPermissions(partenaire: Partenaire): PartenairePermissions {
    return partenaire?.permissions || this.getPermissionsParDefaut();
  }

  /**
   * Obtient le libellé du type de partenaire (premier type pour les multi-types)
   */
  getTypePartenaireLabel(partenaire: Partenaire): string {
    if (!partenaire?.typeStructures?.length) {
      return 'Non spécifié';
    }

    const typeLabels: { [key: string]: string } = {
      'Public-Administration': 'Administration Publique',
      'Public-Collectivite': 'Collectivité Territoriale',
      'SocieteCivile': 'Société Civile',
      'SecteurPrive': 'Secteur Privé',
      'PTF': 'Partenaire Technique et Financier',
      'InstitutionAcademique': 'Institution Académique'
    };

    const premierType = partenaire.typeStructures[0];
    return typeLabels[premierType] || premierType;
  }

  /**
   * Obtient les libellés de tous les types du partenaire
   */
  getTypePartenaireLabels(partenaire: Partenaire): string[] {
    if (!partenaire?.typeStructures) {
      return ['Non spécifié'];
    }

    const typeLabels: { [key: string]: string } = {
      'Public-Administration': 'Administration Publique',
      'Public-Collectivite': 'Collectivité Territoriale',
      'SocieteCivile': 'Société Civile',
      'SecteurPrive': 'Secteur Privé',
      'PTF': 'Partenaire Technique et Financier',
      'InstitutionAcademique': 'Institution Académique'
    };

    return partenaire.typeStructures.map(type => typeLabels[type] || type);
  }

  /**
   * Obtient la description du type de partenaire
   */
  getTypePartenaireDescription(partenaire: Partenaire): string {
    if (!partenaire?.typeStructures?.length) {
      return '';
    }

    const descriptions: { [key: string]: string } = {
      'Public-Administration': 'Ministères, agences gouvernementales et services publics',
      'Public-Collectivite': 'Communes, régions, départements et collectivités locales',
      'SocieteCivile': 'ONG, associations, fondations et organisations à but non lucratif',
      'SecteurPrive': 'Entreprises, startups et organisations commerciales',
      'PTF': 'Bailleurs de fonds, coopérations internationales et organisations de financement',
      'InstitutionAcademique': 'Universités, centres de recherche et établissements d\'enseignement'
    };

    const premierType = partenaire.typeStructures[0];
    return descriptions[premierType] || '';
  }

  /**
   * Génère un résumé des permissions pour l'affichage
   */
  getResumePermissions(partenaire: Partenaire): { label: string; value: boolean; description: string }[] {
    const permissions = this.getPermissions(partenaire);
    
    return [
      {
        label: 'Création de projets',
        value: permissions.peutCreerProjets,
        description: permissions.peutCreerProjets ? 
          'Peut soumettre des projets sans limitation' : 
          'Ne peut pas soumettre de projets'
      },
      {
        label: 'Gestion des volontaires',
        value: permissions.peutGererVolontaires,
        description: permissions.peutGererVolontaires ?
          'Peut gérer les affectations et suivre les volontaires' :
          'Accès en consultation seulement'
      },
      {
        label: 'Statistiques',
        value: permissions.peutVoirStatistiques,
        description: 'Accès aux tableaux de bord et indicateurs'
      },
      {
        label: 'Rapports détaillés',
        value: permissions.peutVoirRapports,
        description: 'Accès aux rapports analytiques avancés'
      },
      {
        label: 'Espace PTF',
        value: permissions.accesZonePTF,
        description: 'Accès à l\'espace dédié aux partenaires financiers'
      }
    ];
  }

  /**
   * Obtient un résumé des rôles du partenaire
   */
  getResumeRoles(partenaire: Partenaire): { role: string; description: string; actif: boolean }[] {
    if (!partenaire) {
      return [];
    }

    const roles = [];

    // Rôles principaux
    if (this.estPTF(partenaire)) {
      roles.push({
        role: 'Partenaire Technique et Financier',
        description: 'Finance et suit des projets, accès aux rapports détaillés',
        actif: true
      });
    }

    if (this.estStructureAccueil(partenaire)) {
      roles.push({
        role: 'Structure d\'Accueil',
        description: 'Crée et gère des projets, accueille des volontaires',
        actif: true
      });
    }

    // Types spécifiques
    partenaire.typeStructures?.forEach((type: TypeStructurePNVB) => {
      const configType = TYPES_STRUCTURE_PNVB.find(t => t.value === type);
      if (configType) {
        roles.push({
          role: configType.label,
          description: configType.description,
          actif: true
        });
      }
    });

    return roles;
  }

  /**
   * Obtient le rôle principal (pour l'affichage)
   */
  getRolePrincipal(partenaire: Partenaire): string {
    if (!partenaire?.typeStructures?.length) {
      return 'Partenaire';
    }

    // Priorité au PTF
    if (this.estPTF(partenaire)) {
      return 'Partenaire Technique et Financier';
    }

    // Sinon premier type
    return this.getTypePartenaireLabel(partenaire);
  }

  // ============================================================================
  // CONFIGURATION ET UTILITAIRES
  // ============================================================================

  /**
   * Vérifie si le partenaire a des rôles multiples
   */
  aRolesMultiples(partenaire: Partenaire): boolean {
    return partenaire?.typeStructures?.length > 1;
  }

  /**
   * Obtient la configuration des types de partenaires
   */
  getConfigurationTypes(): any[] {
    return TYPES_STRUCTURE_PNVB.map(type => ({
      value: type.value,
      label: type.label,
      description: type.description,
      peutCreerProjets: type.peutCreerProjets,
      permissions: this.getPermissionsPourType(type.value)
    }));
  }

  /**
   * Obtient les permissions pour un type de partenaire spécifique
   */
  private getPermissionsPourType(typeStructure: string): PartenairePermissions {
    const configType = TYPES_STRUCTURE_PNVB.find(t => t.value === typeStructure);
    
    if (!configType) {
      return this.getPermissionsParDefaut();
    }

    return {
      peutCreerProjets: configType.peutCreerProjets,
      peutGererVolontaires: configType.peutGererVolontaires,
      peutVoirStatistiques: configType.peutVoirStatistiques,
      peutVoirRapports: configType.peutVoirRapports,
      accesZonePTF: configType.accesZonePTF,
      permissionsParType: {
        [typeStructure]: {
          peutCreerProjets: configType.peutCreerProjets,
          peutGererVolontaires: configType.peutGererVolontaires,
          peutVoirStatistiques: configType.peutVoirStatistiques,
          peutVoirRapports: configType.peutVoirRapports,
          accesZonePTF: configType.accesZonePTF
        }
      }
    };
  }

  /**
   * Obtient les permissions par défaut (fallback)
   */
  private getPermissionsParDefaut(): PartenairePermissions {
    return {
      peutCreerProjets: true,
      peutGererVolontaires: true,
      peutVoirStatistiques: true,
      peutVoirRapports: false,
      accesZonePTF: false,
      permissionsParType: {}
    };
  }

  // ============================================================================
  // COMPATIBILITÉ (méthodes conservées pour la rétrocompatibilité)
  // ============================================================================

  /**
   * Vérifie si un partenaire a atteint sa limite de projets
   * @deprecated Plus de limite de projets
   */
  aAtteintLimiteProjets(partenaire: Partenaire, nombreProjetsActuels: number): boolean {
    return false; // Plus de limite
  }

  /**
   * Obtient le nombre de projets restants
   * @deprecated Plus de limite de projets
   */
  getProjetsRestants(partenaire: Partenaire, nombreProjetsActuels: number): number {
    return Infinity; // Pas de limite
  }
}