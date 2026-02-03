// src/app/features/admin/components/candidature-form/candidature-form.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Candidature } from '../../../models/candidature.model';
import { Project } from '../../../models/projects.model';
import { CandidatureService } from '../../../services/service_candi/candidature.service';
import { VolontaireService } from '../../../services/service_volont/volontaire.service';
import { Volontaire } from '../../../models/volontaire.model';

@Component({
  selector: 'app-candidature-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './candidature-form.component.html',
  styleUrls: ['./candidature-form.component.css']
})
export class CandidatureFormComponent implements OnInit {
  candidatureForm: FormGroup;
  isEditing = false;
  projects: Project[] = [];
  volontaires: Volontaire[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CandidatureFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      candidature?: Candidature, 
      projects?: Project[],
      volontaires?: Volontaire[] 
    },
    private candidatureService: CandidatureService,
    private volontaireService: VolontaireService,
    private snackBar: MatSnackBar
  ) {
    this.candidatureForm = this.createForm();
    this.projects = data.projects || [];
    this.volontaires = data.volontaires || [];
  }

  ngOnInit(): void {
    this.isEditing = !!this.data.candidature;
    
    // Charger les volontaires si non fournis
    if (this.volontaires.length === 0) {
      this.loadVolontaires();
    }
    
    if (this.isEditing && this.data.candidature) {
      this.populateForm(this.data.candidature);
    }
  }

  loadVolontaires(): void {
    this.volontaireService.getVolontaires().subscribe({
      next: (volontaires) => {
        this.volontaires = volontaires;
      },
      error: (error) => {
        console.error('Erreur chargement volontaires:', error);
        this.snackBar.open('Erreur lors du chargement des volontaires', 'Fermer', { duration: 3000 });
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      // ✅ CORRECTION: Ajout du volontaireId
      volontaireId: ['', Validators.required],
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      typePiece: ['CNIB', Validators.required],
      numeroPiece: ['', Validators.required],
      poste_vise: ['', Validators.required],
      projectId: ['', Validators.required],
      lettre_motivation: [''],
      competences: [''],
      disponibilite: [''],
      niveau_experience: [''],
      statut: ['en_attente', Validators.required],
      date_entretien: ['']
    });

    // ✅ Écouter les changements du volontaire pour pré-remplir les infos
    this.candidatureForm.get('volontaireId')?.valueChanges.subscribe(volontaireId => {
      this.onVolontaireChange(volontaireId);
    });
  }

  onVolontaireChange(volontaireId: string | number): void {
    const volontaire = this.volontaires.find(v => v.id?.toString() === volontaireId.toString());
    if (volontaire) {
      this.candidatureForm.patchValue({
        prenom: volontaire.prenom,
        nom: volontaire.nom,
        email: volontaire.email,
        telephone: volontaire.telephone || '',
        typePiece: volontaire.typePiece || 'CNIB',
        numeroPiece: volontaire.numeroPiece || ''
      });
    }
  }

  populateForm(candidature: Candidature): void {
    this.candidatureForm.patchValue({
      volontaireId: candidature.volontaireId || '',
      prenom: candidature.prenom,
      nom: candidature.nom,
      email: candidature.email,
      telephone: candidature.telephone || '',
      typePiece: candidature.typePiece || 'CNIB',
      numeroPiece: candidature.numeroPiece || '',
      poste_vise: candidature.poste_vise,
      projectId: candidature.projectId,
      lettre_motivation: candidature.lettre_motivation || '',
      competences: this.formatCompetencesForInput(candidature.competences),
      disponibilite: candidature.disponibilite || '',
      niveau_experience: candidature.niveau_experience || '',
      statut: candidature.statut,
      date_entretien: candidature.date_entretien || ''
    });
  }

  private formatCompetencesForInput(competences: any): string {
    if (Array.isArray(competences)) {
      return competences.join(', ');
    }
    if (typeof competences === 'string') {
      return competences;
    }
    return '';
  }

  getProjectTitle(projectId: number): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.titre : 'Projet inconnu';
  }

  onSubmit(): void {
    if (this.candidatureForm.valid) {
      const formValue = this.candidatureForm.value;
      
      // ✅ CORRECTION: Formater les données selon le modèle
      const candidatureData: Candidature = {
        volontaireId: Number(formValue.volontaireId),
        projectId: Number(formValue.projectId),
        prenom: formValue.prenom.trim(),
        nom: formValue.nom.trim(),
        email: formValue.email.trim().toLowerCase(),
        telephone: formValue.telephone?.trim() || '',
        typePiece: formValue.typePiece,
        numeroPiece: formValue.numeroPiece.trim(),
        poste_vise: formValue.poste_vise.trim(),
        lettre_motivation: formValue.lettre_motivation?.trim() || '',
        competences: this.formatCompetencesForSave(formValue.competences),
        disponibilite: formValue.disponibilite || '',
        niveau_experience: formValue.niveau_experience || '',
        statut: formValue.statut,
        date_entretien: formValue.date_entretien || ''
      };

      if (this.isEditing && this.data.candidature?.id) {
        this.candidatureService.update(this.data.candidature.id, candidatureData).subscribe({
          next: () => {
            this.snackBar.open('Candidature modifiée avec succès', 'Fermer', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Erreur modification candidature:', error);
            this.snackBar.open('Erreur lors de la modification', 'Fermer', { duration: 3000 });
          }
        });
      } else {
        this.candidatureService.create(candidatureData).subscribe({
          next: () => {
            this.snackBar.open('Candidature créée avec succès', 'Fermer', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Erreur création candidature:', error);
            this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 3000 });
          }
        });
      }
    } else {
      this.markFormGroupTouched();
      this.snackBar.open('Veuillez corriger les erreurs dans le formulaire', 'Fermer', { duration: 3000 });
    }
  }

  private formatCompetencesForSave(competences: string): string[] {
    if (!competences || competences.trim() === '') {
      return [];
    }
    return competences
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.candidatureForm.controls).forEach(key => {
      this.candidatureForm.get(key)?.markAsTouched();
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}