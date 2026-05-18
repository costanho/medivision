/**
 * Messaging Models and Interfaces
 * Shared data structures for read receipts and typing indicators
 */

// ═══════════════════════════════════════════════════════════════
// Read Receipt Models
// ═══════════════════════════════════════════════════════════════

/**
 * Read receipt event from WebSocket
 * Indicates a message has been read by a user
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
 * Delivery status event from WebSocket
 * Indicates a message was delivered to a user
 */
export interface DeliveryStatusEvent {
  eventType: 'delivered';
  messageId: number;
  conversationId: number;
  recipientId: number;
  recipientName: string;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════
// Typing Indicator Models
// ═══════════════════════════════════════════════════════════════

/**
 * Typing indicator event from WebSocket
 * Indicates a user is typing in a conversation
 */
export interface TypingIndicatorEvent {
  eventType: 'typing';
  conversationId: number;
  typistId: number;
  typistName: string;
  typistEmail?: string;
  timestamp: Date;
}

/**
 * Stopped typing event from WebSocket
 * Indicates a user has stopped typing
 */
export interface StoppedTypingEvent {
  eventType: 'stopped_typing';
  conversationId: number;
  typistId: number;
  typistName: string;
  timestamp: Date;
}

/**
 * Union type for typing-related events
 */
export type TypingEvent = TypingIndicatorEvent | StoppedTypingEvent;

/**
 * Typing indicator state for a single user
 */
export interface TypingUserState {
  userId: number;
  userName: string;
  email?: string;
  isTyping: boolean;
  startedAt: Date;
  lastUpdateAt: Date;
}

/**
 * Typing indicator state for a conversation
 */
export interface ConversationTypingState {
  conversationId: number;
  typingUsers: TypingUserState[];
  totalTypingCount: number;
}

/**
 * Typing indicator status for tracking broadcast state
 */
export interface TypingIndicatorStatus {
  batchId: string;
  conversationId: number;
  typistId: number;
  typistName: string;
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
  messageType: 'typing' | 'stopped_typing';
  sentAt: Date;
  confirmedAt?: Date;
  error?: string;
  retries: number;
}

// ═══════════════════════════════════════════════════════════════
// Combined Message Events
// ═══════════════════════════════════════════════════════════════

/**
 * Union type for all messaging events
 */
export type MessagingEvent = ReadReceiptEvent | DeliveryStatusEvent | TypingEvent;

/**
 * WebSocket message wrapper
 */
export interface WebSocketMessage<T> {
  type: string;
  payload: T;
  timestamp: Date;
  messageId?: string;
}

/**
 * WebSocket subscription response
 */
export interface WebSocketSubscription {
  subscriptionId: string;
  destination: string;
  status: 'active' | 'inactive' | 'failed';
  subscribedAt: Date;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// User Presence Models
// ═══════════════════════════════════════════════════════════════

/**
 * User presence status (online/offline)
 */
export type PresenceStatus = 'online' | 'offline' | 'away' | 'idle';

/**
 * User presence event from WebSocket
 * Indicates a user's presence status has changed
 */
export interface UserPresenceEvent {
  eventType: 'presence';
  userId: number;
  userName: string;
  email?: string;
  status: PresenceStatus;
  lastSeenAt: Date;
  comingOnlineAt?: Date;
  timestamp: Date;
}

/**
 * User online event
 * Indicates a user has come online
 */
export interface UserOnlineEvent {
  eventType: 'user_online';
  userId: number;
  userName: string;
  email?: string;
  timestamp: Date;
  comingOnlineAt: Date;
}

/**
 * User offline event
 * Indicates a user has gone offline
 */
export interface UserOfflineEvent {
  eventType: 'user_offline';
  userId: number;
  userName: string;
  email?: string;
  timestamp: Date;
  lastSeenAt: Date;
}

/**
 * Union type for presence-related events
 */
export type PresenceEvent = UserPresenceEvent | UserOnlineEvent | UserOfflineEvent;

/**
 * User presence state
 */
export interface UserPresenceState {
  userId: number;
  userName: string;
  email?: string;
  status: PresenceStatus;
  isOnline: boolean;
  lastSeenAt: Date;
  comingOnlineAt?: Date;
  updatedAt: Date;
}

/**
 * Conversation presence state
 */
export interface ConversationPresenceState {
  conversationId: number;
  participantId: number;
  participantName: string;
  status: PresenceStatus;
  isOnline: boolean;
  lastSeenAt: Date;
  onlineIndicator: string; // e.g., "Online now" or "Last seen 2 hours ago"
}

/**
 * Presence broadcast status
 */
export interface PresenceBroadcastStatus {
  batchId: string;
  userId: number;
  status: PresenceStatus;
  broadcastStatus: 'pending' | 'sent' | 'confirmed' | 'failed';
  sentAt: Date;
  confirmedAt?: Date;
  error?: string;
  retries: number;
}
