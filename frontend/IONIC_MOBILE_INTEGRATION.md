# CareNexus - Ionic Mobile Integration Guide

## Overview
Complete integration of Ionic Framework features for native iOS and Android app development using Capacitor. This guide covers all Ionic-specific mobile features implemented in the CareNexus healthcare platform.

---

## 1. Ionic Framework Setup

### Framework Version
- **Ionic Angular**: Standalone components architecture
- **Capacitor**: Modern alternative to Cordova
- **Angular**: 20+ with TypeScript 5.9

### Key Ionic Imports
```typescript
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { App } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
```

### Ionic CSS Imports (`src/global.scss`)
```scss
@import "@ionic/angular/css/core.css";
@import "@ionic/angular/css/normalize.css";
@import "@ionic/angular/css/structure.css";
@import "@ionic/angular/css/typography.css";
@import "@ionic/angular/css/display.css";
@import "@ionic/angular/css/padding.css";
@import "@ionic/angular/css/flex-utils.css";
@import "@ionic/angular/css/palettes/dark.system.css";
```

---

## 2. Capacitor Plugins Integration

### Status Bar Plugin
**Purpose**: Customize the native status bar (iOS and Android)

**Implementation** (`src/app/app.component.ts`):
```typescript
private async initializeStatusBar(): Promise<void> {
  try {
    if (!this.platform.is('mobileweb') && !this.platform.is('web')) {
      // Set status bar text color to white (light style)
      await StatusBar.setStyle({ style: 'light' });

      // Set status bar background color to CareNexus purple
      await StatusBar.setBackgroundColor({ color: '#667eea' });

      // iOS: Set status bar to overlay web content
      if (this.platform.is('ios')) {
        await StatusBar.setOverlaysWebView({ overlay: true });
      }
    }
  } catch (error) {
    console.warn('[AppComponent] Status bar initialization failed:', error);
  }
}
```

**Features**:
- Light status bar text for better contrast
- CareNexus purple background (#667eea)
- iOS overlay mode for fullscreen experience
- Safe fallback for Android

---

### Keyboard Plugin
**Purpose**: Manage virtual keyboard behavior on iOS and Android

**Implementation** (`src/app/app.component.ts`):
```typescript
private async initializeKeyboard(): Promise<void> {
  try {
    if (!this.platform.is('web')) {
      // Hide keyboard accessory bar (suggestions bar) on iOS
      await Keyboard.setAccessoryBarVisible({ isVisible: false });

      // Listen for keyboard visibility events
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open');
      });

      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
      });
    }
  } catch (error) {
    console.warn('[AppComponent] Keyboard initialization failed:', error);
  }
}
```

**Features**:
- Prevents keyboard from pushing content up
- Hides iOS suggestions bar
- CSS class for styling adjustments
- Smooth transitions

**SCSS Support** (`src/global.scss`):
```scss
body.keyboard-open {
  .scrollable-wrapper {
    max-height: calc(100vh - 260px); /* Account for keyboard height */
  }
}
```

---

### App Plugin
**Purpose**: Control app lifecycle and hardware back button

**Implementation** (`src/app/app.component.ts`):

#### Hardware Back Button Handler
```typescript
private setupBackButtonHandler(): void {
  try {
    if (!this.platform.is('web')) {
      this.backButtonSubscription = App.addListener('backButton', async () => {
        const currentUrl = this.router.url;

        if (currentUrl === '/login' || currentUrl === '/register' || currentUrl === '/') {
          // On auth pages: minimize app instead of closing
          await App.minimizeApp();
        } else {
          // Navigate back in history
          window.history.back();
        }
      });
    }
  } catch (error) {
    console.warn('[AppComponent] Back button handler failed:', error);
  }
}
```

#### App State Listeners
```typescript
private handleAppStateChanges(): void {
  try {
    if (!this.platform.is('web')) {
      // App backgrounded
      App.addListener('pause', () => {
        console.log('[AppComponent] App paused - save state');
        document.body.classList.add('app-paused');
        // Save user data, authentication tokens, etc.
      });

      // App brought to foreground
      App.addListener('resume', () => {
        console.log('[AppComponent] App resumed - refresh data');
        document.body.classList.remove('app-paused');
        // Refresh appointments, messages, etc.
      });

      // App being destroyed
      App.addListener('destroy', () => {
        console.log('[AppComponent] App destroying');
        // Cleanup resources
      });
    }
  } catch (error) {
    console.warn('[AppComponent] App state listeners failed:', error);
  }
}
```

---

## 3. Platform Detection

### Ionic Platform Service
**Location**: `src/app/app.component.ts`

**Usage in Components**:
```typescript
import { Platform } from '@ionic/angular/standalone';

constructor(private platform: Platform) {}

ngOnInit(): void {
  if (this.platform.is('ios')) {
    // iOS-specific code
  } else if (this.platform.is('android')) {
    // Android-specific code
  } else if (this.platform.is('web')) {
    // Web-only code
  }
}
```

**Available Platform Checks**:
```typescript
this.platform.is('ios')          // iOS native
this.platform.is('android')      // Android native
this.platform.is('web')          // Web browser
this.platform.is('mobileweb')    // Mobile web browser
this.platform.is('capacitor')    // Capacitor runtime
this.platform.is('cordova')      // Cordova runtime
this.platform.is('electron')     // Electron desktop
this.platform.is('tablet')       // Tablet device
this.platform.is('mobile')       // Mobile device (any)
```

**Component Properties**:
```typescript
get isNativeApp(): boolean {
  return this.platform.is('ios') || this.platform.is('android');
}

get isIOS(): boolean {
  return this.platform.is('ios');
}

get isAndroid(): boolean {
  return this.platform.is('android');
}
```

---

## 4. Safe Area Support

### CSS Variables (Notch Support)
**Location**: `src/index.html` and `src/global.scss`

**HTML Configuration**:
```html
<style>
  :root {
    --safe-area-inset-top: env(safe-area-inset-top);
    --safe-area-inset-right: env(safe-area-inset-right);
    --safe-area-inset-bottom: env(safe-area-inset-bottom);
    --safe-area-inset-left: env(safe-area-inset-left);
  }
</style>
```

**SCSS Usage**:
```scss
/* Portrait mode - full safe area padding */
@media (orientation: portrait) {
  body {
    padding: var(--safe-area-inset-top)
             var(--safe-area-inset-right)
             var(--safe-area-inset-bottom)
             var(--safe-area-inset-left);
  }
}

/* Landscape mode - reduced top padding */
@media (orientation: landscape) {
  body {
    padding: calc(var(--safe-area-inset-top) * 0.5)
             var(--safe-area-inset-right)
             0
             var(--safe-area-inset-left);
  }
}

/* Using max() function for better support */
@supports (padding: max(0px)) {
  body {
    padding-left: max(0px, var(--safe-area-inset-left));
    padding-right: max(0px, var(--safe-area-inset-right));
    padding-top: max(0px, var(--safe-area-inset-top));
    padding-bottom: max(0px, var(--safe-area-inset-bottom));
  }
}
```

**Devices Handled**:
- iPhone X and later (notch)
- iPhone 12/13/14/15 (dynamic island)
- Android devices with notches
- Devices with curved displays

---

## 5. Ionic Components Usage

### Available Ionic Components for CareNexus

#### Navigation
```html
<ion-toolbar>
  <ion-buttons slot="start">
    <ion-back-button></ion-back-button>
  </ion-buttons>
  <ion-title>Page Title</ion-title>
</ion-toolbar>

<ion-tabs>
  <ion-tab-bar slot="bottom">
    <ion-tab-button tab="home">
      <ion-icon name="home"></ion-icon>
      <ion-label>Home</ion-label>
    </ion-tab-button>
  </ion-tab-bar>
</ion-tabs>
```

#### Forms
```html
<ion-input
  placeholder="Enter your name"
  type="text"
  [(ngModel)]="name">
</ion-input>

<ion-select [(ngModel)]="selectedRole">
  <ion-select-option value="PATIENT">Patient</ion-select-option>
  <ion-select-option value="DOCTOR">Doctor</ion-select-option>
</ion-select>

<ion-button expand="block">Submit</ion-button>
```

#### Content
```html
<ion-content>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Title</ion-card-title>
    </ion-card-header>
    <ion-card-content>Content here</ion-card-content>
  </ion-card>
</ion-content>
```

#### Modals & Alerts
```typescript
import { IonAlert } from '@ionic/angular/standalone';

// Show alert
const alert = await this.alertController.create({
  header: 'Error',
  message: 'Something went wrong',
  buttons: ['OK']
});
await alert.present();
```

---

## 6. Responsive Layout Pattern

### Ionic Grid System
```html
<ion-grid>
  <ion-row>
    <!-- Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns -->
    <ion-col size="12" sizeMd="6" sizeLg="3">
      <ion-card>Content</ion-card>
    </ion-col>
  </ion-row>
</ion-grid>
```

### Alternative: CSS Grid (Current Approach)
```scss
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}
```

---

## 7. Ionic Build Configuration

### Building for iOS
```bash
# Build web assets
npm run build

# Add iOS platform
ionic capacitor add ios

# Build iOS app
ionic capacitor build ios

# Open in Xcode
open ios/App/App.xcworkspace
```

### Building for Android
```bash
# Build web assets
npm run build

# Add Android platform
ionic capacitor add android

# Build Android app
ionic capacitor build android

# Open in Android Studio
ionic capacitor open android
```

### Capacitor Configuration (`capacitor.config.ts`)
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carenexus.app',
  appName: 'CareNexus',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true // Allow HTTP for local development
  },
  plugins: {
    StatusBar: {
      style: 'light',
      backgroundColor: '#667eea'
    },
    Keyboard: {
      resize: 'body'
    }
  }
};

export const config = config;
```

---

## 8. Ionic Live Reload Development

### Development with iOS Simulator
```bash
# Start dev server with live reload
ionic capacitor run ios --livereload --external

# App will automatically refresh on code changes
```

### Development with Android Emulator
```bash
# Start dev server with live reload
ionic capacitor run android --livereload --external

# App will automatically refresh on code changes
```

---

## 9. Ionic Theming

### Theme Colors
**Location**: `src/theme/variables.scss`

**CareNexus Colors**:
```scss
$primary: #667eea;        // Main purple
$secondary: #764ba2;      // Dark purple
$accent: #f093fb;         // Pink accent
$success: #4caf50;        // Green
$warning: #ff9800;        // Orange
$danger: #f5576c;         // Red
$light: #f4f5f8;          // Light gray
$dark: #222428;           // Dark gray
```

### Dark Mode Support
**Ionic Dark Mode**: Automatically detects system preference

```scss
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #ffffff;
  }
}
```

---

## 10. Performance Optimization for Ionic

### Change Detection
```typescript
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientProfileComponent {
  // Reduces unnecessary change detection cycles
}
```

### Lazy Loading
```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'patient',
    loadComponent: () => import('./patient/patient.component')
      .then(m => m.PatientComponent)
  },
  {
    path: 'doctor',
    loadComponent: () => import('./doctor/doctor.component')
      .then(m => m.DoctorComponent)
  }
];
```

### Image Optimization
```html
<!-- Use responsive image sizes -->
<img
  srcset="image-sm.jpg 480w, image-md.jpg 768w, image-lg.jpg 1024w"
  sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
  src="image-md.jpg"
  alt="Description">
```

---

## 11. Testing on Native Devices

### iOS Testing
**Requirements**:
- macOS
- Xcode
- Apple Developer Account

**Process**:
1. Build app: `npm run build`
2. Add iOS: `ionic capacitor add ios`
3. Open Xcode: `ionic capacitor open ios`
4. Select device/simulator
5. Press Play to run

### Android Testing
**Requirements**:
- Android Studio
- Android SDK
- Android Virtual Device or Physical Device

**Process**:
1. Build app: `npm run build`
2. Add Android: `ionic capacitor add android`
3. Open Android Studio: `ionic capacitor open android`
4. Select device/emulator
5. Click Run

### Remote Testing
```bash
# Test on local network
ionic serve --external

# Access from other devices on network
http://YOUR_IP:8100
```

---

## 12. Common Ionic Mobile Patterns

### Pattern: Navigation with Back Button
```typescript
import { Location } from '@angular/common';

constructor(private location: Location) {}

goBack(): void {
  this.location.back();
}
```

### Pattern: Safe Area Navigation Header
```html
<ion-header class="ion-no-border">
  <ion-toolbar color="primary" class="safe-area-top">
    <ion-buttons slot="start">
      <ion-back-button></ion-back-button>
    </ion-buttons>
    <ion-title>{{pageTitle}}</ion-title>
  </ion-toolbar>
</ion-header>

<style>
  .safe-area-top {
    padding-top: var(--safe-area-inset-top);
  }
</style>
```

### Pattern: Keyboard-Aware Form
```typescript
export class LoginComponent {
  @HostListener('window:keyboardWillShow')
  onKeyboardShow(): void {
    this.formContainer.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
```

---

## 13. Deployment Checklist

### iOS App Store
- [ ] Update version number in `capacitor.config.ts`
- [ ] Generate icons and splash screens
- [ ] Create App Store Connect app
- [ ] Submit for review
- [ ] Handle TestFlight beta testing

### Google Play Store
- [ ] Update version number
- [ ] Generate icons and splash screens
- [ ] Create Google Play Console app
- [ ] Upload APK/AAB
- [ ] Complete app description and screenshots
- [ ] Submit for review

### Pre-Deployment Tests
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test offline functionality
- [ ] Test all navigation paths
- [ ] Test forms and validation
- [ ] Test camera/file access (if applicable)
- [ ] Check battery usage
- [ ] Verify secure data storage

---

## 14. Debugging Tools

### Ionic DevTools
```bash
# Enable remote debugging
ionic serve --devtools

# Access Chrome DevTools
chrome://inspect
```

### Console Logging (Development)
```typescript
console.log('[AppComponent] Platform:', this.platform.platforms());
console.log('[AppComponent] Is iOS:', this.platform.is('ios'));
console.log('[AppComponent] Safe area insets:', this.getSafeAreaInsets());
```

### Network Debugging
```typescript
// Intercept HTTP requests
import { HttpInterceptor } from '@angular/common/http';

// Log network activity for debugging
```

---

## 15. Migrating from Web to Native

### Step 1: Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

### Step 2: Add Platforms
```bash
npx cap add ios
npx cap add android
```

### Step 3: Sync Web Assets
```bash
npm run build
npx cap sync
```

### Step 4: Open Native IDE
```bash
npx cap open ios    # Xcode
npx cap open android # Android Studio
```

### Step 5: Update Configuration
```typescript
// capacitor.config.ts
server: {
  androidScheme: 'https'
}
```

---

## 16. Resources & Documentation

### Official Documentation
- [Ionic Framework Docs](https://ionicframework.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Ionic Native Plugins](https://ionicframework.com/docs/native)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Design Guidelines](https://developer.android.com/design)

### Useful Plugins
- `@capacitor/camera`: Camera access
- `@capacitor/geolocation`: GPS
- `@capacitor/contacts`: Contact management
- `@capacitor/file-system`: File management
- `@capacitor/push-notifications`: Push notifications
- `@capacitor/local-notifications`: Local notifications

---

## 17. Implementation Status

### Completed Ionic Features
- ✅ Ionic Angular Standalone Components
- ✅ Status Bar Customization (iOS/Android)
- ✅ Keyboard Plugin Integration
- ✅ Hardware Back Button Handling
- ✅ App State Listeners (Pause/Resume)
- ✅ Platform Detection
- ✅ Safe Area Support for Notches
- ✅ Dark Mode Support
- ✅ Responsive Layout System
- ✅ Touch Optimization

### Ready for Build
- ✅ Web development: `npm start`
- ✅ iOS build: `ionic capacitor build ios`
- ✅ Android build: `ionic capacitor build android`

---

## Notes

All pages in CareNexus have been optimized for Ionic deployment with:
1. **Capacitor integration** for native iOS/Android
2. **Platform-specific code paths** for iOS vs Android
3. **Native plugins** for enhanced functionality
4. **Safe area awareness** for notched devices
5. **Keyboard and back button handling**
6. **App lifecycle management**
7. **Status bar customization**

**Last Updated:** November 27, 2025
**Version:** 1.0
**Status:** Production Ready
