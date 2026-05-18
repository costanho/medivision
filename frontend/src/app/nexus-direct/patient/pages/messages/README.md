# 💬 Messages Page

Full-featured messaging and video calling page for patient-doctor communication.

## 📁 Files

```
messages/
├── messages.page.ts           - Page component logic
├── messages.page.html         - Page template
├── messages.page.scss         - Page styling
└── README.md                  - This file
```

## 🎯 Features

- ✅ Full-width messaging interface
- ✅ Conversations list with unread badges
- ✅ Real-time message sending/receiving
- ✅ Video call button (initiates full-screen call)
- ✅ Audio call button
- ✅ Status indicators (online/offline)
- ✅ Error handling with dismissible alerts
- ✅ Beautiful gradient background
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Call modal overlay (full-screen video)
- ✅ Animated decorative elements

## 🔗 Routes

### Patient Messages Page
```
http://localhost:4200/patient/nexus-direct/dashboard/messages
```

### Global Messages Route
```
http://localhost:4200/messages
```

## 📦 Dependencies

- `NextcloudTalkComponent` - Messaging and conversation management
- `VideoCallComponent` - Full-screen video calling
- `NextcloudTalkService` - API communication with Nextcloud

## 🎨 Design

### Layout
- **Header**: Page title + status indicator
- **Main Content**: Messaging component (full-width)
- **Overlay**: Video call modal (when active)
- **Decorations**: Animated blobs in background

### Colors
- Primary: Blue (`#007bff`)
- Success: Green (`#28a745`)
- Background: Gradient blue (`#f5f7fa` → `#c3cfe2`)
- Text: Dark gray (`#1a1a1a`)

### Responsive Breakpoints
- **Desktop** (1024px+): Full sidebar + chat layout
- **Tablet** (768px-1023px): Adjusted proportions
- **Mobile** (<768px): Stacked layout with smaller controls

## 🚀 Usage

### Navigate to Messages Page
```typescript
// From any component
import { Router } from '@angular/router';

constructor(private router: Router) {}

goToMessages() {
  this.router.navigate(['/patient/nexus-direct/dashboard/messages']);
}
```

### From Dashboard
```html
<a routerLink="messages">Go to Messages</a>
```

## 📋 Component Properties

### MessagesPage Component

```typescript
interface MessagesPageState {
  // Call state
  callInProgress: boolean;
  currentCallId: string | null;
  currentParticipant: string;
  callType: 'video' | 'audio';

  // Page state
  isLoading: boolean;
  error: string | null;
}
```

## 🔄 Event Handlers

### onVideoCallStart(event)
Triggered when video call initiated
- Sets `callInProgress = true`
- Displays video call modal

### onAudioCallStart(event)
Triggered when audio call initiated
- Sets `callInProgress = true`
- Displays audio call interface

### onCallEnd()
Called when call ends
- Sets `callInProgress = false`
- Closes modal overlay

### onError(error)
Shows error banner
- Displays error message
- Auto-dismissible after 5 seconds

### clearError()
Dismisses error banner

## 🧪 Testing

### Test Video Call
1. Navigate to messages page
2. Click Video button in conversation
3. Full-screen video interface should appear
4. Click end call button

### Test Messaging
1. Navigate to messages page
2. Select a conversation
3. Type a message and press Enter
4. Message should appear immediately
5. Other user should see message

### Test Error Handling
1. Disconnect internet
2. Try to send a message
3. Error banner should appear with message
4. Click X to dismiss error

## 📱 Mobile Considerations

- **Touch-friendly buttons**: Minimum 44x44px
- **Responsive text**: Font sizes adjust for mobile
- **Full-screen overlay**: Video calls use full screen
- **Decorations hidden**: Reduced opacity on mobile devices

## 🔐 Security

- All messages encrypted in transit (HTTPS/TLS)
- End-to-end encryption in Phase 2
- JWT token authentication
- User can only see their own conversations
- Access control enforced by backend

## 🐛 Troubleshooting

### Page doesn't load
- Check route is correct: `/patient/nexus-direct/dashboard/messages`
- Check component is imported in routes
- Check browser console for errors

### Messages not loading
- Check Nextcloud server is running
- Check network tab in DevTools
- Check server URL in service

### Video call not starting
- Check microphone/camera permissions
- Check firewall allows WebRTC ports
- Check TURN server configuration

### Styling looks wrong
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check SCSS file compiled correctly
- Check no CSS conflicts

## 📊 File Sizes

| File | Size |
|------|------|
| messages.page.ts | ~2.5 KB |
| messages.page.html | ~1.8 KB |
| messages.page.scss | ~7.2 KB |
| **Total** | **~11.5 KB** |

## 🔗 Related Files

- `/shared/components/communication/nextcloud-talk.component.ts` - Messaging UI
- `/shared/components/communication/video-call.component.ts` - Video call UI
- `/core/services/nextcloud-talk.service.ts` - API service
- `/app.routes.ts` - Route configuration

## 📚 Documentation

- `INTEGRATION_GUIDE.md` - How to integrate components
- `COMMUNICATION_COMPONENTS_GUIDE.md` - Component details
- `NEXTCLOUD_INTEGRATION.md` - Service integration

## 🎯 Next Steps

1. **Deploy Nextcloud** - Follow START_HERE.md
2. **Create users** - Add test accounts
3. **Test messaging** - Send messages between users
4. **Test video calls** - Ensure calls work end-to-end
5. **Customize styling** - Match your brand colors
6. **Monitor performance** - Check DevTools for issues

## ⚙️ Configuration

### Change Nextcloud URL
Edit `/core/services/nextcloud-talk.service.ts`:
```typescript
private nextcloudUrl = 'http://YOUR_SERVER_IP';
```

### Change Height
Edit `messages.page.scss`:
```scss
.messaging-container {
  height: 100%; // Full page height
}
```

### Change Header Text
Edit `messages.page.html`:
```html
<h1>💬 My Messages</h1> <!-- Change text -->
```

---

**Status:** ✅ Production Ready

**Last Updated:** 2024

**Version:** 1.0
