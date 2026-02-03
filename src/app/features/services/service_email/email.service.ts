// src/app/core/services/email.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  
  /**
   * Simuler l'envoi d'un email de réponse
   */
  sendContactResponse(
    contactEmail: string, 
    adminResponse: string, 
    originalMessage: any
  ): Observable<EmailResponse> {
    
    console.log('📧 SIMULATION - Email envoyé:', {
      to: contactEmail,
      subject: `Réponse à votre demande: ${this.getSubjectLabel(originalMessage.subject)}`,
      originalMessage: {
        id: originalMessage.id,
        fullName: originalMessage.fullName,
        subject: originalMessage.subject
      },
      adminResponse: adminResponse
    });

    // Simulation d'un envoi réussi (90% de succès)
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      // Simulation d'un délai d'envoi
      return of({
        success: true,
        messageId: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }).pipe(delay(1500));
    } else {
      // Simulation d'une erreur
      return of({
        success: false,
        error: 'Erreur de simulation: Service email temporairement indisponible'
      }).pipe(delay(1000));
    }
  }

  /**
   * Générer le contenu HTML de l'email (pour prévisualisation)
   */
  generateEmailPreview(adminResponse: string, originalMessage: any): string {
    const formattedDate = new Date(originalMessage.createdAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f4f4; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2e7d32, #4caf50); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0;">🌱 PNVB - Burkina Faso</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">Programme National de Volontariat</p>
  </div>
  
  <div style="background: white; padding: 25px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #2e7d32;">Bonjour ${this.escapeHtml(originalMessage.fullName)},</h2>
    
    <p>Nous vous remercions d'avoir contacté le Programme National de Volontariat du Burkina Faso.</p>
    
    <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #2e7d32; margin: 20px 0;">
      <h3 style="color: #2e7d32; margin-top: 0;">📬 Notre réponse :</h3>
      <div style="white-space: pre-line;">${this.escapeHtml(adminResponse)}</div>
    </div>
    
    <div style="background: #f1f8e9; padding: 15px; border: 1px solid #c8e6c9; border-radius: 4px; margin: 20px 0;">
      <h4 style="color: #2e7d32; margin-top: 0;">📋 Votre message original :</h4>
      <p><strong>Sujet :</strong> ${this.getSubjectLabel(originalMessage.subject)}</p>
      <p><strong>Message :</strong> ${this.escapeHtml(originalMessage.message)}</p>
      <p style="color: #666; font-size: 12px;"><strong>Date :</strong> ${formattedDate}</p>
    </div>
    
    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">
      <p><strong>Programme National de Volontariat du Burkina Faso</strong></p>
      <p style="color: #666; font-size: 14px;">
        📍 11 CMS 323 Ouagadougou 11, Burkina Faso<br>
        📞 (+226) 25 36 40 37 / 76<br>
        ✉️ pnvb@fasovolontariat.bf
      </p>
    </div>
  </div>
</div>`;
  }

  /**
   * Obtenir le libellé du sujet
   */
  private getSubjectLabel(subject: string): string {
    const subjects: { [key: string]: string } = {
      'candidature': 'Candidature Volontaire',
      'candidature-urgente': 'Candidature Volontaire - Urgente',
      'projet-partenaire': 'Projet Partenaire',
      'question-generale': 'Question Générale',
      'probleme-technique': 'Problème Technique',
      'renseignement': 'Demande de Renseignements',
      'urgence': 'Situation Urgente',
      'autre': 'Autre demande'
    };
    return subjects[subject] || subject;
  }

  /**
   * Échapper les caractères HTML pour la sécurité
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}