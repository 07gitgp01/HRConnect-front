import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartenaireService } from '../../../services/service_parten/partenaire.service';
import {
  Partenaire,
  InscriptionPartenaire,
  TYPES_STRUCTURE_PNVB,
  DOMAINES_ACTIVITE,
  TypeStructurePNVB,
  PartenairePermissionsService
} from '../../../models/partenaire.model';

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
  // ✅ string | undefined — pas de cast +id
  partenaireId?: string;
  showPassword = false;

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

    // ✅ Garder l'ID comme string — ne pas caster en number
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.partenaireId = id;
      this.loadPartenaire(id);
    } else {
      this.generateTemporaryPassword();
    }
  }

  initializeForm(): void {
    this.partenaireForm = this.fb.group({
      nomStructure:             ['', [Validators.required, Validators.minLength(2)]],
      email:                    ['', [Validators.required, Validators.email]],
      telephone:                ['', Validators.required],
      adresse:                  ['', Validators.required],
      personneContactNom:       ['', Validators.required],
      personneContactEmail:     ['', [Validators.required, Validators.email]],
      personneContactTelephone: ['', Validators.required],
      personneContactFonction:  ['', Validators.required],
      typeStructures:           this.fb.array([], Validators.required),
      domaineActivite:          ['Éducation', Validators.required],
      siteWeb:                  [''],
      description:              ['', Validators.required],
      estActive:                [false],
      motDePasseTemporaire:     ['', this.isEdit ? [] : Validators.required],
    });

    if (!this.isEdit) {
      this.addTypeStructure('Public-Administration');
    }
  }

  // ─── FormArray helpers ────────────────────────────────────────────────────

  get typeStructuresArray(): FormArray {
    return this.partenaireForm.get('typeStructures') as FormArray;
  }

  addTypeStructure(type?: TypeStructurePNVB): void {
    this.typeStructuresArray.push(new FormControl(type || 'Public-Administration'));
  }

  removeTypeStructure(index: number): void {
    this.typeStructuresArray.removeAt(index);
  }

  onTypeStructureChange(event: any, index: number): void {
    this.typeStructuresArray.at(index).setValue(event.target.value as TypeStructurePNVB);
  }

  isTypeSelected(type: TypeStructurePNVB): boolean {
    return this.typeStructuresArray.controls.some(c => c.value === type);
  }

  getAvailableTypes(): any[] {
    return this.typesStructure.filter(t => !this.isTypeSelected(t.value));
  }

  getTypeLabel(typeValue: TypeStructurePNVB): string {
    return this.typesStructure.find(t => t.value === typeValue)?.label ?? typeValue;
  }

  // ─── Chargement ───────────────────────────────────────────────────────────

  // ✅ Accepte string | number
  loadPartenaire(id: string | number): void {
    this.partenaireService.getById(id).subscribe({
      next: (data) => {
        // Vider le FormArray
        while (this.typeStructuresArray.length !== 0) {
          this.typeStructuresArray.removeAt(0);
        }

        // Charger les types
        if (data.typeStructures?.length) {
          data.typeStructures.forEach((type: TypeStructurePNVB) => {
            this.addTypeStructure(type);
          });
        } else {
          const fallback = (data as any).typeStructure as TypeStructurePNVB;
          this.addTypeStructure(fallback || 'Public-Administration');
        }

        // Patch les autres champs
        this.partenaireForm.patchValue({
          nomStructure:             data.nomStructure,
          email:                    data.email,
          telephone:                data.telephone,
          adresse:                  data.adresse,
          personneContactNom:       data.personneContactNom,
          personneContactEmail:     data.personneContactEmail ?? data.email,
          personneContactTelephone: data.personneContactTelephone,
          personneContactFonction:  data.personneContactFonction,
          domaineActivite:          data.domaineActivite,
          siteWeb:                  data.siteWeb,
          description:              data.description,
          estActive:                data.estActive || data.compteActive,
        });

        // Mot de passe non obligatoire en édition
        this.partenaireForm.get('motDePasseTemporaire')?.clearValidators();
        this.partenaireForm.get('motDePasseTemporaire')?.updateValueAndValidity();
      },
      error: (err) => {
        console.error('Erreur chargement partenaire', err);
        alert('Erreur lors du chargement du partenaire');
      },
    });
  }

  // ─── Mot de passe ─────────────────────────────────────────────────────────

  generateTemporaryPassword(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.partenaireForm.get('motDePasseTemporaire')?.setValue(result);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  copyPassword(): void {
    const pwd = this.partenaireForm.get('motDePasseTemporaire')?.value;
    navigator.clipboard.writeText(pwd).then(() => {
      alert('Mot de passe copié dans le presse-papier !');
    });
  }

  // ─── Soumission ───────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.partenaireForm.invalid) {
      this.markFormGroupTouched();
      alert('Veuillez corriger les erreurs dans le formulaire.');
      return;
    }

    if (this.typeStructuresArray.length === 0) {
      alert('Veuillez sélectionner au moins un type de structure.');
      return;
    }

    if (this.isEdit && this.partenaireId) {
      this.submitEdit();
    } else {
      this.submitCreate();
    }
  }

  private submitEdit(): void {
    const formData = this.partenaireForm.value;

    // ✅ Recalculer les permissions si les types ont changé
    const permissions = PartenairePermissionsService.calculerPermissionsGlobales(
      formData.typeStructures as TypeStructurePNVB[]
    );

    const partenaireData: Partenaire = {
      ...formData,
      permissions,
      typesPrincipaux: formData.typeStructures, // rétro-compat
      mis_a_jour_le:   new Date().toISOString()
    };

    this.partenaireService.update(this.partenaireId!, partenaireData).subscribe({
      next: () => {
        alert('Partenaire modifié avec succès');
        this.router.navigate(['/features/admin/partenaires/']);
      },
      error: (err) => {
        console.error('Erreur modification partenaire', err);
        alert('Erreur lors de la modification du partenaire');
      }
    });
  }

  private submitCreate(): void {
    const inscriptionData: InscriptionPartenaire = this.partenaireForm.value;

    this.partenaireService.inscrirePartenaire(inscriptionData).subscribe({
      next: () => {
        alert(
          `Partenaire ajouté avec succès.\n\n` +
          `IMPORTANT : Le mot de passe temporaire est : ${inscriptionData.motDePasseTemporaire}\n\n` +
          `Copiez-le et envoyez-le manuellement au partenaire.`
        );
        this.router.navigate(['/features/admin/partenaires/']);
      },
      error: (err) => {
        console.error('Erreur création partenaire', err);
        alert('Erreur lors de la création du partenaire');
      }
    });
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────────

  private markFormGroupTouched(): void {
    Object.keys(this.partenaireForm.controls).forEach(key => {
      const control = this.partenaireForm.get(key);
      if (control instanceof FormArray) {
        control.controls.forEach(c => c.markAsTouched());
      } else {
        control?.markAsTouched();
      }
    });
  }

  // ─── Getters template ─────────────────────────────────────────────────────

  get nomStructure()             { return this.partenaireForm.get('nomStructure'); }
  get email()                    { return this.partenaireForm.get('email'); }
  get telephone()                { return this.partenaireForm.get('telephone'); }
  get adresse()                  { return this.partenaireForm.get('adresse'); }
  get personneContactNom()       { return this.partenaireForm.get('personneContactNom'); }
  get personneContactEmail()     { return this.partenaireForm.get('personneContactEmail'); }
  get personneContactTelephone() { return this.partenaireForm.get('personneContactTelephone'); }
  get personneContactFonction()  { return this.partenaireForm.get('personneContactFonction'); }
  get domaineActivite()          { return this.partenaireForm.get('domaineActivite'); }
  get description()              { return this.partenaireForm.get('description'); }
  get motDePasseTemporaire()     { return this.partenaireForm.get('motDePasseTemporaire'); }
}