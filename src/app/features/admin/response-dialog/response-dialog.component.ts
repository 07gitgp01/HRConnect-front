// src/app/features/admin/response-dialog/response-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services et Modèles
import { ContactService } from '../../services/service_contact/contact.service';
import { EmailService } from '../..//services/service_email/email.service';
import { 
  ContactMessage, 
  ContactMessageResponse,
  ContactMessageResponseResult 
} from '../../models/contact-message.model';

export interface ResponseDialogData {
  message: ContactMessage;
}

@Component({
  selector: 'app-response-dialog',
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
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './response-dialog.component.html',
  styleUrls: ['./response-dialog.component.scss']
})
export class ResponseDialogComponent {
  responseForm: FormGroup;
  isSubmitting = false;

  constructor(
    public dialogRef: MatDialogRef<ResponseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ResponseDialogData,
    private fb: FormBuilder,
    private contactService: ContactService,
    private emailService: EmailService,
    private snackBar: MatSnackBar
  ) {
    this.responseForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      response: ['', [Validators.required, Validators.minLength(10)]],
      sendEmail: [true]
    });
  }

  onSend(): void {
    if (this.responseForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      const responseData: ContactMessageResponse = {
        id: this.data.message.id,
        response: this.responseForm.value.response,
        adminId: this.getCurrentAdminId(),
        sendEmail: this.responseForm.value.sendEmail
      };

      console.log('📤 Envoi de la réponse:', responseData);

      this.contactService.respondToMessage(this.data.message.id, responseData).subscribe({
        next: (result: ContactMessageResponseResult) => {
          this.isSubmitting = false;
          
          if (result.emailSent) {
            this.snackBar.open('✅ Réponse envoyée par email avec succès', 'Fermer', { 
              duration: 5000
            });
          } else if (result.emailError) {
            this.snackBar.open(`⚠️ Réponse enregistrée mais email non envoyé: ${result.emailError}`, 'Fermer', { 
              duration: 6000
            });
          } else {
            this.snackBar.open('✅ Réponse enregistrée', 'Fermer', { 
              duration: 3000
            });
          }
          
          this.dialogRef.close({ success: true, emailSent: result.emailSent });
        },
        error: (error) => {
          console.error('❌ Erreur envoi réponse:', error);
          this.isSubmitting = false;
          this.snackBar.open('❌ Erreur lors de l\'envoi de la réponse', 'Fermer', { 
            duration: 5000
          });
        }
      });
    } else {
      this.markFormGroupTouched(this.responseForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getEmailPreview(): string {
    if (this.responseForm.get('response')?.value && this.responseForm.get('sendEmail')?.value) {
      return this.emailService.generateEmailPreview(
        this.responseForm.get('response')?.value,
        this.data.message
      );
    }
    return '';
  }

  private getCurrentAdminId(): number {
    // À remplacer par la vraie valeur depuis AuthService
    return 1;
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

  // Getter pour faciliter l'accès au champ response
  get response() { return this.responseForm.get('response'); }
}