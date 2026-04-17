// src/app/features/admin/message-detail-dialog/message-detail-dialog.component.ts
import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Angular Material
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services et Modèles
import { ContactService } from '../../services/service_contact/contact.service';
import { ContactMessage, MessageStatus, MessagePriority } from '../../models/contact-message.model';

export interface MessageDetailDialogData {
  message: ContactMessage;
}

@Component({
  selector: 'app-message-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './message-detail-dialog.component.html',
  styleUrls: ['./message-detail-dialog.component.scss']
})
export class MessageDetailDialogComponent implements OnInit {
  messageForm: FormGroup;
  isSubmitting = false;

  // Utiliser inject() au lieu du constructeur pour MatDialogRef
  private dialogRef = inject(MatDialogRef<MessageDetailDialogComponent>);
  private fb = inject(FormBuilder);
  private contactService = inject(ContactService);

  statusOptions = [
    { value: MessageStatus.NEW, label: 'Nouveau' },
    { value: MessageStatus.IN_PROGRESS, label: 'En cours' },
    { value: MessageStatus.RESPONDED, label: 'Répondu' },
    { value: MessageStatus.CLOSED, label: 'Fermé' }
  ];

  priorityOptions = [
    { value: MessagePriority.LOW, label: 'Basse' },
    { value: MessagePriority.MEDIUM, label: 'Moyenne' },
    { value: MessagePriority.HIGH, label: 'Haute' },
    { value: MessagePriority.URGENT, label: 'Urgente' }
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MessageDetailDialogData
  ) {
    this.messageForm = this.createForm();
  }

  ngOnInit(): void {
    this.patchFormWithMessageData();
    
    // Marquer comme lu si c'est un nouveau message
    if (this.data.message.status === MessageStatus.NEW) {
      this.contactService.markAsRead(this.data.message.id).subscribe();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      status: ['', Validators.required],
      priority: ['', Validators.required],
      adminNotes: ['']
    });
  }

  private patchFormWithMessageData(): void {
    this.messageForm.patchValue({
      status: this.data.message.status,
      priority: this.data.message.priority,
      adminNotes: this.data.message.adminNotes || ''
    });
  }

  onSave(): void {
    if (this.messageForm.valid) {
      this.isSubmitting = true;

      const formData = this.messageForm.value;
      
      this.contactService.updateStatus(
        this.data.message.id, 
        formData.status, 
        formData.adminNotes
      ).subscribe({
        next: (updatedMessage) => {
          this.isSubmitting = false;
          this.dialogRef.close({ 
            refresh: true, 
            message: updatedMessage 
          });
        },
        error: (error) => {
          console.error('❌ Erreur mise à jour:', error);
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close({ refresh: false });
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
      [MessagePriority.LOW]: 'Basse',
      [MessagePriority.MEDIUM]: 'Moyenne',
      [MessagePriority.HIGH]: 'Haute',
      [MessagePriority.URGENT]: 'Urgente'
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
}