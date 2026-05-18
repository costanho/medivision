/**
 * Messaging Service Models and Interfaces
 * Defines all data structures for messaging functionality
 */

/**
 * User Interface
 * Represents a user in the messaging system
 */
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'patient' | 'doctor' | 'admin';
  status: 'online' | 'offline' | 'away' | 'idle';
  avatar?: string;
  lastSeen?: Date;
  isOnline?: boolean;
}

/**
 * Message Interface
 * Represents a single message in a conversation
 */
export interface Message {
  id: number;
  senderId: number;
  senderName?: string;
  senderEmail?: string;
  recipientId: number;
  recipientName?: string;
  recipientEmail?: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  readAt?: Date;
  attachments?: MessageAttachment[];
  messageType?: 'text' | 'image' | 'file' | 'system';
}

/**
 * Message Attachment Interface
 * Represents attachments in a message
 */
export interface MessageAttachment {
  id: number;
  messageId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: Date;
}

/**
 * Conversation Interface
 * Represents a conversation between users
 */
export interface Conversation {
  id: number;
  patientId: number;
  patientName: string;
  patientEmail: string;
  doctorId: number;
  doctorName: string;
  doctorEmail: string;
  lastMessage: Message | null;
  lastMessageTime: Date;
  unreadCount: number;
  unreadCountForCurrentUser?: number;
  createdAt: Date;
  updatedAt: Date;
  participants: User[];
  isActive: boolean;
}

/**
 * Paginated Response Interface
 * Generic interface for paginated API responses
 */
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * WebSocket Event Interfaces
 */

/**
 * Chat Message Event
 * WebSocket event for sending/receiving chat messages
 */
export interface ChatMessageEvent {
  eventType: 'message';
  messageId: number;
  senderId: number;
  senderName: string;
  recipientId: number;
  content: string;
  timestamp: Date;
  conversationId: number;
  attachments?: MessageAttachment[];
}

/**
 * Typing Indicator Event
 * WebSocket event to indicate when a user is typing
 */
export interface TypingIndicatorEvent {
  eventType: 'typing';
  senderId: number;
  senderName: string;
  conversationId: number;
  isTyping: boolean;
  timestamp: Date;
}

/**
 * Presence Update Event
 * WebSocket event for user online/offline status updates
 */
export interface PresenceUpdateEvent {
  eventType: 'presence';
  userId: number;
  userName: string;
  status: 'online' | 'offline' | 'away' | 'idle';
  timestamp: Date;
  lastSeen: Date;
}

/**
 * Read Receipt Event
 * WebSocket event to confirm message was read
 */
export interface ReadReceiptEvent {
  eventType: 'read';
  messageId: number;
  conversationId: number;
  readerId: number;
  readerName: string;
  timestamp: Date;
}

/**
 * Union type for all WebSocket events
 */
export type WebSocketEvent =
  | ChatMessageEvent
  | TypingIndicatorEvent
  | PresenceUpdateEvent
  | ReadReceiptEvent;

/**
 * WebSocket Message Wrapper
 * Wraps all WebSocket events for transmission
 */
export interface WebSocketMessage {
  id: string;
  type: 'message' | 'typing' | 'presence' | 'read' | 'connection' | 'error' | 'call' | 'call_incoming' | 'call_accepted' | 'call_rejected' | 'call_ended';
  payload: any;
  timestamp: Date;
  senderId?: number;
}

/**
 * Connection Status Interface
 * Represents WebSocket connection state
 */
export interface ConnectionStatus {
  isConnected: boolean;
  lastConnectedTime?: Date;
  lastDisconnectedTime?: Date;
  reconnectAttempts: number;
  error?: string;
}

/**
 * Message Draft Interface
 * Represents an unsent message draft
 */
export interface MessageDraft {
  conversationId: number;
  recipientId: number;
  content: string;
  savedAt: Date;
  attachments?: MessageAttachment[];
}

/**
 * Search Filter Interface
 * For advanced message/conversation search
 */
export interface SearchFilter {
  query: string;
  conversationId?: number;
  senderId?: number;
  recipientId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  isUnread?: boolean;
  hasAttachments?: boolean;
}

/**
 * Notification Interface
 * For message notifications
 */
export interface MessageNotification {
  id: string;
  messageId: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  preview: string;
  timestamp: Date;
  isRead: boolean;
  action?: 'message' | 'call' | 'typing';
}

/**
 * API Request/Response Interfaces
 */

/**
 * Send Message Request
 * Payload for sending a new message
 */
export interface SendMessageRequest {
  recipientId: number;
  recipientEmail: string;
  recipientName: string;
  senderEmail: string;
  senderName: string;
  content: string;
  attachments?: MessageAttachment[];
}

/**
 * Update Message Status Request
 * Payload for marking messages as read
 */
export interface UpdateMessageStatusRequest {
  messageId: number;
  isRead: boolean;
  readAt?: Date;
}

/**
 * Create Conversation Request
 * Payload for creating a new conversation
 */
export interface CreateConversationRequest {
  patientId: number;
  patientEmail: string;
  patientName: string;
  doctorId: number;
  doctorEmail: string;
  doctorName: string;
}

/**
 * Bulk Mark as Read Request
 * Payload for marking multiple messages as read
 */
export interface BulkMarkReadRequest {
  conversationId: number;
  messageIds: number[];
  readAt: Date;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * Connection Loss & Recovery Interfaces
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Connection State Enum
 */
export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  RECONNECTION_FAILED = 'reconnection_failed',
  DEGRADED = 'degraded' // Connection exists but unstable
}

/**
 * Queued Message Interface
 * Represents a message queued while offline
 */
export interface QueuedMessage {
  id: string;
  type: 'message' | 'typing' | 'presence' | 'read';
  conversationId?: number;
  recipientId?: number;
  payload: any;
  queuedAt: Date;
  attemptCount: number;
  lastAttemptAt?: Date;
  priority: 'high' | 'normal' | 'low';
}

/**
 * Queue Stats Interface
 * Statistics about the message queue
 */
export interface QueueStats {
  totalQueued: number;
  highPriority: number;
  normalPriority: number;
  lowPriority: number;
  oldestMessageAge: number; // milliseconds
  totalBytes: number;
}

/**
 * Reconnection Strategy Configuration
 */
export interface ReconnectionStrategy {
  enabled: boolean;
  initialDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
  maxAttempts: number;
  resetAttemptsAfter: number; // Reset counter if successful after N ms
}

/**
 * Connection Event Interface
 * Represents connection state changes
 */
export interface ConnectionEvent {
  state: ConnectionState;
  timestamp: Date;
  previousState?: ConnectionState;
  attemptNumber?: number;
  nextRetryIn?: number; // milliseconds
  error?: string;
  reason?: string;
}

/**
 * Connection Metrics Interface
 * Tracks connection health and statistics
 */
export interface ConnectionMetrics {
  isConnected: boolean;
  connectionDuration: number; // milliseconds
  totalDowntime: number;
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
  reconnectAttempts: number;
  successfulReconnects: number;
  failedReconnects: number;
  averageReconnectionTime: number; // milliseconds
  messageQueueSize: number;
  unsentMessages: number;
}

/**
 * Offline Message Options
 */
export interface OfflineMessageOptions {
  queueMessage: boolean;
  maxQueueSize: number;
  persistQueue: boolean; // Save queue to localStorage
  ttl?: number; // Time to live for queued messages (ms)
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Connection Status Extended
 * Enhanced version with more detailed connection information
 */
export interface ConnectionStatusExtended extends ConnectionStatus {
  state: ConnectionState;
  metrics?: ConnectionMetrics;
  nextRetryIn?: number;
  isReconnecting: boolean;
  reconnectionStrategy?: ReconnectionStrategy;
}

/**
 * Network Quality Indicator
 */
export enum NetworkQuality {
  EXCELLENT = 'excellent', // < 50ms latency
  GOOD = 'good',           // 50-150ms latency
  FAIR = 'fair',           // 150-500ms latency
  POOR = 'poor',           // > 500ms latency
  OFFLINE = 'offline'      // No connection
}

/**
 * Reconnection Status
 */
export interface ReconnectionStatus {
  isReconnecting: boolean;
  currentAttempt: number;
  maxAttempts: number;
  nextRetryIn: number; // milliseconds
  lastAttemptError?: string;
  backoffDelay: number; // milliseconds
  estimatedTimeToReconnect: number; // milliseconds
}
