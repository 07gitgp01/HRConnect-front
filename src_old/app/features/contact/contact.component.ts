// src/app/core/layout/contact/contact.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { ContactService } from '../../features/services/service_contact/contact.service';
import { 
  ContactMessageCreate, 
  MessagePriority,
  MessageStatus  // Ajoutez cet import
} from '../../features/models/contact-message.model';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent implements OnInit {
  contactForm: FormGroup;
  isSubmitting = false;

  // Sujets prédéfinis avec priorité associée
  contactSubjects = [
    { 
      value: 'candidature-urgente', 
      label: 'Candidature Volontaire - Urgente',
      priority: MessagePriority.HIGH
    },
    { 
      value: 'candidature', 
      label: 'Candidature Volontaire',
      priority: MessagePriority.MEDIUM
    },
    { 
      value: 'projet-partenaire', 
      label: 'Projet Partenaire',
      priority: MessagePriority.HIGH
    },
    { 
      value: 'question-generale', 
      label: 'Question Générale',
      priority: MessagePriority.LOW
    },
    { 
      value: 'probleme-technique', 
      label: 'Problème Technique',
      priority: MessagePriority.URGENT
    },
    { 
      value: 'renseignement', 
      label: 'Demande de Renseignements',
      priority: MessagePriority.LOW
    },
    { 
      value: 'urgence', 
      label: 'Situation Urgente',
      priority: MessagePriority.URGENT
    },
    { 
      value: 'autre', 
      label: 'Autre',
      priority: MessagePriority.LOW
    }
  ];

  contactInfo = {
    address: '11 CMS 323 Ouagadougou 11, Burkina Faso',
    phone: '(+226) 25 36 40 37 / 76',
    email: 'pnvb@fasovolontariat.bf',
    hours: 'Lun - Ven: 08h00 - 16h00',
    coordinates: {
      lat: 12.3714,
      lng: -1.5197
    }
  };

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private contactService: ContactService
  ) {
    this.contactForm = this.createContactForm();
  }

  ngOnInit(): void {
    console.log('📞 ContactComponent initialisé - Mode Base de Données');
  }

  private createContactForm(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]]
    });
  }

  get fullName() { return this.contactForm.get('fullName'); }
  get email() { return this.contactForm.get('email'); }
  get subject() { return this.contactForm.get('subject'); }
  get message() { return this.contactForm.get('message'); }

  onSubmit(): void {
    if (this.contactForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      const formData: ContactMessageCreate = {
        fullName: this.contactForm.value.fullName,
        email: this.contactForm.value.email,
        subject: this.contactForm.value.subject,
        message: this.contactForm.value.message
      };

      console.log('📤 Envoi du message vers la base de données:', formData);

      this.contactService.createMessage(formData).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          
          console.log('✅ Message enregistré avec ID:', response.id);
          
          this.snackBar.open('✅ Votre message a été envoyé avec succès ! Notre équipe vous répondra rapidement.', 'Fermer', {
            duration: 6000,
            panelClass: ['success-snackbar']
          });
          
          this.contactForm.reset();
          this.markFormGroupPristine(this.contactForm);
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('❌ Erreur lors de l\'envoi du message:', error);
          
          this.snackBar.open('❌ Une erreur est survenue. Veuillez réessayer.', 'Fermer', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.markFormGroupTouched(this.contactForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private markFormGroupPristine(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsPristine();
      control?.markAsUntouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.contactForm.get(fieldName);
    
    if (control?.hasError('required')) {
      return 'Ce champ est obligatoire';
    }
    
    if (control?.hasError('email')) {
      return 'Adresse email invalide';
    }
    
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength']?.requiredLength;
      return `Minimum ${requiredLength} caractères requis`;
    }
    
    if (control?.hasError('maxlength')) {
      const requiredLength = control.errors?.['maxlength']?.requiredLength;
      return `Maximum ${requiredLength} caractères autorisés`;
    }
    
    return 'Erreur de validation';
  }

  // Obtenir la priorité basée sur le sujet sélectionné
  getSelectedSubjectPriority(): MessagePriority {
    const selectedSubject = this.contactSubjects.find(
      subject => subject.value === this.subject?.value
    );
    return selectedSubject?.priority || MessagePriority.LOW;
  }

  openEmail(): void {
    window.location.href = `mailto:${this.contactInfo.email}`;
  }

  openPhone(): void {
    window.location.href = `tel:${this.contactInfo.phone.replace(/[^\d+]/g, '')}`;
  }

  openMap(): void {
    const url = `https://www.google.com/maps/search/?api=1&query=${this.contactInfo.coordinates.lat},${this.contactInfo.coordinates.lng}`;
    window.open(url, '_blank');
  }
}