# 💬 Communication Components

All communication-related components for CareNexus are located in this folder. These components handle real-time messaging, video calling, and related features.

## 📁 Folder Structure

```
communication/
├── nextcloud-talk.component.ts          # Main chat/messaging component
├── nextcloud-talk.component.html        # Chat UI template
├── nextcloud-talk.component.scss        # Chat styling
├── video-call.component.ts              # Video call component
├── video-call.component.html            # Video call UI
├── video-call.component.scss            # Video call styling
├── index.ts                              # Component exports
└── README.md                             # This file
```

---

## 🎯 Components Overview

### 1. NextcloudTalkComponent
**Purpose:** Main messaging and conversation interface

**Features:**
- Conversations list with unread badges
- Real-time message display
- Message sending with enter key support
- Video call button
- Audio call button
- Auto-scroll to latest message
- Error handling and loading states

**Usage:**
```typescript
import { NextcloudTalkComponent } from './communication';

@Component({
  imports: [NextcloudTalkComponent]
})
export class DashboardComponent {}
```

**Template:**
```html
<app-nextcloud-talk></app-nextcloud-talk>
```

**Styling:** Responsive design with sidebar for conversations and main chat area

---

### 2. VideoCallComponent
**Purpose:** Full-screen video calling interface

**Features:**
- Local and remote video feeds
- Microphone control (mute/unmute)
- Video control (on/off)
- Screen sharing button
- Call end button
- Call duration timer
- Participant information
- Picture-in-picture local video

**Inputs:**
```typescript
@Input() callId: string | null = null;           // Unique call identifier
@Input() participantName: string = 'User';       // Other user's name
@Input() callType: 'video' | 'audio' = 'video';  // Type of call
```

**Usage:**
```typescript
import { VideoCallComponent } from './communication';

@Component({
  imports: [VideoCallComponent],
  template: `
    <app-video-call
      [callId]="currentCallId"
      [participantName]="remoteUserName"
      [callType]="'video'"
    ></app-video-call>
  `
})
export class CallComponent {}
```

**Styling:** Full-screen overlay with responsive controls

---

## 🔄 Integration Points

### With Patient Dashboard
```typescript
import { NextcloudTalkComponent } from '../../../../shared/components/communication';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NextcloudTalkComponent,  // Add here
  ],
  template: `
    <div class="dashboard-container">
      <!-- Existing dashboard content -->

      <!-- Add Talk component -->
      <section class="communication-section">
        <h2>Messages & Calls</h2>
        <app-nextcloud-talk></app-nextcloud-talk>
      </section>
    </div>
  `
})
export class PatientDashboardComponent {}
```

### With Doctor Dashboard
```typescript
import { NextcloudTalkComponent } from '../../../../shared/components/communication';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [NextcloudTalkComponent],
  template: `
    <div class="dashboard">
      <app-nextcloud-talk></app-nextcloud-talk>
    </div>
  `
})
export class DoctorDashboardComponent {}
```

---

## 🔧 Service Dependencies

These components depend on the `NextcloudTalkService`:

**Location:** `/src/app/core/services/nextcloud-talk.service.ts`

**Key Methods:**
- `initialize(email, displayName)` - Setup connection
- `getConversations()` - Load all conversations
- `getMessages(conversationId)` - Load message history
- `sendMessage(conversationId, text)` - Send message
- `startCall(conversationId, type)` - Initiate call
- `getOrCreateConversation(userId)` - 1-on-1 chat

---

## 📋 Component States

### NextcloudTalkComponent States
- **loading:** Fetching conversations or messages
- **error:** Display error message
- **selected:** Conversation selected
- **no-selection:** No conversation selected

### VideoCallComponent States
- **active:** Call in progress
- **muted:** Microphone muted
- **video-off:** Camera disabled
- **screen-sharing:** Sharing screen
- **ended:** Call terminated

---

## 🎨 Styling

### Color Scheme
- **Primary:** `#007bff` (Blue) - Buttons, highlights
- **Success:** `#28a745` (Green) - Audio call
- **Danger:** `#ff5252` (Red) - Mute, end call
- **Background:** `#f5f5f5` - Main
- **White:** `#ffffff` - Cards, surfaces

### Responsive Breakpoints
- **Desktop:** Full layout with sidebar + chat
- **Tablet:** Adjusted proportions
- **Mobile:** Stacked layout

---

## 🧪 Testing

### Unit Tests
```typescript
describe('NextcloudTalkComponent', () => {
  it('should load conversations on init', () => {
    // Test implementation
  });

  it('should send message when user types and presses enter', () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
describe('Communication Integration', () => {
  it('should display new message from remote user', () => {
    // Test implementation
  });

  it('should initialize video call with correct parameters', () => {
    // Test implementation
  });
});
```

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Group video calls (3+ participants)
- [ ] Message reactions/emojis
- [ ] Rich text formatting
- [ ] File attachments
- [ ] Message search
- [ ] Call recording
- [ ] Notification sounds
- [ ] Typing indicators
- [ ] Message encryption
- [ ] Call history

### Optional Improvements
- [ ] Animated transitions
- [ ] Message timestamps
- [ ] User presence indicators
- [ ] Do not disturb mode
- [ ] Call scheduling
- [ ] Meeting transcription

---

## 🔐 Security Considerations

1. **JWT Authentication**
   - All API calls include JWT token from AuthService
   - Token refresh handled automatically

2. **HTTPS/TLS**
   - All Nextcloud communication over HTTPS
   - WebRTC media encrypted with DTLS-SRTP

3. **Message Encryption**
   - Messages encrypted at rest (database)
   - End-to-end encryption in Phase 2

4. **Access Control**
   - Users can only see their own conversations
   - Doctor can see patient conversations (within scope)
   - Admin can view audit logs

---

## 📱 Mobile Considerations

### Permissions Required
- Camera access (for video calls)
- Microphone access (for audio/video)
- Screen recording (for screen share)

### Mobile Optimizations
- Touch-friendly button sizes (minimum 44x44px)
- Responsive video layouts
- Battery optimization
- Network awareness

---

## 🐛 Troubleshooting

### Common Issues

**Videos not loading:**
- Check browser console for errors
- Verify Nextcloud server is running
- Check CORS configuration
- Test microphone/camera permissions

**Messages not sending:**
- Check JWT token validity
- Verify Nextcloud API endpoint
- Check network connection
- Review error logs

**Audio/video not working:**
- Grant permission to browser
- Check microphone/camera hardware
- Test in different browser
- Check firewall rules for WebRTC

### Debug Mode
```typescript
// Enable logging in services
export class NextcloudTalkService {
  private debug = true; // Set to true for verbose logging

  private log(...args: any[]) {
    if (this.debug) {
      console.log('[NextcloudTalk]', ...args);
    }
  }
}
```

---

## 📖 Related Documentation

- **NEXTCLOUD_INTEGRATION.md** - Integration guide
- **WEBRTC_ARCHITECTURE.md** - Technical architecture
- **STEP_BY_STEP_IMPLEMENTATION.md** - Implementation steps
- **START_HERE.md** - Quick start guide

---

## 👥 Team Notes

### For Backend Team
- Ensure Nextcloud Talk API is running
- Configure TURN servers for WebRTC
- Set up database for message persistence

### For DevOps Team
- Deploy Nextcloud + Talk
- Configure SSL/TLS certificates
- Set up monitoring and logging
- Regular backups of message database

### For QA Team
- Test video/audio quality
- Test message delivery
- Test error scenarios
- Test mobile responsiveness
- Load testing

---

## 📞 Support

For questions or issues with these components:

1. Check documentation files referenced above
2. Review component comments in code
3. Check browser console for errors
4. Review Nextcloud logs on server
5. Check network requests in browser DevTools

---

**Last Updated:** 2024
**Version:** 1.0
**Status:** Production Ready
