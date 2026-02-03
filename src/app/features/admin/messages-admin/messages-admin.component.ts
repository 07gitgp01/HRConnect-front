// src/app/features/admin/messages-admin/messages-admin.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

// Services
import { ContactService } from '../../services/service_contact/contact.service';
import { ContactMessage, MessageStatus, MessagePriority } from '../../models/contact-message.model';

// Dialogs
import { MessageDetailDialogComponent } from '../message-detail-dialog/message-detail-dialog.component';
import { ResponseDialogComponent } from '../response-dialog/response-dialog.component';

@Component({
  selector: 'app-messages-admin',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './messages-admin.component.html',
  styleUrls: ['./messages-admin.component.scss']
})
export class MessagesAdminComponent implements OnInit, OnDestroy {
  messages: ContactMessage[] = [];
  isLoading = true;
  stats: any = {};
  
  // Filtres
  filterForm: FormGroup;

  private destroy$ = new Subject<void>();

  // Rendez les enums accessibles au template
  MessageStatus = MessageStatus;
  MessagePriority = MessagePriority;

  // Colonnes du tableau
  displayedColumns: string[] = [
    'priority',
    'status',
    'fullName',
    'email',
    'subject',
    'createdAt',
    'actions'
  ];

  // Options de filtre
  statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: MessageStatus.NEW, label: 'Nouveaux' },
    { value: MessageStatus.IN_PROGRESS, label: 'En cours' },
    { value: MessageStatus.RESPONDED, label: 'Répondu' },
    { value: MessageStatus.CLOSED, label: 'Fermé' }
  ];

  priorityOptions = [
    { value: '', label: 'Toutes priorités' },
    { value: MessagePriority.URGENT, label: 'Urgent' },
    { value: MessagePriority.HIGH, label: 'Haute' },
    { value: MessagePriority.MEDIUM, label: 'Moyenne' },
    { value: MessagePriority.LOW, label: 'Basse' }
  ];

  // Injection des services
  private contactService = inject(ContactService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  constructor() {
    this.filterForm = this.createFilterForm();
  }

  ngOnInit(): void {
    this.loadMessages();
    this.loadStats();
    
    // Écouter les changements de filtres avec debounce
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });

    // Vérifier si un ID de message est passé dans les query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['messageId']) {
          const messageId = +params['messageId'];
          this.openMessageDetailById(messageId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createFilterForm(): FormGroup {
    return this.fb.group({
      status: [''],
      priority: [''],
      search: ['']
    });
  }

  loadMessages(): void {
    this.isLoading = true;
    
    const filter = {
      status: this.filterForm.value.status || undefined,
      priority: this.filterForm.value.priority || undefined,
      search: this.filterForm.value.search || undefined
    };

    this.contactService.getMessages(filter).subscribe({
      next: (response) => {
        this.messages = response.messages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement messages:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des messages', 'Fermer', { duration: 3000 });
      }
    });
  }

  loadStats(): void {
    this.contactService.getMessagesStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('❌ Erreur chargement stats:', error);
      }
    });
  }

  applyFilters(): void {
    this.loadMessages();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.loadMessages();
  }

  viewMessage(message: ContactMessage): void {
    // Ouvrir directement le dialog sans navigation
    this.openMessageDetailDialog(message);
  }

  openMessageDetailById(messageId: number): void {
    this.contactService.getMessage(messageId).subscribe({
      next: (message) => {
        this.openMessageDetailDialog(message);
        // Nettoyer les query params après ouverture
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { messageId: null },
          queryParamsHandling: 'merge'
        });
      },
      error: (error) => {
        console.error('❌ Erreur chargement message:', error);
        this.snackBar.open('Message non trouvé', 'Fermer', { duration: 3000 });
        // Nettoyer les query params en cas d'erreur
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { messageId: null },
          queryParamsHandling: 'merge'
        });
      }
    });
  }

  openMessageDetailDialog(message: ContactMessage): void {
    const dialogRef = this.dialog.open(MessageDetailDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { message },
      panelClass: 'message-detail-dialog',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.refresh) {
        this.loadMessages();
        this.loadStats();
      }
    });

    // Marquer comme lu si c'est un nouveau message
    if (message.status === MessageStatus.NEW) {
      this.contactService.markAsRead(message.id).subscribe({
        next: () => {
          message.status = MessageStatus.IN_PROGRESS;
          message.readAt = new Date().toISOString();
          this.loadStats();
        }
      });
    }
  }

  respondToMessage(message: ContactMessage): void {
    const dialogRef = this.dialog.open(ResponseDialogComponent, {
      width: '700px',
      data: { message },
      panelClass: 'response-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.loadMessages();
        this.loadStats();
        this.snackBar.open('Réponse envoyée avec succès', 'Fermer', { duration: 3000 });
      }
    });
  }

  updateStatus(message: ContactMessage, status: MessageStatus): void {
    this.contactService.updateStatus(message.id, status).subscribe({
      next: (updatedMessage) => {
        const index = this.messages.findIndex(m => m.id === message.id);
        if (index !== -1) {
          this.messages[index] = updatedMessage;
        }
        this.snackBar.open('Statut mis à jour', 'Fermer', { duration: 2000 });
        this.loadStats();
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour statut:', error);
        this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 3000 });
      }
    });
  }

  deleteMessage(message: ContactMessage): void {
    console.log('🔄 Tentative de suppression du message:', {
      id: message.id,
      nom: message.fullName,
      email: message.email
    });

    const confirmationMessage = `Êtes-vous sûr de vouloir supprimer définitivement le message de ${message.fullName} ?\n\nCette action est irréversible.`;

    if (confirm(confirmationMessage)) {
      this.contactService.deleteMessage(message.id).subscribe({
        next: () => {
          console.log('✅ Message supprimé avec succès:', message.id);
          
          // Mettre à jour le tableau local immédiatement
          this.messages = this.messages.filter(m => m.id !== message.id);
          
          // Recharger les statistiques
          this.loadStats();
          
          this.showSuccess('Message supprimé avec succès');
        },
        error: (error: any) => {
          console.error('❌ Erreur détaillée suppression:', {
            status: error.status,
            message: error.message,
            error: error.error
          });
          
          this.handleDeleteError(error);
        }
      });
    }
  }

  private handleDeleteError(error: any): void {
    let errorMessage = 'Erreur lors de la suppression du message';
    
    switch (error.status) {
      case 404:
        errorMessage = 'Message non trouvé. Il a peut-être déjà été supprimé.';
        // Recharger les messages pour synchroniser
        this.loadMessages();
        break;
      case 403:
        errorMessage = 'Vous n\'avez pas les permissions pour supprimer ce message.';
        break;
      case 500:
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        break;
      case 0:
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
        break;
      default:
        errorMessage = `Erreur ${error.status}: ${error.message || 'Erreur inconnue'}`;
        break;
    }
    
    this.showError(errorMessage);
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', { 
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', { 
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  getStatusBadgeClass(status: MessageStatus): string {
    switch (status) {
      case MessageStatus.NEW: return 'badge-new';
      case MessageStatus.IN_PROGRESS: return 'badge-in-progress';
      case MessageStatus.RESPONDED: return 'badge-responded';
      case MessageStatus.CLOSED: return 'badge-closed';
      default: return 'badge-default';
    }
  }

  getPriorityBadgeClass(priority: MessagePriority): string {
    switch (priority) {
      case MessagePriority.URGENT: return 'badge-urgent';
      case MessagePriority.HIGH: return 'badge-high';
      case MessagePriority.MEDIUM: return 'badge-medium';
      case MessagePriority.LOW: return 'badge-low';
      default: return 'badge-default';
    }
  }

  getStatusLabel(status: MessageStatus): string {
    const labels: { [key in MessageStatus]?: string } = {
      [MessageStatus.NEW]: 'Nouveau',
      [MessageStatus.IN_PROGRESS]: 'En cours',
      [MessageStatus.RESPONDED]: 'Répondu',
      [MessageStatus.CLOSED]: 'Fermé'
    };
    return labels[status] || status;
  }

  getPriorityLabel(priority: MessagePriority): string {
    const labels: { [key in MessagePriority]?: string } = {
      [MessagePriority.URGENT]: 'Urgent',
      [MessagePriority.HIGH]: 'Haute',
      [MessagePriority.MEDIUM]: 'Moyenne',
      [MessagePriority.LOW]: 'Basse'
    };
    return labels[priority] || priority;
  }

  getSubjectLabel(subject: string): string {
    const subjects: { [key: string]: string } = {
      'candidature': 'Candidature Volontaire',
      'candidature-urgente': 'Candidature Urgente',
      'projet-partenaire': 'Projet Partenaire',
      'question-generale': 'Question Générale',
      'probleme-technique': 'Problème Technique',
      'renseignement': 'Demande de Renseignements',
      'urgence': 'Situation Urgente',
      'autre': 'Autre'
    };
    return subjects[subject] || subject;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Méthode de test pour déboguer la suppression
  testDeleteConnection(): void {
    const testMessage = this.messages[0];
    if (!testMessage) {
      this.showError('Aucun message disponible pour le test');
      return;
    }

    console.log('🧪 Test de suppression pour le message:', testMessage.id);
    
    this.contactService.deleteMessage(testMessage.id).subscribe({
      next: () => {
        console.log('✅ Test réussi');
        this.showSuccess('Test de suppression réussi');
      },
      error: (error: any) => {
        console.error('❌ Test échoué - Erreur complète:', error);
        this.showError(`Test échoué: ${error.status} - ${error.message}`);
      }
    });
  }
}