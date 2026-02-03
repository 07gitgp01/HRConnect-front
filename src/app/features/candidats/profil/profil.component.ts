import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/service_auth/auth.service';
import { User } from '../../models/user.model';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { Candidature } from '../../models/candidature.model';
import { Volontaire } from '../../models/volontaire.model';
import { VolontaireService } from '../../services/service_volont/volontaire.service';
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

  niveauxEtudes = [
    'Sans diplôme',
    'Bac',
    'Bac+2',
    'Licence',
    'Master',
    'Doctorat'
  ];

  domainesEtudes = [
    'Informatique',
    'Médecine',
    'Droit',
    'Commerce',
    'Ingénierie',
    'Éducation',
    'Autre'
  ];

  competencesList = [
    'Communication',
    'Leadership',
    'Travail d\'équipe',
    'Gestion de projet',
    'Numérique',
    'Langues étrangères',
    'Animation',
    'Sensibilisation'
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
    // CRÉER LE FORMULAIRE AVANT TOUTE CHOSE
    this.profilForm = this.createProfilForm();
    // INITIALISER LE FORMARRAY DES COMPÉTENCES IMMÉDIATEMENT
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

  private createProfilForm(): FormGroup {
    return this.fb.group({
      informationsPersonnelles: this.fb.group({
        nom: [{ value: '', disabled: true }],
        prenom: [{ value: '', disabled: true }],
        email: [{ value: '', disabled: true }],
        telephone: [{ value: '', disabled: true }],
        dateNaissance: [{ value: '', disabled: true }],
        nationalite: [{ value: '', disabled: true }],
        sexe: [{ value: '', disabled: true }]
      }),

      profil: this.fb.group({
        adresseResidence: ['', Validators.required],
        regionGeographique: ['', Validators.required],
        niveauEtudes: ['', Validators.required],
        domaineEtudes: ['', Validators.required],
        competences: this.fb.array([]), // Initialisé vide pour l'instant
        motivation: ['', [Validators.required, Validators.minLength(50)]],
        disponibilite: ['', Validators.required],
        typePiece: ['CNIB', [Validators.required]],
        numeroPiece: ['', [Validators.required, Validators.minLength(3)]],
        urlCV: ['', Validators.required],
        urlPieceIdentite: ['', Validators.required]
      })
    });
  }

  // MÉTHODE CRITIQUE : Initialiser le FormArray AVANT que le template ne l'utilise
  private initializeCompetencesFormArray(): void {
    const competencesArray = this.profilForm.get('profil.competences') as FormArray;
    // Vider le tableau s'il contient déjà des éléments
    competencesArray.clear();
    
    // Ajouter un contrôle pour chaque compétence (initialisé à false)
    this.competencesList.forEach(() => {
      competencesArray.push(this.fb.control(false));
    });
  }

  private setupTypePieceListener(): void {
    const typePieceControl = this.profilForm.get('profil.typePiece');
    if (typePieceControl) {
      typePieceControl.valueChanges.subscribe((value: 'CNIB' | 'PASSEPORT') => {
        this.typePieceSelectionne = value;
        this.updateNumeroPieceValidation();
      });
    }
  }

  private setupCompetencesListener(): void {
    const competencesArray = this.profilForm.get('profil.competences') as FormArray;
    if (competencesArray) {
      competencesArray.valueChanges.subscribe(() => {
        this.updateSelectedCompetences();
      });
    }
  }

  private updateNumeroPieceValidation(): void {
    const numeroPieceControl = this.profilForm.get('profil.numeroPiece');
    if (!numeroPieceControl) return;

    numeroPieceControl.setErrors(null);

    if (this.typePieceSelectionne === 'CNIB') {
      numeroPieceControl.setValidators([
        Validators.required,
        Validators.pattern(/^[0-9]{17}$/),
        Validators.minLength(17),
        Validators.maxLength(17)
      ]);
    } else {
      numeroPieceControl.setValidators([
        Validators.required,
        Validators.pattern(/^[A-Z0-9]{6,9}$/),
        Validators.minLength(6),
        Validators.maxLength(9)
      ]);
    }

    numeroPieceControl.updateValueAndValidity();
  }

  getLabelNumeroPiece(): string {
    return this.typePieceSelectionne === 'CNIB' ? 'NIP CNIB (17 chiffres) *' : 'Numéro de Passeport *';
  }

  getPlaceholderNumeroPiece(): string {
    return this.typePieceSelectionne === 'CNIB' ? 'Ex: 12345678901234567' : 'Ex: AB123456';
  }

  getNumeroPieceErrorMessage(): string {
    const control = this.profilForm.get('profil.numeroPiece');
    
    if (!control) return '';
    
    if (control.hasError('required')) {
      return this.typePieceSelectionne === 'CNIB' ? 'Le NIP CNIB est requis' : 'Le numéro de passeport est requis';
    }
    
    if (control.hasError('pattern') || control.hasError('minlength') || control.hasError('maxlength')) {
      if (this.typePieceSelectionne === 'CNIB') {
        if (control.hasError('minlength') || control.hasError('maxlength')) {
          return 'Le NIP CNIB doit contenir exactement 17 chiffres';
        }
        if (control.hasError('pattern')) {
          return 'Le NIP CNIB ne doit contenir que des chiffres';
        }
      } else {
        return 'Le numéro de passeport doit contenir 6 à 9 caractères (lettres majuscules et chiffres)';
      }
    }
    
    return '';
  }

  onCVSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.showMessage('Le fichier CV est trop volumineux (max 5MB)', 'error');
        return;
      }

      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        this.showMessage('Format de fichier CV non supporté. Utilisez PDF, DOC ou DOCX', 'error');
        return;
      }

      this.selectedCV = file;
      this.cvPreview = { name: file.name, size: file.size };
      this.profilForm.get('profil.urlCV')?.setValue(`uploads/cv_${Date.now()}_${file.name}`);
    }
  }

  removeCV(): void {
    this.selectedCV = null;
    this.cvPreview = null;
    this.profilForm.get('profil.urlCV')?.setValue('');
    const cvInput = document.querySelector('input[type="file"][accept*="pdf"]') as HTMLInputElement;
    if (cvInput) cvInput.value = '';
  }

  onDocumentIdentitySelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.showMessage('Le fichier est trop volumineux (max 5MB)', 'error');
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        this.showMessage('Format de fichier non supporté. Utilisez PDF, JPG, PNG, DOC ou DOCX', 'error');
        return;
      }

      this.selectedDocumentIdentity = file;
      this.documentIdentityPreview = { name: file.name, size: file.size };
      this.profilForm.get('profil.urlPieceIdentite')?.setValue(`uploads/identity_${Date.now()}_${file.name}`);
    }
  }

  removeDocumentIdentity(): void {
    this.selectedDocumentIdentity = null;
    this.documentIdentityPreview = null;
    this.profilForm.get('profil.urlPieceIdentite')?.setValue('');
    const docInput = document.querySelector('input[type="file"][accept*="jpg"]') as HTMLInputElement;
    if (docInput) docInput.value = '';
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onTypePieceChange(): void {
    const typePieceValue = this.profilForm.get('profil.typePiece')?.value;
    this.typePieceSelectionne = typePieceValue;
    this.updateNumeroPieceValidation();
    
    const numeroPieceControl = this.profilForm.get('profil.numeroPiece');
    if (numeroPieceControl) {
      numeroPieceControl.setValue('');
      numeroPieceControl.markAsUntouched();
    }
  }

  private loadUserData(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && this.isUserCandidat(currentUser)) {
      this.user = currentUser;
    } else {
      this.router.navigate(['/login']);
    }
  }

  private isUserCandidat(user: any): user is User & { volontaireId: number | string } {
    return user && user.role === 'candidat' && user.volontaireId !== undefined;
  }

  private loadVolontaireData(): void {
    const volontaireId = this.authService.getVolontaireId();
    if (volontaireId) {
      this.volontaireService.getVolontaire(volontaireId).subscribe({
        next: (volontaire) => {
          this.volontaire = volontaire;
          this.patchFormValues(volontaire);
        },
        error: (error) => {
          console.error('Erreur chargement profil volontaire:', error);
          this.showMessage('Erreur lors du chargement du profil', 'error');
        }
      });
    } else {
      this.showMessage('Aucun profil volontaire trouvé', 'error');
    }
  }

  private patchFormValues(volontaire: Volontaire): void {
    this.profilForm.get('informationsPersonnelles')?.patchValue({
      nom: volontaire.nom,
      prenom: volontaire.prenom,
      email: volontaire.email,
      telephone: volontaire.telephone,
      dateNaissance: this.formatDate(volontaire.dateNaissance),
      nationalite: volontaire.nationalite,
      sexe: volontaire.sexe
    });

    this.profilForm.get('profil')?.patchValue({
      adresseResidence: volontaire.adresseResidence || '',
      regionGeographique: volontaire.regionGeographique || '',
      niveauEtudes: volontaire.niveauEtudes || '',
      domaineEtudes: volontaire.domaineEtudes || '',
      motivation: volontaire.motivation || '',
      disponibilite: volontaire.disponibilite || '',
      urlCV: volontaire.urlCV || '',
      urlPieceIdentite: volontaire.urlPieceIdentite || '',
      typePiece: volontaire.typePiece || 'CNIB',
      numeroPiece: volontaire.numeroPiece || ''
    });

    this.typePieceSelectionne = volontaire.typePiece || 'CNIB';
    
    // Mettre à jour les compétences SÉCURISÉMENT
    if (volontaire.competences) {
      this.updateCompetencesFormArray(volontaire.competences);
    }
  }

  private updateCompetencesFormArray(competences: string[]): void {
    const competencesArray = this.profilForm.get('profil.competences') as FormArray;
    
    // Vérifier que le FormArray est correctement initialisé
    if (!competencesArray || competencesArray.length === 0) {
      console.warn('FormArray competences non initialisé, réinitialisation...');
      this.initializeCompetencesFormArray();
    }
    
    // Mettre à jour chaque contrôle avec la valeur appropriée
    this.competencesList.forEach((competence, index) => {
      const isSelected = Array.isArray(competences) && competences.includes(competence);
      const control = competencesArray.at(index);
      if (control) {
        control.setValue(isSelected);
      } else {
        console.error(`Contrôle à l'index ${index} non trouvé dans le FormArray`);
      }
    });
    
    this.updateSelectedCompetences();
  }

  private updateSelectedCompetences(): void {
    const competencesArray = this.profilForm.get('profil.competences') as FormArray;
    if (!competencesArray || competencesArray.length === 0) {
      this.selectedCompetences = [];
      return;
    }
    
    this.selectedCompetences = this.competencesList.filter((competence, index) => {
      const control = competencesArray.at(index);
      return control && control.value === true;
    });
  }

  getSelectedCompetences(): string[] {
    return this.selectedCompetences;
  }

  private loadCandidaturesStats(): void {
    const volontaireId = this.authService.getVolontaireId();
    if (volontaireId) {
      this.candidatureService.getAll().subscribe({
        next: (candidatures) => {
          const candidaturesVolontaire = candidatures.filter(c => {
            if (!c.volontaireId) return false;
            const cVolontaireId = c.volontaireId.toString();
            const userVolontaireId = volontaireId.toString();
            return cVolontaireId === userVolontaireId;
          });
          
          this.dernieresCandidatures = candidaturesVolontaire.slice(0, 5);
          this.calculateStats(candidaturesVolontaire);
        },
        error: (error) => {
          console.error('Erreur chargement candidatures:', error);
        }
      });
    }
  }

  private calculateStats(candidatures: Candidature[]): void {
    this.stats = {
      total: candidatures.length,
      en_attente: candidatures.filter(c => c.statut === 'en_attente').length,
      entretien: candidatures.filter(c => c.statut === 'entretien').length,
      acceptee: candidatures.filter(c => c.statut === 'acceptee').length,
      refusee: candidatures.filter(c => c.statut === 'refusee').length
    };
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    const profilGroup = this.profilForm.get('profil');
    
    if (this.isEditing) {
      profilGroup?.enable();
    } else {
      profilGroup?.disable();
      if (this.volontaire) {
        this.patchFormValues(this.volontaire);
      }
      this.selectedCV = null;
      this.cvPreview = null;
      this.selectedDocumentIdentity = null;
      this.documentIdentityPreview = null;
    }
  }

  onSubmit(): void {
    if (this.profilForm.get('profil')?.invalid) {
      this.showMessage('Veuillez corriger les erreurs dans le formulaire de profil', 'error');
      this.markProfilGroupTouched();
      return;
    }

    this.isLoading = true;
    const formData = this.profilForm.get('profil')?.value;
    const competences = this.getSelectedCompetences();

    const updateData: Volontaire = {
      ...this.volontaire!,
      adresseResidence: formData.adresseResidence,
      regionGeographique: formData.regionGeographique,
      niveauEtudes: formData.niveauEtudes,
      domaineEtudes: formData.domaineEtudes,
      competences: competences,
      motivation: formData.motivation,
      disponibilite: formData.disponibilite,
      urlCV: formData.urlCV,
      urlPieceIdentite: formData.urlPieceIdentite,
      typePiece: formData.typePiece,
      numeroPiece: formData.numeroPiece,
      updated_at: new Date().toISOString()
    };

    if (this.volontaire?.id) {
      this.simulateFileUpload().then(() => {
        this.volontaireService.updateVolontaire(this.volontaire!.id!, updateData).subscribe({
          next: (updatedVolontaire) => {
            this.isLoading = false;
            this.isEditing = false;
            this.volontaire = updatedVolontaire;
            this.showMessage('✅ Profil mis à jour avec succès !', 'success');
            this.profilForm.get('profil')?.disable();
            
            this.selectedCV = null;
            this.selectedDocumentIdentity = null;
            this.cvPreview = null;
            this.documentIdentityPreview = null;
            
            this.updateUserProfilStatus();
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Erreur mise à jour profil:', error);
            this.showMessage('❌ Erreur lors de la mise à jour du profil', 'error');
          }
        });
      }).catch(error => {
        this.isLoading = false;
        console.error('Erreur upload fichiers:', error);
        this.showMessage('❌ Erreur lors de l\'upload des fichiers', 'error');
      });
    }
  }

  private simulateFileUpload(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.selectedCV || this.selectedDocumentIdentity) {
          console.log('Upload simulé des fichiers');
          resolve();
        } else {
          resolve();
        }
      }, 1000);
    });
  }

  private updateUserProfilStatus(): void {
    if (this.user?.id && this.getProfilCompletion() === 100) {
      console.log('Profil marqué comme complet à 100%');
    }
  }

  private markProfilGroupTouched(): void {
    const profilGroup = this.profilForm.get('profil') as FormGroup;
    Object.keys(profilGroup.controls).forEach(key => {
      const control = profilGroup.get(key);
      control?.markAsTouched();
    });
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  }

  getProfilCompletion(): number {
    if (!this.volontaire) return 0;
    
    const requiredFields = [
      this.volontaire.adresseResidence,
      this.volontaire.regionGeographique,
      this.volontaire.niveauEtudes,
      this.volontaire.domaineEtudes,
      this.volontaire.motivation,
      this.volontaire.disponibilite,
      this.volontaire.urlCV,
      this.volontaire.urlPieceIdentite,
      this.volontaire.typePiece,
      this.volontaire.numeroPiece,
      this.volontaire.competences && this.volontaire.competences.length > 0
    ];

    const completedFields = requiredFields.filter(field => 
      field && (typeof field !== 'boolean' ? field.toString().length > 0 : field)
    ).length;

    return Math.round((completedFields / requiredFields.length) * 100);
  }

  isProfilComplet(): boolean {
    return this.getProfilCompletion() === 100;
  }

  navigateToCandidatures(): void {
    this.router.navigate(['/features/candidats/mes-candidatures']);
  }

  navigateToNouvelleCandidature(): void {
    if (this.isProfilComplet()) {
      this.router.navigate(['/features/candidats/projets']);
    } else {
      this.showMessage('Votre profil doit être complet à 100% pour pouvoir postuler', 'error');
    }
  }

  getCandidatureStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'entretien': 'Entretien',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée'
    };
    return labels[statut] || statut;
  }

  // Getters pour le template
  get informationsPersonnelles() { 
    return this.profilForm.get('informationsPersonnelles') as FormGroup; 
  }
  
  get profil() { 
    return this.profilForm.get('profil') as FormGroup; 
  }
  
  get competencesFormArray() { 
    return this.profil.get('competences') as FormArray; 
  }

  // Méthode utilitaire pour vérifier si le FormArray est prêt
  isCompetencesFormArrayReady(): boolean {
    const competencesArray = this.profilForm.get('profil.competences') as FormArray;
    return !!competencesArray && competencesArray.length > 0;
  }

  // Getters pour les validations
  get adresseResidence() { return this.profil.get('adresseResidence'); }
  get regionGeographique() { return this.profil.get('regionGeographique'); }
  get niveauEtudes() { return this.profil.get('niveauEtudes'); }
  get domaineEtudes() { return this.profil.get('domaineEtudes'); }
  get motivation() { return this.profil.get('motivation'); }
  get disponibilite() { return this.profil.get('disponibilite'); }
  get urlCV() { return this.profil.get('urlCV'); }
  get urlPieceIdentite() { return this.profil.get('urlPieceIdentite'); }
  get typePiece() { return this.profil.get('typePiece'); }
  get numeroPiece() { return this.profil.get('numeroPiece'); }
}