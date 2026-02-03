// src/app/core/services/contact.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, switchMap, of, catchError, throwError } from 'rxjs';
import { environment } from '../../environment/environment';
import { 
  ContactMessage, 
  ContactMessageCreate, 
  ContactMessageResponse,
  ContactMessageResponseResult,
  MessageStatus,
  MessagePriority 
} from '../../models/contact-message.model';
import { EmailService } from '../service_email/email.service';

export interface MessagesFilter {
  status?: MessageStatus;
  priority?: MessagePriority;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private apiUrl = `${environment.apiUrl}/contactMessages`;

  constructor(
    private http: HttpClient,
    private emailService: EmailService
  ) {}

  /**
   * Créer un nouveau message de contact
   */
  createMessage(messageData: ContactMessageCreate): Observable<ContactMessage> {
    const messageWithMetadata: ContactMessage = {
      ...messageData,
      id: 0,
      status: MessageStatus.NEW,
      priority: this.getPriorityFromSubject(messageData.subject),
      adminNotes: '',
      assignedTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readAt: null,
      respondedAt: null
    };

    return this.http.post<ContactMessage>(this.apiUrl, messageWithMetadata).pipe(
      tap((createdMessage) => {
        console.log('📨 Message de contact créé avec succès, ID:', createdMessage.id);
      })
    );
  }

  /**
   * Récupérer tous les messages (admin)
   */
  getMessages(filter?: MessagesFilter, page: number = 1, limit: number = 20): Observable<{ messages: ContactMessage[], total: number }> {
    let params = new HttpParams();

    params = params.set('_page', page.toString());
    params = params.set('_limit', limit.toString());
    params = params.set('_sort', 'createdAt');
    params = params.set('_order', 'desc');

    if (filter?.status) params = params.set('status', filter.status);
    if (filter?.priority) params = params.set('priority', filter.priority);
    if (filter?.subject) params = params.set('subject_like', filter.subject);
    if (filter?.search) params = params.set('q', filter.search);

    return this.http.get<ContactMessage[]>(this.apiUrl, { 
      params, 
      observe: 'response' 
    }).pipe(
      map(response => {
        const total = Number(response.headers.get('X-Total-Count')) || 0;
        return {
          messages: response.body || [],
          total: total
        };
      })
    );
  }

  /**
   * Récupérer un message spécifique
   */
  getMessage(id: number): Observable<ContactMessage> {
    return this.http.get<ContactMessage>(`${this.apiUrl}/${id}`);
  }

  /**
   * Marquer un message comme lu
   */
  markAsRead(id: number): Observable<ContactMessage> {
    const updateData = {
      readAt: new Date().toISOString(),
      status: MessageStatus.IN_PROGRESS,
      updatedAt: new Date().toISOString()
    };

    return this.http.patch<ContactMessage>(`${this.apiUrl}/${id}`, updateData);
  }

  /**
   * Mettre à jour le statut d'un message
   */
  updateStatus(id: number, status: MessageStatus, adminNotes?: string): Observable<ContactMessage> {
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    return this.http.patch<ContactMessage>(`${this.apiUrl}/${id}`, updateData);
  }

  /**
   * Assigner un message à un administrateur
   */
  assignMessage(id: number, adminId: number): Observable<ContactMessage> {
    const updateData = {
      assignedTo: adminId,
      updatedAt: new Date().toISOString()
    };

    return this.http.patch<ContactMessage>(`${this.apiUrl}/${id}`, updateData);
  }

  /**
   * Répondre à un message avec envoi d'email simulé
   */
  respondToMessage(id: number, responseData: ContactMessageResponse): Observable<ContactMessageResponseResult> {
    const updateData = {
      status: MessageStatus.RESPONDED,
      respondedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adminNotes: responseData.response
    };

    // 1. Mettre à jour le message d'abord
    return this.http.patch<ContactMessage>(`${this.apiUrl}/${id}`, updateData).pipe(
      switchMap((updatedMessage: ContactMessage) => {
        // 2. Si l'email est demandé, envoyer l'email simulé
        if (responseData.sendEmail) {
          return this.emailService.sendContactResponse(
            updatedMessage.email,
            responseData.response,
            updatedMessage
          ).pipe(
            map((emailResult) => ({
              message: updatedMessage,
              emailSent: emailResult.success,
              emailError: emailResult.error
            }))
          );
        } else {
          // 3. Sinon, retourner juste le message mis à jour
          return of({
            message: updatedMessage,
            emailSent: false
          });
        }
      })
    );
  }

  /**
   * Obtenir les statistiques des messages
   */
  getMessagesStats(): Observable<{
    total: number;
    new: number;
    inProgress: number;
    responded: number;
    closed: number;
    urgent: number;
  }> {
    return this.http.get<ContactMessage[]>(this.apiUrl).pipe(
      map(messages => {
        const total = messages.length;
        const newMessages = messages.filter(m => m.status === MessageStatus.NEW).length;
        const inProgress = messages.filter(m => m.status === MessageStatus.IN_PROGRESS).length;
        const responded = messages.filter(m => m.status === MessageStatus.RESPONDED).length;
        const closed = messages.filter(m => m.status === MessageStatus.CLOSED).length;
        const urgent = messages.filter(m => m.priority === MessagePriority.URGENT).length;

        return {
          total,
          new: newMessages,
          inProgress,
          responded,
          closed,
          urgent
        };
      })
    );
  }
/**
 * Supprimer un message
 */
deleteMessage(id: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
    tap(() => {
      console.log(`🗑️ Message ${id} supprimé avec succès`);
    }),
    catchError(error => {
      console.error('❌ Erreur suppression message:', error);
      return throwError(() => error);
    })
  );
}

  /**
   * Méthode utilitaire pour déterminer la priorité basée sur le sujet
   */
  private getPriorityFromSubject(subject: string): MessagePriority {
    const urgentSubjects = ['urgence', 'probleme-technique', 'candidature-urgente'];
    const highSubjects = ['projet-partenaire', 'candidature'];
    
    if (urgentSubjects.some(s => subject.includes(s))) {
      return MessagePriority.URGENT;
    }
    if (highSubjects.some(s => subject.includes(s))) {
      return MessagePriority.HIGH;
    }
    if (subject === 'question-generale' || subject === 'renseignement') {
      return MessagePriority.LOW;
    }
    return MessagePriority.MEDIUM;
  }
}