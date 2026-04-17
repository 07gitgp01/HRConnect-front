// src/app/core/services/upload.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError, of } from 'rxjs';

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
  
  private apiUrl = 'http://localhost:3000';
  
  constructor(private http: HttpClient) {}
  
  /**
   * 📤 Upload un fichier vers le serveur
   */
  uploadFile(file: File): Observable<UploadEvent> {
    const validationError = this.validateFile(file);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }
    
    const formData = new FormData();
    formData.append('fichier', file);
    
    const req = new HttpRequest('POST', `${this.apiUrl}/api/upload`, formData, {
      reportProgress: true
    });
    
    return this.http.request(req).pipe(
      map(event => this.handleUploadEvent(event, file)),
      catchError(error => {
        console.error('Erreur upload:', error);
        return throwError(() => new Error('Erreur lors de l\'upload du fichier'));
      })
    );
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
   * 📊 Traite les événements d'upload
   */
  private handleUploadEvent(event: HttpEvent<any>, file: File): UploadEvent {
    switch (event.type) {
      case HttpEventType.UploadProgress:
        if (event.total) {
          const progress = Math.round(100 * event.loaded / event.total);
          return { type: 'progress', progress };
        }
        return { type: 'progress', progress: 0 };
        
      case HttpEventType.Response:
        return { 
          type: 'complete', 
          data: event.body || {
            success: true,
            url: `/uploads/rapports/${file.name}`,
            nom: file.name,
            taille: file.size,
            message: 'Upload réussi'
          }
        };
        
      default:
        return { type: 'progress', progress: 0 };
    }
  }
  
  /**
   * 📥 Télécharge un fichier
   */
  downloadFile(url: string, filename?: string): Observable<Blob> {
    const fullUrl = this.getFullUrl(url);
    
    return this.http.get(fullUrl, { 
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Erreur téléchargement:', error);
        return throwError(() => new Error('Impossible de télécharger le fichier'));
      })
    );
  }
  
  /**
   * 🔗 Construit l'URL complète avec CORRECTION AUTOMATIQUE
   * Gère les cas où l'URL contient '/upload/' au lieu de '/uploads/'
   */
  getFullUrl(url: string): string {
    if (!url) return '';
    
    // Déjà une URL absolue
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // 🔧 CORRECTION: Si l'URL contient '/upload/' (sans s), on le remplace par '/uploads/'
    let correctedUrl = url;
    if (url.includes('/upload/')) {
      correctedUrl = url.replace('/upload/', '/uploads/');
      console.log('🔧 URL corrigée (upload → uploads):', url, '→', correctedUrl);
    }
    
    // Construire l'URL complète
    if (correctedUrl.startsWith('/')) {
      return `${this.apiUrl}${correctedUrl}`;
    }
    return `${this.apiUrl}/${correctedUrl}`;
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
    const parts = url.split('/');
    return parts[parts.length - 1];
  }
  
  /**
   * ✅ Vérifie si une URL est accessible
   */
  checkFileExists(url: string): Observable<boolean> {
    const fullUrl = this.getFullUrl(url);
    return this.http.head(fullUrl, { observe: 'response' }).pipe(
      map(response => response.status === 200),
      catchError(() => of(false))
    );
  }
}