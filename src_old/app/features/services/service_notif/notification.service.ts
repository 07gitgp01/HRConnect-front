// src/app/core/services/notification.service.ts
import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material/snack-bar';

export interface NotificationConfig {
  duration?: number;
  verticalPosition?: 'top' | 'bottom';
  horizontalPosition?: 'start' | 'center' | 'end';
  panelClass?: string | string[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private defaultDuration = 5000;

  constructor(private snackBar: MatSnackBar) {}

  success(message: string, config?: NotificationConfig): MatSnackBarRef<SimpleSnackBar> {
    return this.snackBar.open(message, 'Fermer', {
      duration: config?.duration || this.defaultDuration,
      verticalPosition: config?.verticalPosition || 'bottom',
      horizontalPosition: config?.horizontalPosition || 'center',
      panelClass: ['notification-success'],
    });
  }

  error(message: string, config?: NotificationConfig): MatSnackBarRef<SimpleSnackBar> {
    return this.snackBar.open(message, 'Fermer', {
      duration: config?.duration || this.defaultDuration,
      verticalPosition: config?.verticalPosition || 'bottom',
      horizontalPosition: config?.horizontalPosition || 'center',
      panelClass: ['notification-error'],
    });
  }

  warning(message: string, config?: NotificationConfig): MatSnackBarRef<SimpleSnackBar> {
    return this.snackBar.open(message, 'Compris', {
      duration: config?.duration || this.defaultDuration,
      verticalPosition: config?.verticalPosition || 'bottom',
      horizontalPosition: config?.horizontalPosition || 'center',
      panelClass: ['notification-warning'],
    });
  }

  info(message: string, config?: NotificationConfig): MatSnackBarRef<SimpleSnackBar> {
    return this.snackBar.open(message, 'OK', {
      duration: config?.duration || this.defaultDuration,
      verticalPosition: config?.verticalPosition || 'bottom',
      horizontalPosition: config?.horizontalPosition || 'center',
      panelClass: ['notification-info'],
    });
  }

  // Méthodes utilitaires
  savedSuccessfully(itemName?: string): void {
    const message = itemName ? `${itemName} sauvegardé avec succès` : 'Sauvegarde réussie';
    this.success(message, { duration: 3000 });
  }

  deletedSuccessfully(itemName?: string): void {
    const message = itemName ? `${itemName} supprimé avec succès` : 'Suppression réussie';
    this.success(message, { duration: 3000 });
  }

  createdSuccessfully(itemName?: string): void {
    const message = itemName ? `${itemName} créé avec succès` : 'Création réussie';
    this.success(message, { duration: 3000 });
  }

  updatedSuccessfully(itemName?: string): void {
    const message = itemName ? `${itemName} mis à jour avec succès` : 'Mise à jour réussie';
    this.success(message, { duration: 3000 });
  }

  operationFailed(operation?: string): void {
    const message = operation ? `Échec de l'opération: ${operation}` : 'Opération échouée';
    this.error(message);
  }
}