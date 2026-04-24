// src/app/features/admin/gest-projets/projets-form/projets-form.component.ts

import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProjectService } from '../../../services/service_projects/projects.service';
import { PartenaireService } from '../../../services/service_parten/partenaire.service';
import { Project, ProjectStatus, ProjectWorkflow } from '../../../models/projects.model';
import { Partenaire } from '../../../models/partenaire.model';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  standalone: true,
  selector: 'app-projets-form',
  templateUrl: './projets-form.component.html',
  styleUrls: ['./projets-form.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ]
})
export class ProjetsFormComponent implements OnInit {
  projectForm!: FormGroup;
  isEdit = false;
  projectId!: string;
  isLoading = false;

  partenaires: Partenaire[] = [];
  isLoadingPartenaires = true;

  regions = [
    'Bankui', 'Djôrô', 'Goulmou', 'Guiriko', 'Kadiogo', 'Kuilsé',
    'Liptako', 'Nando', 'Nakambé', 'Nazinon', 'Oubri', 'Sirba', 'Soum',
    'Tannounyan', 'Tapoa', 'Sourou', 'Yaadga'
  ];

  statuts: { value: ProjectStatus; label: string }[] = [
    { value: 'en_attente', label: 'En attente' },
    { value: 'actif', label: 'Actif' },
    { value: 'cloture', label: 'Clôturé' }
  ];

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private partenaireService: PartenaireService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ProjetsFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any = null
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadPartenaires();

    const idFromDialog = this.data?.id ? String(this.data.id) : null;
    const idFromRoute = this.route.snapshot.paramMap.get('id');
    
    this.projectId = idFromDialog ?? idFromRoute ?? '';

    if (this.projectId) {
      this.isEdit = true;
      this.loadProject(this.projectId);
    }
  }

  initForm(): void {
    this.projectForm = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(5)]],
      partenaireId: [null, Validators.required],
      regionAffectation: ['', Validators.required],
      statutProjet: ['en_attente', Validators.required],
      nombreVolontairesRequis: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      descriptionCourte: ['', [Validators.required, Validators.minLength(20)]],
      descriptionLongue: ['', [Validators.required, Validators.minLength(50)]],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      dateLimiteCandidature: ['', Validators.required],
      
      ville_commune: [''],
      domaineActivite: [''],
      type_mission: [''],
      avantagesVolontaire: [''],
      competences_requises: [''],
      conditions_particulieres: [''],
      contact_responsable: [''],
      email_contact: ['', Validators.email]
    });
  }

  loadPartenaires(): void {
    this.partenaireService.getAll().subscribe({
      next: (data: Partenaire[]) => {
        this.partenaires = data;
        this.isLoadingPartenaires = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement partenaires:', err);
        this.isLoadingPartenaires = false;
      }
    });
  }

  loadProject(id: string): void {
    this.isLoading = true;
    this.projectService.getProject(id).subscribe({
      next: (project: Project) => {
        if (!project) {
          this.snackBar.open('Projet introuvable !', 'Fermer', { duration: 3000 });
          this.goBack();
          return;
        }
        
        this.projectForm.patchValue({
          titre: project.titre,
          partenaireId: project.partenaireId,
          regionAffectation: project.regionAffectation,
          statutProjet: project.statutProjet,
          nombreVolontairesRequis: project.nombreVolontairesRequis,
          descriptionCourte: project.descriptionCourte,
          descriptionLongue: project.descriptionLongue,
          dateDebut: this.formatDateForInput(project.dateDebut),
          dateFin: this.formatDateForInput(project.dateFin),
          dateLimiteCandidature: this.formatDateForInput(project.dateLimiteCandidature),
          ville_commune: project.ville_commune || '',
          domaineActivite: project.domaineActivite || '',
          type_mission: project.type_mission || '',
          avantagesVolontaire: project.avantagesVolontaire || '',
          competences_requises: project.competences_requises || '',
          conditions_particulieres: project.conditions_particulieres || '',
          contact_responsable: project.contact_responsable || '',
          email_contact: project.email_contact || ''
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement projet:', err);
        this.snackBar.open('Erreur lors du chargement du projet', 'Fermer', { duration: 3000 });
        this.isLoading = false;
        this.goBack();
      }
    });
  }

  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    return dateString.split('T')[0];
  }

  // ✅ Validation des dates
  verifierDates(): void {
    const dateDebut = this.projectForm.get('dateDebut')?.value;
    const dateFin = this.projectForm.get('dateFin')?.value;
    const dateLimite = this.projectForm.get('dateLimiteCandidature')?.value;

    if (dateDebut && dateFin && new Date(dateFin) <= new Date(dateDebut)) {
      this.projectForm.get('dateFin')?.setErrors({ dateInvalide: true });
    } else {
      this.projectForm.get('dateFin')?.setErrors(null);
    }

    if (dateLimite && dateDebut && new Date(dateLimite) >= new Date(dateDebut)) {
      this.projectForm.get('dateLimiteCandidature')?.setErrors({ dateInvalide: true });
    } else {
      this.projectForm.get('dateLimiteCandidature')?.setErrors(null);
    }
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.markFormGroupTouched();
      this.snackBar.open('Veuillez corriger les erreurs dans le formulaire', 'Fermer', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const formValue = this.projectForm.value;

    const projectData: any = {
      titre: formValue.titre,
      partenaireId: formValue.partenaireId,
      regionAffectation: formValue.regionAffectation,
      nombreVolontairesRequis: formValue.nombreVolontairesRequis,
      descriptionCourte: formValue.descriptionCourte,
      descriptionLongue: formValue.descriptionLongue,
      dateDebut: formValue.dateDebut,
      dateFin: formValue.dateFin,
      dateLimiteCandidature: formValue.dateLimiteCandidature,
      ville_commune: formValue.ville_commune,
      domaineActivite: formValue.domaineActivite,
      type_mission: formValue.type_mission,
      avantagesVolontaire: formValue.avantagesVolontaire,
      competences_requises: formValue.competences_requises,
      conditions_particulieres: formValue.conditions_particulieres,
      contact_responsable: formValue.contact_responsable,
      email_contact: formValue.email_contact,
      updated_at: new Date().toISOString()
    };

    if (this.isEdit && this.projectId) {
      // ✅ MODIFICATION
      projectData.statutProjet = formValue.statutProjet;
      
      this.projectService.updateProject(this.projectId, projectData).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Projet modifié avec succès ✅', 'Fermer', { duration: 3000 });
          this.closeOrBack();
        },
        error: (err: any) => {
          this.isLoading = false;
          console.error('Erreur modification projet:', err);
          this.snackBar.open('Erreur lors de la modification du projet', 'Fermer', { duration: 3000 });
        }
      });
    } else {
      // ✅ CRÉATION
      this.projectService.createProject(projectData).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Projet créé avec succès ✅', 'Fermer', { duration: 3000 });
          this.closeOrBack();
        },
        error: (err: any) => {
          this.isLoading = false;
          console.error('Erreur création projet:', err);
          this.snackBar.open('Erreur lors de la création du projet', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.projectForm.controls).forEach(key => {
      const control = this.projectForm.get(key);
      control?.markAsTouched();
    });
  }

  closeOrBack(): void {
    if (this.dialogRef) {
      this.dialogRef.close(true);
    } else {
      this.goBack();
    }
  }

  goBack(): void {
    this.router.navigate(['/features/admin/projets']);
  }

  getStatusLabel(status: ProjectStatus): string {
    return ProjectWorkflow.getStatusLabel(status);
  }
}