import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/service_auth/auth.service';
import { User } from '../../models/user.model';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { Candidature } from '../../models/candidature.model';
import { Volontaire } from '../../models/volontaire.model';
import { VolontaireService, calculerCompletionProfil } from '../../services/service_volont/volontaire.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-profil-candidat',
  standalone: true,
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule]
})
export class ProfilCandidatComponent implements OnInit {
  profilForm: FormGroup;
  user: User | null = null;
  volontaire: Volontaire | null = null;
  isLoading = false;
  isEditing = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  typePieceSelectionne: 'CNIB' | 'PASSEPORT' = 'CNIB';

  selectedCV: File | null = null;
  cvPreview: { name: string; size: number } | null = null;
  selectedDocumentIdentity: File | null = null;
  documentIdentityPreview: { name: string; size: number } | null = null;

  stats = {
    total: 0,
    en_attente: 0,
    entretien: 0,
    acceptee: 0,
    refusee: 0
  };

  dernieresCandidatures: Candidature[] = [];

  niveauxEtudes = ['Sans diplôme', 'Bac', 'Bac+2', 'Licence', 'Master', 'Doctorat'];

  domainesEtudes = [
    'Informatique', 'Médecine', 'Droit', 'Commerce',
    'Ingénierie', 'Éducation', 'Autre'
  ];

  competencesList = [
    'Communication', 'Leadership', "Travail d'équipe",
    'Gestion de projet', 'Numérique', 'Langues étrangères',
    'Animation', 'Sensibilisation'
  ];

  regions = [
    'Adamaoua', 'Centre', 'Est', 'Extrême-Nord',
    'Littoral', 'Nord', 'Nord-Ouest', 'Ouest',
    'Sud', 'Sud-Ouest'
  ];

  selectedCompetences: string[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private candidatureService: CandidatureService,
    private volontaireService: VolontaireService,
    private router: Router
  ) {
    this.profilForm = this.createProfilForm();
    this.initializeCompetencesFormArray();
  }

  ngOnInit(): void {
    if (!this.authService.isCandidat()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUserData();
    this.loadVolontaireData();
    this.loadCandidaturesStats();
    this.setupTypePieceListener();
    this.setupCompetencesListener();
  }

  // ============================================================
  // FORMULAIRE
  // ============================================================

  private createProfilForm(): FormGroup {
    return this.fb.group({
      informationsPersonnelles: this.fb.group({
        nom:            [{ value: '', disabled: true }],
        prenom:         [{ value: '', disabled: true }],
        email:          [{ value: '', disabled: true }],
        telephone:      [{ value: '', disabled: true }],
        dateNaissance:  [{ value: '', disabled: true }],
        nationalite:    [{ value: '', disabled: true }],
        sexe:           [{ value: '', disabled: true }]
      }),

      profil: this.fb.group({
        adresseResidence:  ['', Validators.required],
        regionGeographique:['', Validators.required],
        niveauEtudes:      ['', Validators.required],
        domaineEtudes:     ['', Validators.required],
        competences:       this.fb.array([]),
        motivation:        ['', [Validators.required, Validators.minLength(50)]],
        disponibilite:     ['', Validators.required],
        typePiece:         ['CNIB', Validators.required],
        numeroPiece:       ['', [Validators.required, Validators.minLength(3)]],
        urlCV:             ['', Validators.required],
        urlPieceIdentite:  ['', Validators.required]
      })
    });
  }

  private initializeCompetencesFormArray(): void {
    const arr = this.profilForm.get('profil.competences') as FormArray;
    arr.clear();
    this.competencesList.forEach(() => arr.push(this.fb.control(false)));
  }

  private setupTypePieceListener(): void {
    this.profilForm.get('profil.typePiece')?.valueChanges.subscribe((value: 'CNIB' | 'PASSEPORT') => {
      this.typePieceSelectionne = value;
      this.updateNumeroPieceValidation();
    });
  }

  private setupCompetencesListener(): void {
    (this.profilForm.get('profil.competences') as FormArray)?.valueChanges.subscribe(() => {
      this.updateSelectedCompetences();
    });
  }

  private updateNumeroPieceValidation(): void {
    const ctrl = this.profilForm.get('profil.numeroPiece');
    if (!ctrl) return;
    ctrl.setErrors(null);

    ctrl.setValidators(
      this.typePieceSelectionne === 'CNIB'
        ? [Validators.required, Validators.pattern(/^[0-9]{17}$/), Validators.minLength(17), Validators.maxLength(17)]
        : [Validators.required, Validators.pattern(/^[A-Z0-9]{6,9}$/), Validators.minLength(6),  Validators.maxLength(9)]
    );
    ctrl.updateValueAndValidity();
  }

  getLabelNumeroPiece(): string {
    return this.typePieceSelectionne === 'CNIB' ? 'NIP CNIB (17 chiffres) *' : 'Numéro de Passeport *';
  }

  getPlaceholderNumeroPiece(): string {
    return this.typePieceSelectionne === 'CNIB' ? 'Ex: 12345678901234567' : 'Ex: AB123456';
  }

  getNumeroPieceErrorMessage(): string {
    const ctrl = this.profilForm.get('profil.numeroPiece');
    if (!ctrl) return '';
    if (ctrl.hasError('required')) {
      return this.typePieceSelectionne === 'CNIB' ? 'Le NIP CNIB est requis' : 'Le numéro de passeport est requis';
    }
    if (ctrl.hasError('pattern') || ctrl.hasError('minlength') || ctrl.hasError('maxlength')) {
      return this.typePieceSelectionne === 'CNIB'
        ? 'Le NIP CNIB doit contenir exactement 17 chiffres'
        : 'Le numéro de passeport : 6 à 9 caractères (lettres majuscules et chiffres)';
    }
    return '';
  }

  onTypePieceChange(): void {
    this.typePieceSelectionne = this.profilForm.get('profil.typePiece')?.value;
    this.updateNumeroPieceValidation();
    const ctrl = this.profilForm.get('profil.numeroPiece');
    if (ctrl) { ctrl.setValue(''); ctrl.markAsUntouched(); }
  }

  // ============================================================
  // FICHIERS
  // ============================================================

  onCVSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.showMessage('CV trop volumineux (max 5MB)', 'error'); return; }

    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { this.showMessage('Format CV non supporté. Utilisez PDF, DOC ou DOCX', 'error'); return; }

    this.selectedCV = file;
    this.cvPreview  = { name: file.name, size: file.size };
    this.profilForm.get('profil.urlCV')?.setValue(`uploads/cv_${Date.now()}_${file.name}`);
  }

  removeCV(): void {
    this.selectedCV = null;
    this.cvPreview  = null;
    this.profilForm.get('profil.urlCV')?.setValue('');
  }

  onDocumentIdentitySelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.showMessage('Fichier trop volumineux (max 5MB)', 'error'); return; }

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
                     'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { this.showMessage('Format non supporté. PDF, JPG, PNG, DOC ou DOCX', 'error'); return; }

    this.selectedDocumentIdentity    = file;
    this.documentIdentityPreview     = { name: file.name, size: file.size };
    this.profilForm.get('profil.urlPieceIdentite')?.setValue(`uploads/identity_${Date.now()}_${file.name}`);
  }

  removeDocumentIdentity(): void {
    this.selectedDocumentIdentity = null;
    this.documentIdentityPreview  = null;
    this.profilForm.get('profil.urlPieceIdentite')?.setValue('');
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ============================================================
  // CHARGEMENT DONNÉES
  // ============================================================

  private loadUserData(): void {
    const currentUser = this.authService.getCurrentUser();
    // ✅ accepte 'candidat' ET 'volontaire'
    if (currentUser && (currentUser.role === 'candidat' || currentUser.role === 'volontaire')) {
      this.user = currentUser;
    } else {
      this.router.navigate(['/login']);
    }
  }

  private loadVolontaireData(): void {
    const volontaireId = this.authService.getVolontaireId();
    if (!volontaireId) {
      this.showMessage('Aucun profil volontaire trouvé', 'error');
      return;
    }

    this.volontaireService.getVolontaire(volontaireId).subscribe({
      next: (volontaire) => {
        this.volontaire = volontaire;
        this.patchFormValues(volontaire);
      },
      error: (err) => {
        console.error('❌ Erreur chargement profil volontaire:', err);
        this.showMessage('Erreur lors du chargement du profil', 'error');
      }
    });
  }

  private patchFormValues(volontaire: Volontaire): void {
    this.profilForm.get('informationsPersonnelles')?.patchValue({
      nom:           volontaire.nom,
      prenom:        volontaire.prenom,
      email:         volontaire.email,
      telephone:     volontaire.telephone,
      dateNaissance: this.formatDate(volontaire.dateNaissance),
      nationalite:   volontaire.nationalite,
      sexe:          volontaire.sexe
    });

    this.profilForm.get('profil')?.patchValue({
      adresseResidence:   volontaire.adresseResidence   || '',
      regionGeographique: volontaire.regionGeographique || '',
      niveauEtudes:       volontaire.niveauEtudes       || '',
      domaineEtudes:      volontaire.domaineEtudes      || '',
      motivation:         volontaire.motivation         || '',
      disponibilite:      volontaire.disponibilite      || '',
      urlCV:              volontaire.urlCV              || '',
      urlPieceIdentite:   volontaire.urlPieceIdentite   || '',
      typePiece:          volontaire.typePiece          || 'CNIB',
      numeroPiece:        volontaire.numeroPiece        || ''
    });

    this.typePieceSelectionne = volontaire.typePiece || 'CNIB';
    if (volontaire.competences) this.updateCompetencesFormArray(volontaire.competences);
  }

  private updateCompetencesFormArray(competences: string[]): void {
    const arr = this.profilForm.get('profil.competences') as FormArray;
    if (!arr || arr.length === 0) this.initializeCompetencesFormArray();

    this.competencesList.forEach((comp, i) => {
      arr.at(i)?.setValue(Array.isArray(competences) && competences.includes(comp));
    });
    this.updateSelectedCompetences();
  }

  private updateSelectedCompetences(): void {
    const arr = this.profilForm.get('profil.competences') as FormArray;
    if (!arr || arr.length === 0) { this.selectedCompetences = []; return; }
    this.selectedCompetences = this.competencesList.filter((_, i) => arr.at(i)?.value === true);
  }

  getSelectedCompetences(): string[] {
    return this.selectedCompetences;
  }

  private loadCandidaturesStats(): void {
    const volontaireId = this.authService.getVolontaireId();
    if (!volontaireId) return;

    this.candidatureService.getAll().subscribe({
      next: (candidatures) => {
        const mine = candidatures.filter(c =>
          c.volontaireId?.toString() === volontaireId.toString()
        );
        this.dernieresCandidatures = mine.slice(0, 5);
        this.calculateStats(mine);
      },
      error: (err) => console.error('❌ Erreur candidatures:', err)
    });
  }

  private calculateStats(candidatures: Candidature[]): void {
    this.stats = {
      total:      candidatures.length,
      en_attente: candidatures.filter(c => c.statut === 'en_attente').length,
      entretien:  candidatures.filter(c => c.statut === 'entretien').length,
      acceptee:   candidatures.filter(c => c.statut === 'acceptee').length,
      refusee:    candidatures.filter(c => c.statut === 'refusee').length
    };
  }

  // ============================================================
  // ÉDITION & SOUMISSION
  // ============================================================

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    const grp = this.profilForm.get('profil');

    if (this.isEditing) {
      grp?.enable();
    } else {
      grp?.disable();
      if (this.volontaire) this.patchFormValues(this.volontaire);
      this.selectedCV = null; this.cvPreview = null;
      this.selectedDocumentIdentity = null; this.documentIdentityPreview = null;
    }
  }

  onSubmit(): void {
    if (this.profilForm.get('profil')?.invalid) {
      this.showMessage('Veuillez corriger les erreurs du formulaire', 'error');
      this.markProfilGroupTouched();
      return;
    }

    this.isLoading = true;
    const formData   = this.profilForm.get('profil')?.value;
    const competences = this.getSelectedCompetences();

    const updateData: Volontaire = {
      ...this.volontaire!,
      adresseResidence:   formData.adresseResidence,
      regionGeographique: formData.regionGeographique,
      niveauEtudes:       formData.niveauEtudes,
      domaineEtudes:      formData.domaineEtudes,
      competences:        competences,
      motivation:         formData.motivation,
      disponibilite:      formData.disponibilite,
      urlCV:              formData.urlCV,
      urlPieceIdentite:   formData.urlPieceIdentite,
      typePiece:          formData.typePiece,
      numeroPiece:        formData.numeroPiece,
      updated_at:         new Date().toISOString()
    };

    if (!this.volontaire?.id) return;

    this.simulateFileUpload().then(() => {
      this.volontaireService.updateVolontaire(this.volontaire!.id!, updateData).subscribe({
        next: (updated) => {
          this.isLoading  = false;
          this.isEditing  = false;
          this.volontaire = updated;
          this.showMessage('✅ Profil mis à jour avec succès !', 'success');
          this.profilForm.get('profil')?.disable();
          this.selectedCV = null; this.cvPreview = null;
          this.selectedDocumentIdentity = null; this.documentIdentityPreview = null;
        },
        error: (err) => {
          this.isLoading = false;
          console.error('❌ Erreur mise à jour profil:', err);
          this.showMessage('❌ Erreur lors de la mise à jour du profil', 'error');
        }
      });
    }).catch(() => {
      this.isLoading = false;
      this.showMessage('❌ Erreur lors de l\'upload des fichiers', 'error');
    });
  }

  private simulateFileUpload(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  private markProfilGroupTouched(): void {
    const grp = this.profilForm.get('profil') as FormGroup;
    Object.keys(grp.controls).forEach(key => grp.get(key)?.markAsTouched());
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message     = message;
    this.messageType = type;
    setTimeout(() => { this.message = ''; }, 5000);
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    try { return new Date(dateString).toLocaleDateString('fr-FR'); }
    catch { return dateString; }
  }

  // ============================================================
  // ✅ COMPLÉTION DU PROFIL — délègue à calculerCompletionProfil()
  //    exactement la même fonction que dans le dashboard et le service
  // ============================================================

  getProfilCompletion(): number {
    return calculerCompletionProfil(this.volontaire);
  }

  isProfilComplet(): boolean {
    return this.getProfilCompletion() >= 100;
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  navigateToCandidatures(): void {
    this.router.navigate(['/features/candidats/mes-candidatures']);
  }

  navigateToNouvelleCandidature(): void {
    if (this.isProfilComplet()) {
      this.router.navigate(['/features/candidats/projets']);
    } else {
      this.showMessage('Votre profil doit être complet à 100% pour postuler', 'error');
    }
  }

  getCandidatureStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      'en_attente': 'En attente',
      'entretien':  'Entretien',
      'acceptee':   'Acceptée',
      'refusee':    'Refusée'
    };
    return map[statut] || statut;
  }

  // ============================================================
  // GETTERS POUR LE TEMPLATE
  // ============================================================

  get informationsPersonnelles() { return this.profilForm.get('informationsPersonnelles') as FormGroup; }
  get profil()                   { return this.profilForm.get('profil') as FormGroup; }
  get competencesFormArray()     { return this.profil.get('competences') as FormArray; }

  isCompetencesFormArrayReady(): boolean {
    const arr = this.profilForm.get('profil.competences') as FormArray;
    return !!arr && arr.length > 0;
  }

  get adresseResidence()   { return this.profil.get('adresseResidence'); }
  get regionGeographique() { return this.profil.get('regionGeographique'); }
  get niveauEtudes()       { return this.profil.get('niveauEtudes'); }
  get domaineEtudes()      { return this.profil.get('domaineEtudes'); }
  get motivation()         { return this.profil.get('motivation'); }
  get disponibilite()      { return this.profil.get('disponibilite'); }
  get urlCV()              { return this.profil.get('urlCV'); }
  get urlPieceIdentite()   { return this.profil.get('urlPieceIdentite'); }
  get typePiece()          { return this.profil.get('typePiece'); }
  get numeroPiece()        { return this.profil.get('numeroPiece'); }
}