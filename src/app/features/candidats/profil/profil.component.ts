// src/app/features/candidats/profil/profil.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { AuthService } from '../../services/service_auth/auth.service';
import { User } from '../../models/user.model';
import { CandidatureService } from '../../services/service_candi/candidature.service';
import { Candidature } from '../../models/candidature.model';
import { Volontaire } from '../../models/volontaire.model';
import { VolontaireService, calculerCompletionProfil } from '../../services/service_volont/volontaire.service';
import { UploadService } from '../../services/upload.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../environment/environment';

@Component({
  selector: 'app-profil-candidat',
  standalone: true,
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule, MatTooltipModule]
})
export class ProfilCandidatComponent implements OnInit {
  profilForm: FormGroup;
  user: User | null = null;
  volontaire: Volontaire | null = null;
  isLoading = false;
  isEditing = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  selectedCV: File | null = null;
  cvPreview: { name: string; size: number } | null = null;
  selectedDocumentIdentity: File | null = null;
  documentIdentityPreview: { name: string; size: number } | null = null;

  stats = { total: 0, en_attente: 0, entretien: 0, acceptee: 0, refusee: 0 };
  dernieresCandidatures: Candidature[] = [];

  niveauxEtudes   = ['Sans diplôme', 'Bac', 'Bac+2', 'Licence', 'Master', 'Doctorat'];
  domainesEtudes  = ['Informatique', 'Médecine', 'Droit', 'Commerce', 'Ingénierie', 'Éducation', 'Autre'];
  competencesList = ['Communication', 'Leadership', "Travail d'équipe", 'Gestion de projet', 'Numérique', 'Langues étrangères', 'Animation', 'Sensibilisation'];
  regions = [
    'Boucle du Mouhoun', 'Cascades', 'Centre', 'Centre-Est', 'Centre-Nord',
    'Centre-Ouest', 'Centre-Sud', 'Est', 'Hauts-Bassins', 'Nord',
    'Plateau-Central', 'Sahel', 'Sud-Ouest'
  ];

  selectedCompetences: string[] = [];

  // ✅ Utiliser environment.apiUrl
  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private candidatureService: CandidatureService,
    private volontaireService: VolontaireService,
    private router: Router,
    private http: HttpClient,
    private uploadService: UploadService
  ) {
    this.profilForm = this.createProfilForm();
    this.initializeCompetencesFormArray();
  }

  ngOnInit(): void {
    if (!this.authService.isCandidat() && !this.authService.isVolontaire()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadUserData();
    this.loadVolontaireData();
    this.loadCandidaturesStats();
    this.setupCompetencesListener();
  }

  // ============================================================
  // FORMULAIRE
  // ============================================================

  private createProfilForm(): FormGroup {
    return this.fb.group({
      informationsPersonnelles: this.fb.group({
        nom:           [{ value: '', disabled: true }],
        prenom:        [{ value: '', disabled: true }],
        email:         [{ value: '', disabled: true }],
        telephone:     [{ value: '', disabled: true }],
        dateNaissance: [{ value: '', disabled: true }],
        nationalite:   [{ value: '', disabled: true }],
        sexe:          [{ value: '', disabled: true }],
        typePiece:     [{ value: '', disabled: true }],
        numeroPiece:   [{ value: '', disabled: true }]
      }),
      profil: this.fb.group({
        adresseResidence:   ['', Validators.required],
        regionGeographique: ['', Validators.required],
        niveauEtudes:       ['', Validators.required],
        domaineEtudes:      ['', Validators.required],
        competences:        this.fb.array([]),
        motivation:         ['', [Validators.required, Validators.minLength(50)]],
        disponibilite:      ['', Validators.required],
        urlCV:              ['', Validators.required],
        urlPieceIdentite:   ['', Validators.required]
      })
    });
  }

  private initializeCompetencesFormArray(): void {
    const arr = this.profilForm.get('profil.competences') as FormArray;
    arr.clear();
    this.competencesList.forEach(() => arr.push(this.fb.control(false)));
  }

  private setupCompetencesListener(): void {
    (this.profilForm.get('profil.competences') as FormArray)?.valueChanges.subscribe(() => {
      this.updateSelectedCompetences();
    });
  }

  // ============================================================
  // UPLOAD DE FICHIERS (CORRIGÉ - Utilise UploadService)
  // ============================================================

  /**
   * ✅ Upload réel d'un fichier vers le backend via UploadService
   */
  private async uploadFile(file: File, type: 'cv' | 'identity'): Promise<string> {
    const formData = new FormData();
    formData.append('fichier', file); // ✅ 'fichier' comme attendu par le backend
    
    return new Promise((resolve, reject) => {
      this.uploadService.uploadFile(file).subscribe({
        next: (event) => {
          if (event.type === 'complete') {
            console.log(`✅ ${type} uploadé:`, event.data.url);
            resolve(event.data.url);
          }
        },
        error: (error) => {
          console.error(`❌ Erreur upload ${type}:`, error);
          reject(error);
        }
      });
    });
  }

  onCVSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) { 
      this.showMessage('CV trop volumineux (max 5MB)', 'error'); 
      return; 
    }
    
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { 
      this.showMessage('Format non supporté. PDF, DOC ou DOCX', 'error'); 
      return; 
    }
    
    this.selectedCV = file;
    this.cvPreview  = { name: file.name, size: file.size };
  }

  removeCV(): void {
    this.selectedCV = null;
    this.cvPreview  = null;
  }

  onDocumentIdentitySelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) { 
      this.showMessage('Fichier trop volumineux (max 5MB)', 'error'); 
      return; 
    }
    
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { 
      this.showMessage('Format non supporté. PDF, JPG, PNG, DOC ou DOCX', 'error'); 
      return; 
    }
    
    this.selectedDocumentIdentity = file;
    this.documentIdentityPreview  = { name: file.name, size: file.size };
  }

  removeDocumentIdentity(): void {
    this.selectedDocumentIdentity = null;
    this.documentIdentityPreview  = null;
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ============================================================
  // OUVERTURE DES DOCUMENTS
  // ============================================================

  ouvrirDocument(url: string | undefined, type: 'cv' | 'identity'): void {
    if (!url) {
      this.showMessage(`Aucun ${type === 'cv' ? 'CV' : 'document'} trouvé`, 'error');
      return;
    }
    
    const fullUrl = this.uploadService.getFullUrl(url);
    console.log(`📄 Ouverture ${type}:`, fullUrl);
    window.open(fullUrl, '_blank');
  }

  verifierDocument(url: string | undefined, type: 'cv' | 'identity'): void {
    if (!url) {
      this.showMessage(`Aucun ${type === 'cv' ? 'CV' : 'document'} trouvé`, 'error');
      return;
    }
    
    this.uploadService.checkFileExists(url).subscribe({
      next: (exists) => {
        if (exists) {
          this.showMessage(`✅ ${type === 'cv' ? 'CV' : 'Document'} accessible`, 'success');
        } else {
          this.showMessage(`❌ ${type === 'cv' ? 'CV' : 'Document'} introuvable`, 'error');
        }
      }
    });
  }

  // ============================================================
  // CHARGEMENT DONNÉES
  // ============================================================

  private loadUserData(): void {
    const currentUser = this.authService.getCurrentUser();
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
      next:  v    => { 
        this.volontaire = v; 
        this.patchFormValues(v); 
      },
      error: ()   => this.showMessage('Erreur lors du chargement du profil', 'error')
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
      sexe:          volontaire.sexe,
      typePiece:     volontaire.typePiece   || '',
      numeroPiece:   volontaire.numeroPiece || ''
    });

    this.profilForm.get('profil')?.patchValue({
      adresseResidence:   volontaire.adresseResidence   || '',
      regionGeographique: volontaire.regionGeographique || '',
      niveauEtudes:       volontaire.niveauEtudes       || '',
      domaineEtudes:      volontaire.domaineEtudes      || '',
      motivation:         volontaire.motivation         || '',
      disponibilite:      volontaire.disponibilite      || '',
      urlCV:              volontaire.urlCV              || '',
      urlPieceIdentite:   volontaire.urlPieceIdentite   || ''
    });

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
    if (!arr || arr.length === 0) { 
      this.selectedCompetences = []; 
      return; 
    }
    this.selectedCompetences = this.competencesList.filter((_, i) => arr.at(i)?.value === true);
  }

  getSelectedCompetences(): string[] { 
    return this.selectedCompetences; 
  }

  private loadCandidaturesStats(): void {
    const volontaireId = this.authService.getVolontaireId();
    if (!volontaireId) return;

    this.candidatureService.getAll().subscribe({
      next: candidatures => {
        const mine = candidatures.filter(c => c.volontaireId?.toString() === volontaireId.toString());
        this.dernieresCandidatures = mine.slice(0, 5);
        this.stats = {
          total:      mine.length,
          en_attente: mine.filter(c => c.statut === 'en_attente').length,
          entretien:  mine.filter(c => c.statut === 'entretien').length,
          acceptee:   mine.filter(c => c.statut === 'acceptee').length,
          refusee:    mine.filter(c => c.statut === 'refusee').length
        };
      },
      error: err => console.error('❌ Erreur candidatures:', err)
    });
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
      this.selectedCV = null; 
      this.cvPreview = null;
      this.selectedDocumentIdentity = null; 
      this.documentIdentityPreview = null;
    }
  }

  async onSubmit(): Promise<void> {
  if (!this.volontaire?.id) return;

  this.isLoading = true;
  this.message = '';
  
  try {
    // Récupérer les valeurs du formulaire
    const formValues = this.profilForm.get('profil')?.value;
    
    // Préparer les données à envoyer
    const donneesASauvegarder: any = {};
    
    // Ajouter les champs texte
    if (formValues.adresseResidence) donneesASauvegarder.adresseResidence = formValues.adresseResidence;
    if (formValues.regionGeographique) donneesASauvegarder.regionGeographique = formValues.regionGeographique;
    if (formValues.niveauEtudes) donneesASauvegarder.niveauEtudes = formValues.niveauEtudes;
    if (formValues.domaineEtudes) donneesASauvegarder.domaineEtudes = formValues.domaineEtudes;
    if (formValues.motivation) donneesASauvegarder.motivation = formValues.motivation;
    if (formValues.disponibilite) donneesASauvegarder.disponibilite = formValues.disponibilite;
    
    // Ajouter les compétences
    const selectedCompetences = this.getSelectedCompetences();
    if (selectedCompetences.length > 0) {
      donneesASauvegarder.competences = selectedCompetences;
    }
    
    // Upload du CV si sélectionné
    if (this.selectedCV) {
      const url = await this.uploadFile(this.selectedCV, 'cv');
      donneesASauvegarder.urlCV = url;
      console.log('✅ CV uploadé:', url);
    } else if (this.volontaire?.urlCV) {
      // Garder l'URL existante si pas de nouveau fichier
      donneesASauvegarder.urlCV = this.volontaire.urlCV;
    }
    
    // Upload de la pièce d'identité si sélectionnée
    if (this.selectedDocumentIdentity) {
      const url = await this.uploadFile(this.selectedDocumentIdentity, 'identity');
      donneesASauvegarder.urlPieceIdentite = url;
      console.log('✅ Pièce d\'identité uploadée:', url);
    } else if (this.volontaire?.urlPieceIdentite) {
      // Garder l'URL existante si pas de nouveau fichier
      donneesASauvegarder.urlPieceIdentite = this.volontaire.urlPieceIdentite;
    }
    
    console.log('📤 Envoi au backend:', JSON.stringify(donneesASauvegarder, null, 2));
    
    // Envoyer au backend
    const updated = await lastValueFrom(
      this.volontaireService.mettreAJourProfil(this.volontaire.id, donneesASauvegarder)
    );
    
    console.log('✅ Réponse backend:', updated);
    
    // Mettre à jour l'objet local
    this.volontaire = updated;
    
    // Rafraîchir l'affichage
    this.patchFormValues(updated);
    
    this.isEditing = false;
    this.profilForm.get('profil')?.disable();
    
    // Nettoyer
    this.selectedCV = null;
    this.cvPreview = null;
    this.selectedDocumentIdentity = null;
    this.documentIdentityPreview = null;
    
    this.showMessage('✅ Profil sauvegardé avec succès !', 'success');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    this.showMessage('❌ Erreur lors de la sauvegarde: ' + (error as Error).message, 'error');
  } finally {
    this.isLoading = false;
  }
}

  private markProfilGroupTouched(): void {
    const grp = this.profilForm.get('profil') as FormGroup;
    Object.keys(grp.controls).forEach(key => grp.get(key)?.markAsTouched());
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message     = message;
    this.messageType = type;
    setTimeout(() => { this.message = ''; }, 6000);
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    try { 
      return new Date(dateString).toLocaleDateString('fr-FR'); 
    } catch { 
      return dateString; 
    }
  }

  // ============================================================
  // COMPLÉTION DU PROFIL
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
    const labels: Record<string, string> = {
      en_attente: 'En attente',
      entretien:  'Entretien',
      acceptee:   'Acceptée',
      refusee:    'Refusée'
    };
    return labels[statut] || statut;
  }

  // ============================================================
  // GETTERS TEMPLATE
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
}