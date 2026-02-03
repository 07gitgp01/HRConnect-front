import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartenaireService } from '../../../services/service_parten/partenaire.service';
import { Partenaire, InscriptionPartenaire, TYPES_STRUCTURE_PNVB, DOMAINES_ACTIVITE, TypeStructurePNVB } from '../../../models/partenaire.model';

@Component({
  selector: 'app-partenaire-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './partenaires-form.component.html',
  styleUrls: ['./partenaires-form.component.css'],
})
export class PartenaireFormComponent implements OnInit {
  partenaireForm!: FormGroup;
  isEdit = false;
  partenaireId?: number;
  showPassword = false;

  // Types de partenaires disponibles (multiples)
  typesStructure = TYPES_STRUCTURE_PNVB;
  domainesActivite = DOMAINES_ACTIVITE;

  constructor(
    private fb: FormBuilder,
    private partenaireService: PartenaireService,
    private route: ActivatedRoute,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.partenaireId = +id;
      this.loadPartenaire(this.partenaireId);
    } else {
      this.generateTemporaryPassword();
    }
  }

  initializeForm(): void {
    this.partenaireForm = this.fb.group({
      // Informations de base
      nomStructure: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', Validators.required],
      adresse: ['', Validators.required],
      
      // Personne contact
      personneContactNom: ['', Validators.required],
      personneContactEmail: ['', [Validators.required, Validators.email]], // NOUVEAU CHAMP
      personneContactTelephone: ['', Validators.required],
      personneContactFonction: ['', Validators.required],
      
      // Types multiples avec FormArray
      typeStructures: this.fb.array([], Validators.required),
      domaineActivite: ['Éducation', Validators.required],
      
      // Site web
      siteWeb: [''],
      description: ['', Validators.required],
      
      // Statut
      estActive: [false],
      
      // Mot de passe
      motDePasseTemporaire: ['', this.isEdit ? [] : Validators.required],
    });

    // Ajouter un type par défaut pour la création
    if (!this.isEdit) {
      this.addTypeStructure('Public-Administration');
    }
  }

  // Getters pour les FormArrays
  get typeStructuresArray(): FormArray {
    return this.partenaireForm.get('typeStructures') as FormArray;
  }

  // Méthodes pour gérer les types multiples
  addTypeStructure(type?: TypeStructurePNVB): void {
    const typeValue = type || 'Public-Administration';
    this.typeStructuresArray.push(new FormControl(typeValue));
  }

  removeTypeStructure(index: number): void {
    this.typeStructuresArray.removeAt(index);
  }

  onTypeStructureChange(event: any, index: number): void {
    const selectedType = event.target.value as TypeStructurePNVB;
    this.typeStructuresArray.at(index).setValue(selectedType);
  }

  // Vérifier si un type est déjà sélectionné
  isTypeSelected(type: TypeStructurePNVB): boolean {
    return this.typeStructuresArray.controls.some(control => 
      control.value === type
    );
  }

  // Obtenir les types disponibles (non sélectionnés)
  getAvailableTypes(): any[] {
    return this.typesStructure.filter(type => 
      !this.isTypeSelected(type.value)
    );
  }

  // Obtenir le libellé d'un type
  getTypeLabel(typeValue: TypeStructurePNVB): string {
    const type = this.typesStructure.find(t => t.value === typeValue);
    return type ? type.label : typeValue;
  }

  loadPartenaire(id: number): void {
    this.partenaireService.getById(id).subscribe({
      next: (data) => {
        // Vider le FormArray existant
        while (this.typeStructuresArray.length !== 0) {
          this.typeStructuresArray.removeAt(0);
        }

        // Charger les types multiples depuis typeStructures
        if (data.typeStructures && data.typeStructures.length > 0) {
          data.typeStructures.forEach((type: TypeStructurePNVB) => {
            this.addTypeStructure(type);
          });
        } else {
          // Fallback pour l'ancien format
          const fallbackType = (data as any).typeStructure as TypeStructurePNVB;
          if (fallbackType) {
            this.addTypeStructure(fallbackType);
          } else {
            // Type par défaut si aucun type n'est trouvé
            this.addTypeStructure('Public-Administration');
          }
        }

        // Patch les autres valeurs
        this.partenaireForm.patchValue({
          nomStructure: data.nomStructure,
          email: data.email,
          telephone: data.telephone,
          adresse: data.adresse,
          personneContactNom: data.personneContactNom,
          personneContactEmail: data.personneContactEmail || data.email, // Fallback sur l'email principal
          personneContactTelephone: data.personneContactTelephone,
          personneContactFonction: data.personneContactFonction,
          domaineActivite: data.domaineActivite,
          siteWeb: data.siteWeb,
          description: data.description,
          estActive: data.estActive || data.compteActive,
        });

        // Retirer le validateur de mot de passe lors de l'édition
        this.partenaireForm.get('motDePasseTemporaire')?.clearValidators();
        this.partenaireForm.get('motDePasseTemporaire')?.updateValueAndValidity();
      },
      error: (err) => {
        console.error('Erreur chargement partenaire', err);
        alert('Erreur lors du chargement du partenaire');
      },
    });
  }

  /** Génère un mot de passe aléatoire côté client */
  generateTemporaryPassword(): void {
    const length = 12;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.partenaireForm.get('motDePasseTemporaire')?.setValue(result);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  copyPassword(): void {
    const password = this.partenaireForm.get('motDePasseTemporaire')?.value;
    navigator.clipboard.writeText(password).then(() => {
      alert('Mot de passe copié dans le presse-papier !');
    });
  }

  onSubmit() {
    if (this.partenaireForm.invalid) {
      this.markFormGroupTouched();
      alert('Veuillez corriger les erreurs dans le formulaire.');
      return;
    }

    // Validation : au moins un type doit être sélectionné
    if (this.typeStructuresArray.length === 0) {
      alert('Veuillez sélectionner au moins un type de structure.');
      return;
    }

    if (this.isEdit && this.partenaireId) {
      // Mise à jour d'un partenaire existant
      const partenaireData = this.partenaireForm.value;
      
      this.partenaireService.update(this.partenaireId, partenaireData).subscribe({
        next: () => {
          alert('Partenaire modifié avec succès');
          this.router.navigate(['/features/admin/partenaires/']);
        },
        error: (err) => {
          console.error('Erreur modification partenaire', err);
          alert('Erreur lors de la modification du partenaire');
        }
      });
    } else {
      // Création d'un nouveau partenaire
      const inscriptionData: InscriptionPartenaire = this.partenaireForm.value;
      
      this.partenaireService.inscrirePartenaire(inscriptionData).subscribe({
        next: () => {
          const message = `Partenaire ajouté avec succès.\n\nIMPORTANT : Le mot de passe temporaire est : ${inscriptionData.motDePasseTemporaire}\n\nCopiez-le et envoyez-le manuellement au partenaire.`;
          alert(message);
          this.router.navigate(['/features/admin/partenaires/']);
        },
        error: (err) => {
          console.error('Erreur création partenaire', err);
          alert('Erreur lors de la création du partenaire');
        }
      });
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.partenaireForm.controls).forEach(key => {
      const control = this.partenaireForm.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched();
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched();
          } else {
            arrayControl.markAsTouched();
          }
        });
      } else {
        control?.markAsTouched();
      }
    });
  }

  // Getters pour l'accès facile aux contrôles du formulaire
  get nomStructure() { return this.partenaireForm.get('nomStructure'); }
  get email() { return this.partenaireForm.get('email'); }
  get telephone() { return this.partenaireForm.get('telephone'); }
  get adresse() { return this.partenaireForm.get('adresse'); }
  get personneContactNom() { return this.partenaireForm.get('personneContactNom'); }
  get personneContactEmail() { return this.partenaireForm.get('personneContactEmail'); }
  get personneContactTelephone() { return this.partenaireForm.get('personneContactTelephone'); }
  get personneContactFonction() { return this.partenaireForm.get('personneContactFonction'); }
  get domaineActivite() { return this.partenaireForm.get('domaineActivite'); }
  get description() { return this.partenaireForm.get('description'); }
  get motDePasseTemporaire() { return this.partenaireForm.get('motDePasseTemporaire'); }
}