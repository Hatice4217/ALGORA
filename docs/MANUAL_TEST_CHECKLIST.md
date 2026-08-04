# Manual Test Checklist - ALGORA

## Overview
Comprehensive manual testing checklist for ALGORA Web MVP.

## Test Environment
- [ ] Development server running (http://localhost:3000)
- [ ] Browser console open for error checking
- [ ] Network tab open for API monitoring
- [ ] Supabase project created and accessible
- [ ] OpenAI API key configured

---

## Phase 1: Landing Page Tests

### Visual Tests
- [ ] Page loads without errors
- [ ] ALGORA logo displays correctly
- [ ] Hero section renders properly
- [ ] Feature cards display correctly
- [ ] Pricing section is visible
- [ ] Footer displays properly

### Link Tests
- [ ] "Başla" button → Onboarding flow
- [ ] "Giriş Yap" → Login page
- [ ] "Kayıt Ol" → Register page
- [ ] Feature links work correctly
- [ ] Social media links (if any)
- [ ] Footer navigation links

### Responsive Tests
- [ ] Desktop (1920x1080) - layout correct
- [ ] Laptop (1366x768) - layout correct
- [ ] Tablet (768x1024) - mobile menu appears
- [ ] Mobile (375x667) - hamburger menu works
- [ ] All text is readable on mobile
- [ ] Buttons are tappable on mobile

### Performance Tests
- [ ] Initial page load < 3 seconds
- [ ] Lighthouse performance score > 80
- [ ] No console errors on load
- [ ] No memory leaks on navigation

---

## Phase 2: Authentication Tests

### Registration Flow
- [ ] Navigate to /auth/register
- [ ] Form validation works (empty fields)
- [ ] Email validation works (invalid email format)
- [ ] Password validation works (length check)
- [ ] Password confirmation matches
- [ ] Successful registration redirects to dashboard
- [ ] Error messages display correctly
- [ ] Loading states during registration

### Login Flow
- [ ] Navigate to /auth/login
- [ ] Email field validation works
- [ ] Password field validation works
- [ ] Remember me checkbox works
- [ ] Successful login redirects correctly
- [ ] Wrong password shows error
- [ ] Non-existent user shows error
- [ ] Loading states during login

### OAuth (Google) - Optional
- [ ] Google button is visible
- [ ] Clicking Google button opens OAuth popup
- [ ] Successful OAuth authentication works
- [ ] OAuth failure shows appropriate error

### Logout
- [ ] Logout button accessible
- [ ] Successful logout clears session
- [ ] Redirect to landing page after logout
- [ ] Protected routes inaccessible after logout

---

## Phase 3: Onboarding Flow Tests

### Step 1: Exam Type Selection
- [ ] Navigate to onboarding after registration
- [ ] TYT option selectable
- [ ] AYT option selectable
- [ ] LGS option selectable
- [ ] Selection saves correctly
- [ ] Next button enables after selection

### Step 2: Subject Selection
- [ ] Subjects display based on exam type
- [ ] Multiple subjects can be selected
- [ ] At least one subject required
- [ ] Selection visual feedback works
- [ ] Previous/Next navigation works

### Step 3: Goals & Schedule
- [ ] Target score input accepts valid range
- [ ] Study hours slider works
- [ ] Exam date picker works
- [ ] Form validation works
- [ ] Data saves to Supabase

### Step 4: Welcome/Dashboard Setup
- [ ] Welcome message displays
- [ ] Profile summary shows correctly
- [ ] "Start Learning" button works
- [ ] Redirects to dashboard

---

## Phase 4: Dashboard Tests

### Layout & Navigation
- [ ] Dashboard loads after onboarding
- [ ] User profile displays correctly
- [ ] Navigation menu works
- [ ] All sections accessible
- [ ] Responsive design works

### Stats Display
- [ ] Total questions answered shows
- [ ] Accuracy rate displays
- [ ] Study time visible
- [ ] Current streak shows
- [ ] Subject breakdown renders
- [ ] Progress charts work

### Quick Actions
- [ ] "Generate Question" button works
- [ ] "Start Session" button works
- [ ] "View History" button works
- [ ] All actions navigate correctly

---

## Phase 5: Question Generation Tests

### AI Question Generation
- [ ] Question generation interface loads
- [ ] Subject selector works
- [ ] Topic selector populates based on subject
- [ ] Difficulty selector works
- [ ] Generate button triggers API call
- [ ] Loading state displays during generation
- [ ] Generated question displays correctly
- [ ] Question text is Turkish
- [ ] 4 choices display
- [ ] Explanation is available
- [ ] Error handling works (API failure)

### Question Display
- [ ] Question text is readable
- [ ] Choices are clickable
- [ ] Hover states work
- [ ] Selected choice highlights
- [ ] Submit button enables after selection

### Answer Submission
- [ ] Submit button works
- [ ] Correct answer shows green
- [ ] Wrong answer shows red
- [ ] Explanation displays after answering
- [ ] "Next Question" button works
- [ ] Progress updates in real-time

---

## Phase 6: Database Integration Tests

### Supabase Connection
- [ ] User profile saves to database
- [ ] Questions save to database
- [ ] Answers save to database
- [ ] Study sessions save to database

### Data Retrieval
- [ ] User stats load correctly
- [ ] Question history loads
- [ ] Subject breakdown works
- [ ] Recent activity displays

### Real-time Updates
- [ ] Stats update after answering
- [ ] Streak counter works
- [ ] Progress bars update
- [ ] No race conditions

---

## Phase 7: Error Handling Tests

### API Errors
- [ ] OpenAI API timeout handled
- [ ] OpenAI rate limit handled
- [ ] Supabase connection error handled
- [ ] Network error shows user-friendly message

### Validation Errors
- [ ] Form validation displays correctly
- [ ] Required field errors show
- [ ] Format validation works
- [ ] Error messages are Turkish

### Edge Cases
- [ ] Empty state displays correctly
- [ ] No questions generated shows message
- [ ] Session timeout handled
- [ ] Refresh on protected route redirects

---

## Phase 8: Performance Tests

### Page Load Times
- [ ] Landing page < 2s
- [ ] Auth pages < 1.5s
- [ ] Dashboard < 2s
- [ ] Question generation < 5s (API)

### API Response Times
- [ ] Question generation < 5s
- [ ] User stats < 1s
- [ ] Answer submission < 500ms

### Memory & Resources
- [ ] No memory leaks on navigation
- [ ] Images optimized
- [ ] No unnecessary re-renders
- [ ] Bundle size optimized

---

## Phase 9: Accessibility Tests

### Keyboard Navigation
- [ ] Tab order logical
- [ ] Enter key works for forms
- [ ] Escape key closes modals
- [ ] Focus indicators visible

### Screen Reader
- [ ] Alt text for images
- [ ] ARIA labels for buttons
- [ ] Form labels associated
- [ ] Error messages announced

### Color & Contrast
- [ ] Text contrast ratio > 4.5:1
- [ ] Color not only indicator
- [ ] Focus states visible

---

## Phase 10: Cross-Browser Tests

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (if on Mac)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Samsung Internet

---

## Test Results Summary

### Test Date: ___________
### Tester: ___________

| Category | Total | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| Landing Page | _ | _ | _ | _ |
| Authentication | _ | _ | _ | _ |
| Onboarding | _ | _ | _ | _ |
| Dashboard | _ | _ | _ | _ |
| Question Gen | _ | _ | _ | _ |
| Database | _ | _ | _ | _ |
| Error Handling | _ | _ | _ | _ |
| Performance | _ | _ | _ | _ |
| Accessibility | _ | _ | _ | _ |
| Cross-Browser | _ | _ | _ | _ |
| **TOTAL** | _ | _ | _ | _ |

### Critical Bugs Found:
1.
2.
3.

### Non-Critical Issues:
1.
2.
3.

### Recommendations:
-
-

---

**Last Updated:** July 14, 2026
**Status:** Ready for Testing
**Next Step:** Execute checklist and document results
