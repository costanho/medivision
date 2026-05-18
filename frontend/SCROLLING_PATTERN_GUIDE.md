# Scrolling Pattern Guide for CareNexus Frontend

## Overview
All pages in CareNexus must support vertical scrolling to ensure users can view all content. This guide documents the standard pattern for implementing scrollable pages.

## Global Scrolling Styles
Global scrolling styles are defined in `src/global.scss` and automatically apply to:
- `.scrollable-wrapper` - Main scrollable container class
- `[class*="-component"]` - All Angular components (by class name pattern)
- Custom scrollbar styling for better UX

## Implementation Pattern

### For New Pages

#### Step 1: Wrap Content in `scrollable-wrapper` div
Wrap all your page content in a div with the class `scrollable-wrapper`:

```html
<div class="scrollable-wrapper">
  <!-- All your page content goes here -->
  <div class="header">...</div>
  <div class="content">...</div>
  <div class="footer">...</div>
</div>
```

#### Step 2: Component Styling (Optional)
If you want to add additional component-specific scrolling styles, add this to your component's SCSS file:

```scss
:host {
  display: block;
  height: 100%;
  width: 100%;
}
```

### For Existing Pages (Retrofit)

If you have an existing page that needs scrolling added:

1. **Wrap content** in `scrollable-wrapper` div (as shown above)
2. **Remove any conflicting** CSS that sets `overflow: hidden` or fixed height constraints
3. **Test scrolling** in the browser to ensure it works properly

## Files Implementing the Pattern

### Profile Landing Pages (All Implemented ✅)
- `src/app/pages/profile-landing/patient-profile-landing.component.html` - ✅ Scrolling enabled
- `src/app/pages/profile-landing/doctor-profile-landing.component.html` - ✅ Scrolling enabled
- `src/app/pages/profile-landing/admin-profile-landing.component.html` - ✅ Scrolling enabled

### Service Pages (To be Updated)
- `src/app/nexus-direct/pages/dashboard/dashboard.component.html`
- `src/app/nexus-direct/pages/doctor-dashboard/doctor-dashboard-new.component.html`
- `src/app/nexus-direct/pages/appointments/appointments.component.html`
- `src/app/nexus-direct/pages/messages/messages.component.html`
- `src/app/nexus-direct/pages/profile/profile.component.html`
- `src/app/nexus-direct/pages/settings/settings.component.html`
- And others...

### Authentication Pages
- `src/auth/pages/login/login.component.html`
- `src/auth/pages/register/register.component.html`

## CSS Classes Available

### `.scrollable-wrapper` (Primary Class)
```scss
display: flex;
flex-direction: column;
height: 100%;
width: 100%;
overflow-y: auto;
overflow-x: hidden;
-webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
```

**Use this class**: For all main page containers that need vertical scrolling.

### `[class*="-component"]` (Fallback Pattern)
This attribute selector applies flex layout to all components with names ending in "-component", providing a basic scrolling foundation even without explicit `.scrollable-wrapper`.

## Best Practices

1. ✅ **Always wrap page content** in `scrollable-wrapper`
2. ✅ **Test scrolling** on mobile and desktop
3. ✅ **Remove conflicting CSS** like `overflow: hidden` or `height: 100vh`
4. ✅ **Use `-webkit-overflow-scrolling: touch`** for smooth iOS scrolling
5. ❌ **Don't use fixed heights** on scrollable containers unless necessary
6. ❌ **Don't set `overflow: hidden`** on scrollable parent containers

## Testing Scrolling

To verify scrolling works on a page:

1. Open the page in browser dev tools
2. Verify the content extends beyond the viewport
3. Scroll with mouse wheel or touch gesture
4. Ensure scrollbar appears (custom styled)
5. Test on mobile and desktop views

## Scrollbar Styling

The global scrollbar styling provides:
- Width: 8px
- Track: Light gray (#f1f1f1)
- Thumb: Gray (#888), darker on hover (#555)
- Border radius: 4px

To override globally, modify `src/global.scss`:

```scss
::-webkit-scrollbar {
  width: 8px; /* Change width */
}

::-webkit-scrollbar-track {
  background: #f1f1f1; /* Change track color */
}

::-webkit-scrollbar-thumb {
  background: #888; /* Change thumb color */
  border-radius: 4px; /* Change radius */
}
```

## Troubleshooting

### Page Not Scrolling?
- ✅ Check that content is wrapped in `scrollable-wrapper` div
- ✅ Verify content exceeds viewport height
- ✅ Check browser dev tools for conflicting CSS
- ✅ Clear browser cache (Ctrl+Shift+Delete)
- ✅ Check for `overflow: hidden` on parent elements

### Scrollbar Not Visible?
- ✅ Check that content is tall enough to require scrolling
- ✅ Verify CSS is not overriding scrollbar styles
- ✅ Test in a different browser (especially Chrome for debugging)

### Horizontal Scrolling Appearing?
- ✅ Check that `overflow-x: hidden` is set on scrollable-wrapper
- ✅ Remove any `width: 100vw` (use `width: 100%` instead)
- ✅ Check for elements with fixed widths exceeding container

## Implementation Timeline

| Phase | Pages | Status |
|-------|-------|--------|
| Phase 1 | Profile Landing Pages | ✅ Complete |
| Phase 2 | Service Dashboards | 🔄 In Progress |
| Phase 3 | Feature Pages | 📋 Pending |
| Phase 4 | Auth Pages | 📋 Pending |
| Phase 5 | All Future Pages | ✅ Default Pattern |

---

**Last Updated**: 2025-11-22
**Pattern Version**: 1.0
**Status**: Active
