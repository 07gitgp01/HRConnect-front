import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ParametresService, Parametres } from '../../services/service_parametre/parametres.service';
import { CommonModule } from '@angular/common';

// Modules Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  standalone: true,
  selector: 'app-parametres',
  templateUrl: './parametres.component.html',
  styleUrls: ['./parametres.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDividerModule
  ]
})
export class ParametresComponent implements OnInit {

  paramForm!: FormGroup;
  isLoading = true;

  constructor(private fb: FormBuilder, private paramService: ParametresService) {}

  ngOnInit(): void {
    this.paramForm = this.fb.group({
      app_name: [''],
      logo_url: [''],
      email_contact: [''],
      telephone: [''],
      adresse: [''],
      langue: ['fr'],
      theme: ['clair'],
      notifications: [true]
    });

    // Charger les paramètres depuis JSON server
    this.paramService.getParametres().subscribe({
      next: (data) => {
        if (data) {
          this.paramForm.patchValue(data);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des paramètres', err);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.paramForm.valid) {
      const updated: Parametres = this.paramForm.value;

      // json-server attend l'ID pour PUT
      this.paramService.updateParametres(updated).subscribe({
        next: () => alert('✅ Paramètres mis à jour avec succès !'),
        error: (err) => alert('❌ Erreur lors de la mise à jour : ' + err)
      });
    }
  }
}
