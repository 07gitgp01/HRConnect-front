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
    MatProgressSpinnerModule
  ]
})
export class ProjetsFormComponent implements OnInit {
  projectForm!: FormGroup;
  isEdit = false;
  projectId!: number;
  isLoading = false;

  partenaires: Partenaire[] = [];
  isLoadingPartenaires = true;

  regions = [
    'Bankui', 'Djôrô', 'Goulmou', 'Guiriko', 'Kadiogo', 'Kuilsé',
    'Liptako', 'Nando', 'Nakambé', 'Nazinon', 'Oubri', 'Sirba', 'Soum',
    'Tannounyan', 'Tapoa', 'Sourou', 'Yaadga'
  ];

  // ✅ CORRECTION : Utiliser les 3 statuts simplifiés
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
    private dialogRef: MatDialogRef<ProjetsFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any = null
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadPartenaires();

    const idFromDialog = this.data && this.data.id ? Number(this.data.id) : null;
    const idFromRoute = this.route.snapshot.paramMap.get('id');
    const idFromRouteNumber = idFromRoute && !isNaN(Number(idFromRoute)) 
      ? Number(idFromRoute) 
      : null;

    this.projectId = idFromDialog ?? idFromRouteNumber ?? 0;

    if (this.projectId > 0) {
      this.isEdit = true;
      this.loadProject(this.projectId);
    }
  }

  initForm(): void {
    this.projectForm = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(5)]],
      partenaireId: [null, Validators.required],
      regionAffectation: ['', Validators.required],
      // ✅ CORRECTION : Par défaut 'en_attente' au lieu de 'soumis'
      statutProjet: ['en_attente', Validators.required],
      nombreVolontairesRequis: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      descriptionCourte: ['', [Validators.required, Validators.minLength(20)]],
      descriptionLongue: ['', [Validators.required, Validators.minLength(50)]],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      dateLimiteCandidature: ['', Validators.required],
      
      // Champs optionnels
      ville_commune: [''],
      domaineActivite: [''],
      type_mission: [''],
      avantagesVolontaire: [''],
      competences_requises: [''],
      conditions_particulieres: [''],
      contact_responsable: [''],
      email_contact: ['', Validators.email]
    });

    // Validation des dates
    this.projectForm.get('dateFin')?.setValidators([
      Validators.required,
      this.dateAfterStartValidator.bind(this)
    ]);

    this.projectForm.get('dateLimiteCandidature')?.setValidators([
      Validators.required,
      this.dateBeforeStartValidator.bind(this)
    ]);
  }

  // Validateur personnalisé pour date de fin après date de début
  private dateAfterStartValidator(): { [key: string]: any } | null {
    const startDate = this.projectForm?.get('dateDebut')?.value;
    const endDate = this.projectForm?.get('dateFin')?.value;
    
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return { 'dateFinBeforeStart': true };
    }
    return null;
  }

  // Validateur personnalisé pour date limite avant date de début
  private dateBeforeStartValidator(): { [key: string]: any } | null {
    const startDate = this.projectForm?.get('dateDebut')?.value;
    const deadline = this.projectForm?.get('dateLimiteCandidature')?.value;
    
    if (startDate && deadline && new Date(deadline) >= new Date(startDate)) {
      return { 'deadlineAfterStart': true };
    }
    return null;
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

  loadProject(id: number): void {
    this.isLoading = true;
    this.projectService.getProject(id).subscribe({
      next: (project: Project) => {
        if (!project) {
          alert("Projet introuvable !");
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
        alert('Erreur lors du chargement du projet');
        this.isLoading = false;
        this.goBack();
      }
    });
  }

  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    return dateString.split('T')[0];
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;

    const formValue = this.projectForm.value;
    
    // ✅ CORRECTION : Vérifier si c'est une création, on utilise la méthode soumettrePourValidation
    if (!this.isEdit) {
      // Pour une création, on passe d'abord par 'en_attente'
      this.creerProjetAvecSoumission(formValue);
    } else {
      // Pour une mise à jour, on garde la logique existante
      this.mettreAJourProjet(formValue);
    }
  }

  private creerProjetAvecSoumission(formValue: any): void {
    const projectData: Omit<Project, 'id'> = {
      titre: formValue.titre,
      partenaireId: formValue.partenaireId,
      regionAffectation: formValue.regionAffectation,
      // ✅ CORRECTION : Par défaut 'en_attente' pour les nouvelles créations
      statutProjet: 'en_attente',
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
      nombreVolontairesActuels: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.projectService.createProject(projectData).subscribe({
      next: (createdProject) => {
        this.isLoading = false;
        alert('Projet créé avec succès ✅');
        this.closeOrBack();
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Erreur création projet:', err);
        alert('Erreur lors de la création du projet');
      }
    });
  }

  private mettreAJourProjet(formValue: any): void {
    const projectData: Partial<Project> = {
      titre: formValue.titre,
      partenaireId: formValue.partenaireId,
      regionAffectation: formValue.regionAffectation,
      statutProjet: formValue.statutProjet,
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

    this.projectService.updateProject(this.projectId, projectData).subscribe({
      next: () => {
        this.isLoading = false;
        alert('Projet modifié avec succès ✅');
        this.closeOrBack();
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Erreur modification projet:', err);
        alert('Erreur lors de la modification du projet');
      }
    });
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

  // ✅ AJOUT : Méthode pour obtenir le libellé d'un statut
  getStatusLabel(status: ProjectStatus): string {
    return ProjectWorkflow.getStatusLabel(status);
  }
}