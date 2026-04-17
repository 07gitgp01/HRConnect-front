export interface Project {
  // ===== IDENTIFICATION =====
  id?: number | string;          // ✅ CORRIGÉ: supporte les IDs hex de json-server ("7f1a")
  titre: string;
  partenaireId?: number | string; // ✅ CORRIGÉ: optionnel + string | number

  // ===== DESCRIPTIF =====
  descriptionLongue: string;
  descriptionCourte: string;
  domaineActivite: string;
  competences_requises?: string;
  type_mission?: 'Education' | 'Santé' | 'Environnement' | 'Développement' | 'Urgence' | 'Autre';

  // ===== LOCALISATION =====
  regionAffectation: string;
  ville_commune: string;

  // ===== VOLONTAIRES =====
  nombreVolontairesRequis: number;
  nombreVolontairesActuels?: number;
  avantagesVolontaire?: string;

  // ===== DATES =====
  dateDebut: string;
  dateFin: string;
  dateLimiteCandidature: string;
  datePublication?: string;
  dateCloture?: string;

  // ===== STATUT SIMPLIFIÉ =====
  statutProjet: ProjectStatus;
  conditions_particulieres?: string;

  // ===== CONTACT =====
  contact_responsable?: string;
  email_contact?: string;

  // ===== MÉTADONNÉES =====
  created_at?: string;
  updated_at?: string;
  partenaire?: any;
}

export type ProjectStatus =
  | 'en_attente'
  | 'actif'
  | 'cloture';

export class ProjectWorkflow {
  private static readonly transitions: Record<ProjectStatus, ProjectStatus[]> = {
    'en_attente': ['actif', 'cloture'],
    'actif':      ['cloture'],
    'cloture':    []
  };

  static canChangeStatus(from: ProjectStatus, to: ProjectStatus): boolean {
    if (from === to) return true;
    const allowedTransitions = this.transitions[from];
    if (!allowedTransitions) return false;
    return allowedTransitions.includes(to);
  }

  static getPossibleTransitions(from: ProjectStatus): ProjectStatus[] {
    return this.transitions[from] || [];
  }

  static getStatusLabel(status: ProjectStatus): string {
    const labels: Record<ProjectStatus, string> = {
      'en_attente': 'En attente',
      'actif':      'Actif',
      'cloture':    'Clôturé'
    };
    return labels[status] || status;
  }

  static getStatusClass(status: ProjectStatus): string {
    const classes: Record<ProjectStatus, string> = {
      'en_attente': 'badge bg-warning text-dark',
      'actif':      'badge bg-success',
      'cloture':    'badge bg-secondary'
    };
    return classes[status] || 'badge bg-secondary';
  }

  static canBeEdited(status: ProjectStatus): boolean {
    return ['en_attente', 'actif'].includes(status);
  }

  static canAcceptApplications(status: ProjectStatus): boolean {
    return status === 'actif';
  }

  static isClosed(status: ProjectStatus): boolean {
    return status === 'cloture';
  }
}