import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type UserRole = 'patient' | 'doctor' | 'admin' | 'guest';

export interface UserPermissions {
  userId: number;
  email: string;
  role: UserRole;
  permissions: string[];
  conversationIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private userPermissions$ = new BehaviorSubject<UserPermissions | null>(null);

  // Define role-based permissions
  private readonly rolePermissions: Record<UserRole, string[]> = {
    admin: [
      'view:all_conversations',
      'view:all_users',
      'view:all_messages',
      'send:message',
      'delete:any_message',
      'create:conversation',
      'manage:users'
    ],
    doctor: [
      'view:own_conversations',
      'view:own_messages',
      'send:message',
      'delete:own_message',
      'create:conversation'
    ],
    patient: [
      'view:own_conversations',
      'view:own_messages',
      'send:message',
      'delete:own_message'
    ],
    guest: [
      'view:public_content'
    ]
  };

  constructor() {}

  /**
   * Initialize user permissions
   */
  setUserPermissions(permissions: UserPermissions): void {
    this.userPermissions$.next(permissions);
  }

  /**
   * Get current user permissions
   */
  getUserPermissions(): UserPermissions | null {
    return this.userPermissions$.value;
  }

  /**
   * Get user permissions as observable
   */
  getUserPermissions$(): Observable<UserPermissions | null> {
    return this.userPermissions$.asObservable();
  }

  /**
   * Get current user role
   */
  getUserRole(): UserRole | null {
    return this.userPermissions$.value?.role ?? null;
  }

  /**
   * Get user ID
   */
  getUserId(): number | null {
    return this.userPermissions$.value?.userId ?? null;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const userPerms = this.userPermissions$.value;
    if (!userPerms) return false;
    return userPerms.permissions.includes(permission);
  }

  /**
   * Check if user has specific permission (observable)
   */
  hasPermission$(permission: string): Observable<boolean> {
    return this.userPermissions$.pipe(
      map(perms => perms?.permissions.includes(permission) ?? false)
    );
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const userPerms = this.userPermissions$.value;
    if (!userPerms) return false;
    return permissions.some(p => userPerms.permissions.includes(p));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    const userPerms = this.userPermissions$.value;
    if (!userPerms) return false;
    return permissions.every(p => userPerms.permissions.includes(p));
  }

  /**
   * Check if user has access to conversation
   */
  canAccessConversation(conversationId: number): boolean {
    const userPerms = this.userPermissions$.value;
    if (!userPerms) return false;

    // Admin can access all conversations
    if (userPerms.role === 'admin') {
      return true;
    }

    // Check if user is in conversation participants
    return userPerms.conversationIds.includes(conversationId);
  }

  /**
   * Check if user can send message to conversation
   */
  canSendMessage(conversationId: number): boolean {
    return (
      this.hasPermission('send:message') &&
      this.canAccessConversation(conversationId)
    );
  }

  /**
   * Check if user can delete message
   */
  canDeleteMessage(messageId: number, authorId: number, isOwnMessage: boolean): boolean {
    // Can delete if has global delete permission
    if (this.hasPermission('delete:any_message')) {
      return true;
    }

    // Can delete own messages
    if (isOwnMessage && this.hasPermission('delete:own_message')) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can create conversation
   */
  canCreateConversation(): boolean {
    return this.hasPermission('create:conversation');
  }

  /**
   * Check if user can view all conversations
   */
  canViewAllConversations(): boolean {
    return this.hasPermission('view:all_conversations');
  }

  /**
   * Check if user can view all users
   */
  canViewAllUsers(): boolean {
    return this.hasPermission('view:all_users');
  }

  /**
   * Get permissions for role
   */
  getPermissionsForRole(role: UserRole): string[] {
    return this.rolePermissions[role] || [];
  }

  /**
   * Clear user permissions (logout)
   */
  clearPermissions(): void {
    this.userPermissions$.next(null);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.userPermissions$.value !== null;
  }

  /**
   * Check if user is authenticated (observable)
   */
  isAuthenticated$(): Observable<boolean> {
    return this.userPermissions$.pipe(
      map(perms => perms !== null)
    );
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  /**
   * Check if user is doctor
   */
  isDoctor(): boolean {
    return this.getUserRole() === 'doctor';
  }

  /**
   * Check if user is patient
   */
  isPatient(): boolean {
    return this.getUserRole() === 'patient';
  }

  /**
   * Validate user has permission before performing action
   */
  validatePermission(permission: string, context?: Record<string, any>): { isValid: boolean; message: string } {
    if (!this.isAuthenticated()) {
      return {
        isValid: false,
        message: 'You must be logged in to perform this action'
      };
    }

    if (!this.hasPermission(permission)) {
      return {
        isValid: false,
        message: `You do not have permission to: ${permission}`
      };
    }

    // Additional context-specific validation
    if (context?.conversationId) {
      if (!this.canAccessConversation(context.conversationId)) {
        return {
          isValid: false,
          message: 'You do not have access to this conversation'
        };
      }
    }

    return {
      isValid: true,
      message: 'Permission granted'
    };
  }

  /**
   * Get user's accessible conversations
   */
  getAccessibleConversations(): number[] {
    const userPerms = this.userPermissions$.value;
    if (!userPerms) return [];

    // Admins have access to all (represented by empty array)
    if (userPerms.role === 'admin') {
      return [];
    }

    return userPerms.conversationIds;
  }

  /**
   * Add conversation access
   */
  addConversationAccess(conversationId: number): void {
    const current = this.userPermissions$.value;
    if (current && !current.conversationIds.includes(conversationId)) {
      const updated = {
        ...current,
        conversationIds: [...current.conversationIds, conversationId]
      };
      this.userPermissions$.next(updated);
    }
  }

  /**
   * Remove conversation access
   */
  removeConversationAccess(conversationId: number): void {
    const current = this.userPermissions$.value;
    if (current) {
      const updated = {
        ...current,
        conversationIds: current.conversationIds.filter(id => id !== conversationId)
      };
      this.userPermissions$.next(updated);
    }
  }
}
