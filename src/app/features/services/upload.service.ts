// src/app/core/services/upload.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError, of } from 'rxjs';
import { environment } from '../environment/environment';

export interface UploadProgress {
  type: 'progress';
  progress: number;
}

export interface UploadComplete {
  type: 'complete';
  data: {
    success: boolean;
    url: string;
    nom: string;
    taille: number;
    message?: string;
  };
}

export type UploadEvent = UploadProgress | UploadComplete | { type: 'error'; message: string };

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  
  // ✅ URL pour les API (ex: http://localhost:8080/api)
  private apiUrl = environment.apiUrl;
  
  // ✅ URL de base du backend (sans /api) pour les fichiers statiques
  private backendBaseUrl = this.apiUrl.replace('/api', '');
  
  constructor(private http: HttpClient) {
    console.log('📡 UploadService initialisé');
    console.log('  API URL:', this.apiUrl);
    console.log('  Backend Base URL:', this.backendBaseUrl);
  }
  
  /**
   * 📤 Upload un fichier vers le backend Spring Boot
   * POST http://localhost:8080/api/upload
   */
  uploadFile(file: File): Observable<UploadEvent> {
    const validationError = this.validateFile(file);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }
    
    const formData = new FormData();
    formData.append('fichier', file);
    
    console.log('📤 Upload du fichier:', file.name);
    console.log('  URL:', `${this.apiUrl}/upload`);
    
    const req = new HttpRequest('POST', `${this.apiUrl}/upload`, formData, {
      reportProgress: true
    });
    
    return this.http.request(req).pipe(
      map(event => this.handleUploadEvent(event)),
      catchError(error => {
        console.error('❌ Erreur upload:', error);
        return throwError(() => new Error('Erreur lors de l\'upload du fichier'));
      })
    );
  }
  
  /**
   * 📊 Traite les événements d'upload
   */
  private handleUploadEvent(event: HttpEvent<any>): UploadEvent {
    switch (event.type) {
      case HttpEventType.UploadProgress:
        if (event.total) {
          const progress = Math.round(100 * event.loaded / event.total);
          return { type: 'progress', progress };
        }
        return { type: 'progress', progress: 0 };
        
      case HttpEventType.Response:
        console.log('✅ Réponse backend reçue:', event.body);
        return { 
          type: 'complete', 
          data: event.body || {
            success: true,
            url: `/uploads/rapports-ptf/${event.body?.nom || 'fichier'}`,
            nom: event.body?.nom || 'document',
            taille: event.body?.taille || 0,
            message: 'Upload réussi'
          }
        };
        
      default:
        return { type: 'progress', progress: 0 };
    }
  }
  
  /**
   * 🔍 Valide le fichier
   */
  private validateFile(file: File): string | null {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return `Le fichier ne doit pas dépasser 5 MB (taille actuelle: ${this.formatFileSize(file.size)})`;
    }
    
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.odt'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      return 'Type de fichier non supporté. Utilisez PDF, DOC, DOCX, JPG, PNG ou ODT';
    }
    
    return null;
  }
  
  /**
   * 📥 Télécharge un fichier depuis le backend
   * GET http://localhost:8080/uploads/rapports-ptf/uuid.pdf
   */
  downloadFile(url: string, filename?: string): Observable<Blob> {
    const fullUrl = this.getFullUrl(url);
    console.log('📥 Téléchargement du fichier:', filename || url);
    console.log('  URL:', fullUrl);
    
    return this.http.get(fullUrl, { 
      responseType: 'blob',
      headers: new HttpHeaders({
        'Accept': 'application/octet-stream'
      })
    }).pipe(
      catchError(error => {
        console.error('❌ Erreur téléchargement:', error);
        console.error('  URL qui a échoué:', fullUrl);
        return throwError(() => new Error('Impossible de télécharger le fichier'));
      })
    );
  }
  
  /**
   * 🔗 Construit l'URL complète vers le backend pour les fichiers statiques
   * ✅ CORRECTION: Gère les anciens chemins /uploads/rapports/
   */
  getFullUrl(url: string): string {
    if (!url) return '';
    
    // Déjà une URL absolue
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Nettoyer l'URL: s'assurer qu'elle commence par /
    let cleanUrl = url.startsWith('/') ? url : '/' + url;
    
    // ✅ CORRECTION IMPORTANTE: Remplacer /uploads/rapports/ par /uploads/rapports-ptf/
    if (cleanUrl.includes('/uploads/rapports/') && !cleanUrl.includes('/uploads/rapports-ptf/')) {
      const oldUrl = cleanUrl;
      cleanUrl = cleanUrl.replace('/uploads/rapports/', '/uploads/rapports-ptf/');
      console.log('🔧 URL corrigée (compatibilité):', oldUrl, '→', cleanUrl);
    }
    
    // ✅ URL finale: http://localhost:8080/uploads/rapports-ptf/uuid.pdf
    const fullUrl = `${this.backendBaseUrl}${cleanUrl}`;
    
    console.log('🔗 Construction URL:', {
      originale: url,
      nettoyee: cleanUrl,
      backendBase: this.backendBaseUrl,
      finale: fullUrl
    });
    
    return fullUrl;
  }
  
  /**
   * 📏 Formate la taille du fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * 🔧 Extrait le nom du fichier depuis l'URL
   */
  extractFilename(url: string): string {
    if (!url) return '';
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    // Enlever les paramètres GET si présents
    return filename.split('?')[0];
  }
  
  /**
   * ✅ Vérifie si une URL est accessible
   */
  checkFileExists(url: string): Observable<boolean> {
    const fullUrl = this.getFullUrl(url);
    console.log('🔍 Vérification existence fichier:', fullUrl);
    
    return this.http.head(fullUrl, { observe: 'response' }).pipe(
      map(response => {
        console.log(`✅ Fichier existe: ${response.status === 200}`);
        return response.status === 200;
      }),
      catchError((error) => {
        console.log(`❌ Fichier non trouvé: ${error.status}`);
        return of(false);
      })
    );
  }
  
  /**
   * 🗑️ Supprime un fichier
   */
  deleteFile(url: string): Observable<any> {
    const filename = this.extractFilename(url);
    console.log('🗑️ Suppression du fichier:', filename);
    return this.http.delete(`${this.apiUrl}/upload/${filename}`);
  }
}