# Mobile Responsive Test Plan - ALGORA

## Overview
Comprehensive mobile responsive testing strategy for ALGORA Web MVP.

## Test Devices & Viewports

### Desktop Viewports
- **Large Desktop:** 1920x1080 (16:9)
- **Standard Desktop:** 1366x768 (16:9)
- **Small Desktop:** 1280x720 (16:9)

### Tablet Viewports
- **iPad Pro:** 1024x768 (4:3)
- **iPad:** 768x1024 (4:3)
- **Tablet Landscape:** 1024x768
- **Tablet Portrait:** 768x1024

### Mobile Viewports
- **iPhone 14 Pro Max:** 430x932 (19.5:9)
- **iPhone 14:** 390x844 (19.5:9)
- **iPhone SE:** 375x667 (16:9)
- **Android Large:** 412x915 (19.5:9)
- **Android Small:** 360x800 (20:9)

### Testing Tools
- Chrome DevTools Device Emulation
- Real device testing (optional)
- Browser responsive mode
- Lighthouse mobile audit

---

## Page-by-Page Tests

## 1. Landing Page (`/`)

### Desktop (> 1024px)
- [ ] Hero section full width
- [ ] Feature cards in grid (3 columns)
- [ ] Pricing cards in row (3 columns)
- [ ] CTA buttons prominent
- [ ] Navigation bar horizontal
- [ ] Footer columns layout

### Tablet (768px - 1023px)
- [ ] Hero section adapts
- [ ] Feature cards 2 columns
- [ ] Pricing cards 2 columns or stacked
- [ ] Navigation adapts
- [ ] Touch targets ≥ 48px

### Mobile (< 768px)
- [ ] Hamburger menu appears
- [ ] Menu drawer works smoothly
- [ ] Hero text readable
- [ ] Feature cards 1 column
- [ ] Pricing cards stacked
- [ ] CTA buttons full width
- [ ] Footer stacked vertically

### Mobile Specific
- [ ] No horizontal scrolling
- [ ] Text size ≥ 16px (no zoom needed)
- [ ] Buttons tappable (min 44x44px)
- [ ] Images scale properly
- [ ] Carousel works (if any)

---

## 2. Authentication Pages

### Login Page (`/auth/login`)

#### Desktop
- [ ] Form centered
- [ ] Social login buttons visible
- [ ] Input fields adequate width

#### Tablet
- [ ] Form still centered
- [ ] Input fields comfortable
- [ ] Touch targets adequate

#### Mobile
- [ ] Form uses full width
- [ ] Input fields stacked
- [ ] Buttons full width
- [ ] No horizontal scroll
- [ ] Keyboard doesn't hide inputs

### Register Page (`/auth/register`)

#### Desktop
- [ ] Multi-column form layout
- [ ] Terms checkbox visible

#### Tablet
- [ ] Form adapts to 2 columns
- [ ] All fields visible

#### Mobile
- [ ] Single column form
- [ ] Terms checkbox accessible
- [ ] All fields visible without scroll

---

## 3. Onboarding Flow

### Step 1: Exam Type Selection

#### All Screen Sizes
- [ ] Cards stack vertically on mobile
- [ ] Selection visual feedback clear
- [ ] Navigation buttons visible

#### Mobile Specific
- [ ] Cards tappable
- [ ] No accidental selections
- [ ] Progress indicator visible

### Step 2: Subject Selection

#### Desktop
- [ ] Grid layout (3-4 columns)
- [ ] All subjects visible

#### Tablet
- [ ] Grid adapts (2-3 columns)
- [ ] Scroll if needed

#### Mobile
- [ ] Single column or 2-column grid
- [ ] Checkboxes tappable
- [ ] Scroll works smoothly

### Step 3: Goals & Schedule

#### Desktop
- [ ] Form fields in grid
- [ ] Date picker usable

#### Tablet
- [ ] Form fields stack
- [ ] Date picker still usable

#### Mobile
- [ ] All fields stacked
- [ ] Slider control works with touch
- [ ] Date picker native (iOS/Android)
- [ ] No horizontal scrolling

---

## 4. Dashboard

### Layout

#### Desktop
- [ ] Sidebar navigation
- [ ] Main content area
- [ ] Stats in grid
- [ ] Charts visible

#### Tablet
- [ ] Collapsible sidebar
- [ ] Stats adapt to 2 columns
- [ ] Charts still readable

#### Mobile
- [ ] Bottom navigation or hamburger menu
- [ ] Stats stacked vertically
- [ ] Charts scaled or hidden
- [ ] Quick actions accessible

### Components

#### Stats Cards
- [ ] Desktop: Grid layout
- [ ] Tablet: 2 columns
- [ ] Mobile: Stacked, full width

#### Subject Breakdown
- [ ] Desktop: Horizontal bar chart
- [ ] Tablet: Adapted chart
- [ ] Mobile: Vertical list or simple bars

#### Quick Actions
- [ ] Desktop: Buttons in row
- [ ] Tablet: 2 rows if needed
- [ ] Mobile: Stacked, full width

---

## 5. Question Interface

### Question Display

#### Desktop
- [ ] Question and choices side-by-side or centered
- [ ] Explanation in modal or side panel

#### Tablet
- [ ] Question and choices stacked
- [ ] Explanation in modal

#### Mobile
- [ ] Single column layout
- [ ] Choices full-width buttons
- [ ] Explanation in expandable section
- [ ] No horizontal scroll

### Answer Selection

#### Mobile Specific
- [ ] Choice buttons tappable (min 44px height)
- [ ] Selection visual feedback clear
- [ ] Submit button fixed at bottom (sticky)
- [ ] Explanation scrolls into view after answer

### Timer/Progress
- [ ] Visible on all screen sizes
- [ ] Doesn't cover content on mobile
- [ ] Touch-friendly controls

---

## Navigation & Menus

### Desktop Navigation
- [ ] Top navigation bar
- [ ] Hover states work
- [ ] Dropdown menus usable

### Tablet Navigation
- [ ] Navigation adapts
- [ ] Touch targets adequate
- [ ] Dropdown still usable

### Mobile Navigation
- [ ] Hamburger menu appears
- [ ] Menu drawer slides smoothly
- [ ] Full-screen menu overlay
- [ ] Close button accessible
- [ ] All links tappable

---

## Touch Interaction Tests

### General Touch Targets
- [ ] All buttons ≥ 44x44px
- [ ] Links in lists adequate height
- [ ] Form inputs ≥ 44px height
- [ ] Checkboxes/radios tappable
- [ ] Sliders touch-friendly

### Gestures
- [ ] Swipe works where expected
- [ ] Scroll smooth
- [ ] Pinch zoom (if needed)
- [ ] No accidental triggers

### Mobile Specific
- [ ] No hover-only interactions
- [ ] Active states visible
- [ ] Feedback on touch
- [ ] No delayed reactions

---

## Typography & Readability

### Font Sizes
- [ ] Body text ≥ 16px on mobile
- [ ] Headings scale appropriately
- [ ] No text truncation (unless intentional)
- [ ] Line height comfortable

### Text Rendering
- [ ] No blurry text
- [ ] Text doesn't overflow containers
- [ ] Long text wraps properly
- [ ] Contrast ratios met

---

## Image & Media Tests

### Images
- [ ] Images scale responsively
- [ ] No horizontal scroll from images
- [ ] Images load optimized sizes
- [ ] Alt text present
- [ ] No broken images

### Videos/Animations
- [ ] Videos scale properly
- [ ] Don't autoplay on mobile (unless intentional)
- [ ] Controls accessible

---

## Performance Tests

### Load Times (Mobile)
- [ ] Initial load < 3s on 4G
- [ ] Page transitions smooth
- [ ] No laggy scrolling
- [ ] Touch response immediate

### Resource Optimization
- [ ] Images WebP/WebM format
- [ ] CSS/JS minified
- [ ] Lazy loading implemented
- [ ] Code splitting working

---

## Device-Specific Tests

### iOS Safari
- [ ] No bounce on scroll
- [ ] Safe areas respected
- [ ] Date picker native
- [ ] No 300ms delay
- [ ] Back button cache handled

### Android Chrome
- [ ] Date picker native
- [ ] Text selection works
- [ ] Back button handling
- [ ] Toolbar doesn't cover content

### Cross-Device
- [ ] Consistent experience
- [ ] Progressive enhancement
- [ ] Graceful degradation

---

## Accessibility on Mobile

### Screen Readers
- [ ] VoiceOver (iOS) compatible
- [ ] TalkBack (Android) compatible
- [ ] Semantic HTML used
- [ ] ARIA labels where needed

### Zoom & Magnification
- [ ] 200% zoom usable
- [ ] Text-only zoom works
- [ ] No horizontal scroll at 200%

---

## Orientation Tests

### Portrait Mode
- [ ] All pages usable
- [ ] No broken layouts
- [ ] Navigation accessible

### Landscape Mode
- [ ] Content adapts
- [ ] No horizontal scroll
- [ ] Navigation still works
- [ ] Forms usable

---

## Browser Compatibility

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Samsung Internet
- [ ] Firefox Mobile

### Tablet Browsers
- [ ] Chrome Tablet
- [ ] Safari iPad
- [ ] Firefox Tablet

---

## Test Results

### Viewport Testing Results

| Viewport | Landing | Auth | Onboarding | Dashboard | Questions |
|----------|---------|------|------------|-----------|-----------|
| 1920x1080 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 1366x768 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 1024x768 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 768x1024 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 375x667 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 360x800 | [ ] | [ ] | [ ] | [ ] | [ ] |

### Device Testing Results

| Device Type | Pass | Fail | Issues |
|-------------|------|------|--------|
| Desktop | [ ] | [ ] | |
| Tablet | [ ] | [ ] | |
| Mobile | [ ] | [ ] | |

### Issues Found
1.
2.
3.

---

## Testing Checklist Summary

- [ ] All viewports tested
- [ ] Real devices tested
- [ ] Touch interactions verified
- [ ] Orientation changes tested
- [ ] Performance benchmarks met
- [ ] Accessibility verified
- [ ] Cross-browser tested

---

**Last Updated:** July 14, 2026
**Status:** Ready for Testing
**Next Step:** Execute tests across all viewports
