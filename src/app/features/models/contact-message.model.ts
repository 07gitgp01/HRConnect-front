// src/app/core/models/contact-message.model.ts
export interface ContactMessage {
  id: number;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  status: MessageStatus;
  priority: MessagePriority;
  adminNotes?: string;
  assignedTo?: number | null;
  createdAt: string;
  updatedAt: string;
  readAt?: string | null;
  respondedAt?: string | null;
}

export enum MessageStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  RESPONDED = 'responded',
  CLOSED = 'closed'
}

export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface ContactMessageCreate {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactMessageResponse {
  id: number;
  response: string;
  adminId: number;
  sendEmail?: boolean;
}

export interface ContactMessageResponseResult {
  message: ContactMessage;
  emailSent: boolean;
  emailError?: string;
}