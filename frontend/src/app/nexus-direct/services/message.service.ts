import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface Message {
  id: number;
  userEmail?: string;
  senderEmail?: string;
  recipientEmail?: string;
  senderId?: number;
  senderName?: string;
  receiverId?: number;
  recipientName?: string;
  receiverName?: string;
  content: string;
  isRead?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deliveryStatus?: string;
  [key: string]: any;
}

export interface MessageListResponse {
  content: Message[];
  totalElements: number;
  totalPages: number;
  pageable: any;
}

export interface Conversation {
  conversationId: string;
  otherPersonId: number;
  otherPersonName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  constructor(private apiService: ApiService) {}

  // Get all messages (paginated)
  getMessages(page: number = 0, size: number = 20): Observable<MessageListResponse> {
    return this.apiService.get<MessageListResponse>('/messages/search/paginated', {
      page,
      size,
      sortBy: 'createdAt',
      direction: 'DESC'
    });
  }

  // Search messages by content
  searchByContent(content: string, page: number = 0, size: number = 10): Observable<MessageListResponse> {
    return this.apiService.get<MessageListResponse>('/messages/search/by-content', {
      content,
      page,
      size
    });
  }

  // Get single message by ID
  getMessageById(id: number): Observable<Message> {
    return this.apiService.get<Message>(`/messages/${id}`);
  }

  // Send new message
  sendMessage(message: any): Observable<Message> {
    return this.apiService.post<Message>('/messages', message);
  }

  // Update message (mark as read, edit)
  updateMessage(id: number, message: any): Observable<Message> {
    return this.apiService.put<Message>(`/messages/${id}`, message);
  }

  // Delete message
  deleteMessage(id: number): Observable<any> {
    return this.apiService.delete(`/messages/${id}`);
  }

  // Get conversations list (unique users you've messaged)
  getConversations(page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get('/messages/conversations', {
      page,
      size
    });
  }

  // Get messages with specific person
  getConversation(personId: number, page: number = 0, size: number = 20): Observable<MessageListResponse> {
    return this.apiService.get<MessageListResponse>(`/messages/conversation/${personId}`, {
      page,
      size
    });
  }
}
