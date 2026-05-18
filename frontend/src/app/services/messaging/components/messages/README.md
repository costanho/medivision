# Messages Component

Displays a list of messages from the messaging service with comprehensive filtering, searching, and grouping capabilities.

## Overview

The `MessagesComponent` is a standalone Angular component that manages the display of messages in the CareNexus application. It provides users with an intuitive interface to browse, search, and manage their messages.

## Features

### Message Display
- **List View**: Display all messages with sender information, content, and timestamps
- **Date Grouping**: Automatically group messages by date (Today, Yesterday, or specific date)
- **Real-time Updates**: Subscribe to message updates via MessagingService
- **Loading States**: Show spinner while messages are loading
- **Empty States**: Helpful messages when no messages are available

### Search & Filter
- **Full-Text Search**: Search messages by content or sender name
- **Read Status Filter**: Filter by all messages, unread only, or read only
- **Dynamic Filtering**: Results update instantly as user types

### Message Management
- **Mark as Read**: Automatically mark messages as read when viewed
- **Message Metadata**: Display sender name, avatar initials, and timestamp
- **Status Indicators**: Show read/unread status with visual indicators

### User Experience
- **Pagination Info**: Show count of displayed vs total messages
- **Responsive Design**: Mobile-optimized layout
- **Dark Mode Support**: Full dark mode styling
- **Smooth Animations**: Fade-in effects for message items

## Usage

### Basic Implementation

```typescript
import { MessagesComponent } from '@app/services/messaging/components/messages/messages.component';

@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [MessagesComponent],
  template: `
    <app-messages></app-messages>
  `
})
export class MyPageComponent {}
```

### With Custom Styling

```typescript
// In your component
<div class="custom-container">
  <app-messages></app-messages>
</div>

// Your CSS
.custom-container {
  height: 600px;
  border: 1px solid #ccc;
}
```

## Component API

### Inputs
None - Component manages all its own state

### Outputs
None - Component uses internal events

### Methods

#### `filterByType(type: 'all' | 'unread' | 'read'): void`
Filter messages by read status.

```typescript
component.filterByType('unread');
```

#### `formatDate(date: Date | string): string`
Format a date for display. Returns "Today", "Yesterday", or formatted date string.

#### `isSentMessage(message: Message): boolean`
Determine if a message was sent by the current user.

#### `onMessageViewed(messageId: number): void`
Handle message viewed event and mark as read.

### Properties

- `messages: Message[]` - All loaded messages
- `filteredMessages: Message[]` - Messages after applying filters
- `groupedMessages: Array<{date: string, messages: Message[]}>` - Messages grouped by date
- `searchQuery: string` - Current search query
- `selectedFilter: 'all' | 'unread' | 'read'` - Currently selected filter
- `loading: boolean` - Loading state flag

## Data Models

### Message Interface
```typescript
interface Message {
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
```

## Service Integration

The component integrates with the `MessagingService`:

```typescript
// Messages stream
this.messagingService.messages$

// Chat message updates
this.messagingService.chatMessages$

// Mark message as read
this.messagingService.markMessageAsRead(messageId)
```

## Styling

### CSS Classes

- `.messages-container` - Main container
- `.messages-header` - Header with title
- `.messages-controls` - Search and filter controls
- `.messages-list` - Messages list container
- `.message-item` - Individual message item
- `.date-separator` - Date group separator
- `.empty-state` - Empty state display
- `.loading-state` - Loading spinner

### Theme Variables

The component uses these CSS custom properties (can be overridden):

```css
/* Colors - inherited from gradient */
--primary-color: #667eea;
--secondary-color: #764ba2;

/* Typography */
--font-size-header: 24px;
--font-size-normal: 14px;
--font-size-small: 12px;

/* Spacing */
--padding-lg: 20px;
--padding-md: 15px;
--padding-sm: 10px;
```

## Accessibility

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigable filter buttons
- Focus indicators on interactive elements
- Color contrast compliant for text

## Performance Considerations

### Change Detection Strategy
- Uses `OnPush` change detection for optimal performance
- Manual change detection triggers via service observables

### Memory Management
- Proper subscription cleanup with `takeUntil(destroy$)`
- All subscriptions destroyed in `ngOnDestroy`
- No memory leaks from retained references

### Data Optimization
- Messages grouped efficiently using Map
- Filtered results computed only when needed
- Search debouncing can be added for large datasets

## Testing

Run the component tests:

```bash
npm test -- --include='**/messages.component.spec.ts'
```

### Test Coverage
- Component initialization
- Message loading and filtering
- Search functionality
- Date formatting
- Filter state management
- Mark message as read integration

## Troubleshooting

### Messages Not Loading
1. Check MessagingService is properly injected
2. Verify `messages$` observable is emitting data
3. Check browser console for service errors

### Filters Not Working
1. Ensure searchQuery is properly bound in template
2. Verify filterByType method is being called
3. Check if messages have required fields (content, isRead)

### Styling Issues
1. Check for CSS conflicts with global styles
2. Verify dark mode media query is working
3. Check if custom CSS is overriding component styles

## Future Enhancements

- [ ] Pagination for large message lists
- [ ] Message search debouncing
- [ ] Infinite scroll support
- [ ] Message preview/pop-up
- [ ] Quick reply functionality
- [ ] Message export/archive
- [ ] Advanced filters (date range, sender)
- [ ] Message reactions/emoji

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Part of CareNexus-Frontend

## Related Components

- `ChatMessageItemComponent` - Displays individual message
- `ChatComponent` - Full chat interface
- `MessagingService` - Data and WebSocket management
- `MessageInputComponent` - Message composition
