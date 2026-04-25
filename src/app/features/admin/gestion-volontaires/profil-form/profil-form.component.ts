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
import { MatDatepicker, MatDatepickerModule } from "@angular/material/datepicker";

import { VolontaireService } from '../../../services/service_volont/volontaire.service';
import { Volontaire } from '../../../models/volontaire.model';

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
  @Input() volontaireId?: string;
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
    if (this.volontaireId) {
      this.loadVolontaire();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['volontaireId'] && !changes['volontaireId'].firstChange) {
      if (this.volontaireId) {
        this.loadVolontaire();
      } else {
        this.resetForm();
      }
    }
  }

  private initForm() {
    this.profilForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      numeroPiece: ['', [Validators.required, Validators.pattern(/^[0-9]{17}$/)]],
      dateNaissance: ['', Validators.required],
      nationalite: ['Burkinabè', Validators.required],
      sexe: ['', Validators.required],
      adresseResidence: [''],
      regionGeographique: [''],
      niveauEtudes: [''],
      domaineEtudes: [''],
      competences: [''],
      motivation: [''],
      disponibilite: ['Temps plein'],
      typePiece: ['CNIB'],
      statut: ['Candidat', Validators.required]
    });
  }

  private resetForm() {
    this.profilForm.reset({
      nationalite: 'Burkinabè',
      statut: 'Candidat',
      disponibilite: 'Temps plein',
      typePiece: 'CNIB'
    });
    this.isEdit = false;
  }

  private loadVolontaire() {
    if (!this.volontaireId) return;
    
    this.isLoading = true;
    this.isEdit = true;
    
    this.volontaireService.getVolontaire(this.volontaireId).subscribe({
      next: (vol: Volontaire) => {
        console.log('📥 Volontaire chargé:', vol);
        const competencesStr = (vol.competences || []).join(', ');
        this.profilForm.patchValue({ 
          nom: vol.nom || '',
          prenom: vol.prenom || '',
          email: vol.email || '',
          telephone: vol.telephone || '',
          numeroPiece: vol.numeroPiece || '',
          dateNaissance: vol.dateNaissance || '',
          nationalite: vol.nationalite || 'Burkinabè',
          sexe: vol.sexe || '',
          adresseResidence: vol.adresseResidence || '',
          regionGeographique: vol.regionGeographique || '',
          niveauEtudes: vol.niveauEtudes || '',
          domaineEtudes: vol.domaineEtudes || '',
          competences: competencesStr,
          motivation: vol.motivation || '',
          disponibilite: vol.disponibilite || 'Temps plein',
          typePiece: vol.typePiece || 'CNIB',
          statut: vol.statut || 'Candidat'
        });
        console.log('📝 Statut chargé:', vol.statut);
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
    
    // ✅ Préparer les données à envoyer
    const dataToSend: any = {
      nom: raw.nom || '',
      prenom: raw.prenom || '',
      email: raw.email || '',
      telephone: raw.telephone || '',
      numeroPiece: raw.numeroPiece || '',
      dateNaissance: raw.dateNaissance || '',
      nationalite: raw.nationalite || 'Burkinabè',
      sexe: raw.sexe as 'M' | 'F',
      adresseResidence: raw.adresseResidence || '',
      regionGeographique: raw.regionGeographique || '',
      niveauEtudes: raw.niveauEtudes || '',
      domaineEtudes: raw.domaineEtudes || '',
      competences: String(raw.competences).split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0),
      motivation: raw.motivation || '',
      disponibilite: raw.disponibilite as 'Temps plein' | 'Temps partiel' || 'Temps plein',
      typePiece: raw.typePiece as 'CNIB' | 'PASSEPORT' || 'CNIB',
      statut: raw.statut || 'Candidat'  // ✅ INCLURE LE STATUT
    };

    console.log('📤 Envoi des données de mise à jour:', dataToSend);

    this.isSaving = true;

    if (this.isEdit && this.volontaireId) {
      // ✅ Utiliser updateVolontaire qui fait un PATCH
      this.volontaireService.updateVolontaire(this.volontaireId, dataToSend).subscribe({
        next: (result) => {
          console.log('✅ Mise à jour réussie, nouveau statut:', result.statut);
          this.snack.open('Profil mis à jour', 'OK', { duration: 2500 });
          this.isSaving = false;
          this.saved.emit();
        },
        error: (err: any) => {
          console.error('❌ Erreur mise à jour:', err);
          this.snack.open('Erreur lors de la mise à jour: ' + (err.message || err), 'Fermer', { duration: 3500 });
          this.isSaving = false;
        }
      });
    } else {
      // Création d'un nouveau volontaire
      const newVolontaire = {
        ...dataToSend,
        dateInscription: new Date().toISOString()
      };
      this.volontaireService.createVolontaire(newVolontaire as Omit<Volontaire, 'id'>).subscribe({
        next: (result) => {
          console.log('✅ Volontaire créé:', result);
          this.snack.open('Volontaire créé', 'OK', { duration: 2500 });
          this.isSaving = false;
          this.saved.emit();
        },
        error: (err: any) => {
          console.error('❌ Erreur création:', err);
          this.snack.open('Erreur lors de la création', 'Fermer', { duration: 3500 });
          this.isSaving = false;
        }
      });
    }
  }
}