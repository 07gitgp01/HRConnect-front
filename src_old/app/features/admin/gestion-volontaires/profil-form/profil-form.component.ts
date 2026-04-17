// src/app/features/admin/gestion-volontaires/profil-form/profil-form.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatOption } from "@angular/material/core";
import { MatSelectModule } from '@angular/material/select';

import { VolontaireService } from '../../../services/service_volont/volontaire.service';
import { Volontaire } from '../../../models/volontaire.model';
import { MatDatepicker, MatDatepickerModule } from "@angular/material/datepicker";

@Component({
  selector: 'app-profil-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatOption,
    MatSelectModule,
    MatDatepicker,
    MatDatepickerModule,

],
  templateUrl: './profil-form.component.html',
  styleUrls: ['./profil-form.component.css']
})
export class ProfilFormComponent implements OnInit, OnChanges {
  @Input() userId?: number;
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  profilForm!: FormGroup;
  isEdit = false;
  isLoading = false;
  isSaving = false;

  regions = [
    'Bankui', 'Djôrô', 'Goulmou', 'Guiriko', 'Kadiogo', 'Kuilsé', 
    'Liptako', 'Nando', 'Nakambé', 'Nazinon', 'Oubri', 'Sirba', 
    'Soum', 'Tannounyan', 'Tapoa', 'Sourou', 'Yaadga'
  ];

  niveauxEtudes = [
    'CEP', 'BEPC', 'BAC', 'BAC+2', 'Licence', 'Master', 'Doctorat'
  ];

  domainesEtudes = [
    'Éducation', 'Santé', 'Environnement', 'Agriculture', 'Informatique',
    'Administration', 'Ingénierie', 'Droit', 'Économie', 'Autre'
  ];

  disponibilites = ['Temps plein', 'Temps partiel'];

  private fb = inject(FormBuilder);
  private volontaireService = inject(VolontaireService);
  private snack = inject(MatSnackBar);

  ngOnInit(): void {
    this.initForm();
    if (this.userId) {
      this.loadVolontaire();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && !changes['userId'].firstChange) {
      if (this.userId) this.loadVolontaire();
      else this.resetForm();
    }
  }

  private initForm() {
  this.profilForm = this.fb.group({
    // Identité obligatoire
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    // REMPLACER nip par numeroPiece
    numeroPiece: ['', [Validators.required, Validators.pattern(/^[0-9]{17}$/)]],
    dateNaissance: ['', Validators.required],
    nationalite: ['Burkinabè', Validators.required],
    sexe: ['', Validators.required],
    
    // Profil à compléter
    adresseResidence: [''],
    regionGeographique: [''],
    niveauEtudes: [''],
    domaineEtudes: [''],
    competences: [''],
    motivation: [''],
    disponibilite: [''],
    typePiece: [''], // Ajouter typePiece si nécessaire
    
    // Statut PNVB
    statut: ['Candidat', Validators.required]
  });
}

  private resetForm() {
    this.profilForm.reset({
      nationalite: 'Burkinabè',
      statut: 'Candidat'
    });
    this.isEdit = false;
  }

  private loadVolontaire() {
    if (!this.userId) return;
    this.isLoading = true;
    this.isEdit = true;
    this.volontaireService.getVolontaire(this.userId).subscribe({
      next: (vol: Volontaire) => {
        const competencesStr = (vol.competences || []).join(', ');
        this.profilForm.patchValue({ 
          ...vol, 
          competences: competencesStr
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.snack.open('Erreur chargement du volontaire', 'Fermer', { duration: 3500 });
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.closed.emit();
  }

  submit(): void {
  if (this.profilForm.invalid) {
    this.profilForm.markAllAsTouched();
    this.snack.open('Veuillez corriger les champs en rouge', 'OK', { duration: 3000 });
    return;
  }

  const raw = this.profilForm.value;
  
  // Créer un objet Volontaire complet selon votre modèle
  const volont: Volontaire = {
    id: this.isEdit ? this.userId : undefined,
    // Identité obligatoire
    nom: raw.nom || '',
    prenom: raw.prenom || '',
    email: raw.email || '',
    telephone: raw.telephone || '',
    // REMPLACER nip par numeroPiece
    numeroPiece: raw.numeroPiece || '',
    dateNaissance: raw.dateNaissance || '',
    nationalite: raw.nationalite || 'Burkinabè',
    sexe: raw.sexe as 'M' | 'F',
    
    // Profil à compléter
    adresseResidence: raw.adresseResidence || '',
    regionGeographique: raw.regionGeographique || '',
    niveauEtudes: raw.niveauEtudes || '',
    domaineEtudes: raw.domaineEtudes || '',
    competences: String(raw.competences).split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0),
    motivation: raw.motivation || '',
    disponibilite: raw.disponibilite as 'Temps plein' | 'Temps partiel' || 'Temps plein',
    typePiece: raw.typePiece as 'CNIB' | 'PASSEPORT', // Ajouter typePiece
    
    // Statut PNVB
    statut: raw.statut || 'Candidat',
    
    // Dates importantes
    dateInscription: this.isEdit ? '' : new Date().toISOString()
  };

  // ... le reste du code reste identique
  this.isSaving = true;

  if (this.isEdit && this.userId) {
    this.volontaireService.updateVolontaire(this.userId, volont).subscribe({
      next: () => {
        this.snack.open('Profil mis à jour', 'OK', { duration: 2500 });
        this.isSaving = false;
        this.saved.emit();
      },
      error: (err: any) => {
        console.error(err);
        this.snack.open('Erreur lors de la mise à jour', 'Fermer', { duration: 3500 });
        this.isSaving = false;
      }
    });
  } else {
    this.volontaireService.createVolontaire(volont).subscribe({
      next: () => {
        this.snack.open('Volontaire créé', 'OK', { duration: 2500 });
        this.isSaving = false;
        this.saved.emit();
      },
      error: (err: any) => {
        console.error(err);
        this.snack.open('Erreur lors de la création', 'Fermer', { duration: 3500 });
        this.isSaving = false;
      }
    });
  }
}
}