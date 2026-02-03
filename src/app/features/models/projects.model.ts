// Version simplifiée avec statuts réduits
export interface Project {
  // ===== IDENTIFICATION =====
  id?: number;
  titre: string;
  partenaireId: number;
  
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
  avantagesVolontaire?: string; // Ex: "Logement, Transport, Repas"
  
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
  partenaire?: any; // Relation
}

// Statuts simplifiés - 3 statuts principaux
export type ProjectStatus = 
  | 'en_attente'      // En attente de validation
  | 'actif'           // Projet actif (accepté)
  | 'cloture';        // Projet clôturé

// Helper simplifié pour gérer les transitions de statut
export class ProjectWorkflow {
  // Transitions autorisées simplifiées
  private static readonly transitions: Record<ProjectStatus, ProjectStatus[]> = {
    'en_attente': ['actif', 'cloture'],
    'actif': ['cloture'],
    'cloture': [] // Statut final
  };
  
  static canChangeStatus(from: ProjectStatus, to: ProjectStatus): boolean {
    // Même statut = pas de changement mais pas une erreur
    if (from === to) return true;
    
    // Vérifier si la transition est autorisée
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
      'actif': 'Actif',
      'cloture': 'Clôturé'
    };
    return labels[status] || status;
  }
  
  static getStatusClass(status: ProjectStatus): string {
    const classes: Record<ProjectStatus, string> = {
      'en_attente': 'badge bg-warning text-dark',
      'actif': 'badge bg-success',
      'cloture': 'badge bg-secondary'
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