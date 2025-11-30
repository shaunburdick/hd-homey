# User Invitations - Manual Testing Guide

This guide provides comprehensive test cases for the User Invitations feature (SPEC-010).

## Prerequisites

1. **Development environment running**: `npm run dev`
2. **Admin account**: You need an existing admin user to test invitation creation
3. **Browser with dev tools**: For inspecting network requests and console

## Test Scenarios

### 1. Happy Path - Complete Invitation Flow

**Objective**: Verify the complete user invitation and redemption flow works end-to-end.

**Steps**:
1. **Sign in as admin**
   - Navigate to `/users/signin`
   - Sign in with admin credentials
   - Verify redirect to home page

2. **Navigate to Invitations**
   - Go to `/settings`
   - Click on "User Invitations" link
   - Verify you land on `/settings/invitations`

3. **Create an Invitation**
   - Select role: "Viewer"
   - Add note: "Test invitation for QA"
   - Click "Create Invitation"
   - **Expected**: Success message appears with invitation URL
   - **Expected**: Invitation appears in the list with "Pending" status
   - Copy the invitation URL

4. **Redeem the Invitation** (use incognito/different browser)
   - Navigate to the copied invitation URL
   - **Expected**: See "Create Your Account" page
   - **Expected**: Invitation details show (role: Viewer, note: "Test invitation for QA")
   - Fill in username: "testuser"
   - Fill in password: "testpass123"
   - Fill in password confirmation: "testpass123"
   - Click "Create Account"
   - **Expected**: Auto-signed in and redirected to home page

5. **Verify Invitation Status**
   - Sign out and sign back in as admin
   - Go to `/settings/invitations`
   - **Expected**: The invitation now shows "Used" status
   - **Expected**: Shows "Used by: testuser" with timestamp

**Result**: ✅ PASS / ❌ FAIL

---

### 2. Invitation Validation - Invalid Token

**Objective**: Verify proper error handling for invalid invitation URLs.

**Steps**:
1. Navigate to `/invite/invalid-token-12345`
2. **Expected**: See "Invalid Invitation" error page
3. **Expected**: Error message: "This invitation link is invalid or does not exist."
4. **Expected**: "Return to Home" link is present
5. Click "Return to Home"
6. **Expected**: Navigate to `/` (home page)

**Result**: ✅ PASS / ❌ FAIL

---

### 3. Invitation Expiration

**Objective**: Verify expired invitations cannot be redeemed.

**Setup**: You'll need to manually test this by either:
- Option A: Create an invitation and manually update the database to set `expires_at` to past date
- Option B: Set `calculateExpirationDate()` to return a date 1 second in future, wait, then test

**Steps**:
1. Navigate to expired invitation URL
2. **Expected**: See "Invalid Invitation" error page
3. **Expected**: Error message: "This invitation has expired. Please contact an administrator for a new invitation."

**Result**: ✅ PASS / ❌ FAIL

---

### 4. Already Used Invitation

**Objective**: Verify that used invitations cannot be redeemed again.

**Steps**:
1. Create and redeem an invitation (see Happy Path test)
2. Try to navigate to the same invitation URL again
3. **Expected**: See "Invalid Invitation" error page
4. **Expected**: Error message: "This invitation has already been used."

**Result**: ✅ PASS / ❌ FAIL

---

### 5. Revoked Invitation

**Objective**: Verify that revoked invitations cannot be redeemed.

**Steps**:
1. As admin, create a new invitation
2. Copy the invitation URL
3. Before redeeming, click "Revoke" button on the invitation card
4. Confirm revocation in the dialog
5. **Expected**: Invitation status changes to "Revoked"
6. Navigate to the copied invitation URL (in incognito/different browser)
7. **Expected**: See "Invalid Invitation" error page
8. **Expected**: Error message: "This invitation has been revoked by an administrator."

**Result**: ✅ PASS / ❌ FAIL

---

### 6. Form Validation - Username

**Objective**: Verify username field validation works correctly.

**Steps**:
1. Create an invitation and navigate to redemption page
2. Leave username field empty
3. Fill in password fields
4. Submit form
5. **Expected**: Error message appears for username field
6. Fill in username with existing username from database
7. Submit form
8. **Expected**: Error message: "Username already exists" or similar

**Result**: ✅ PASS / ❌ FAIL

---

### 7. Form Validation - Password Mismatch

**Objective**: Verify password confirmation validation.

**Steps**:
1. Create an invitation and navigate to redemption page
2. Fill in username: "testuser2"
3. Fill in password: "password123"
4. Fill in password confirmation: "password456" (different!)
5. Submit form
6. **Expected**: Error message: "Passwords do not match" or similar

**Result**: ✅ PASS / ❌ FAIL

---

### 8. Form Validation - Short Password

**Objective**: Verify minimum password length validation.

**Steps**:
1. Create an invitation and navigate to redemption page
2. Fill in username: "testuser3"
3. Fill in password: "short" (less than 8 characters)
4. Fill in password confirmation: "short"
5. Submit form
6. **Expected**: Error message about minimum password length

**Result**: ✅ PASS / ❌ FAIL

---

### 9. Multiple Invitations Management

**Objective**: Verify admin can manage multiple invitations.

**Steps**:
1. As admin, navigate to `/settings/invitations`
2. Create 3 invitations:
   - Role: Admin, Note: "Admin invitation"
   - Role: Viewer, Note: "Viewer invitation 1"
   - Role: Viewer, Note: "Viewer invitation 2"
3. **Expected**: All 3 invitations appear in the list
4. **Expected**: Each shows correct role badge
5. **Expected**: Notes are displayed correctly
6. Redeem the first invitation
7. Refresh the page
8. **Expected**: First invitation shows "Used" status
9. **Expected**: Other two remain "Pending"
10. Revoke the second invitation
11. **Expected**: Second invitation shows "Revoked" status

**Result**: ✅ PASS / ❌ FAIL

---

### 10. Admin Role Assignment

**Objective**: Verify that users created via admin invitations get admin role.

**Steps**:
1. As admin, create invitation with role: "Admin"
2. Copy invitation URL
3. Redeem invitation (incognito/different browser)
4. Create account: username "newadmin", password "adminpass123"
5. After auto-sign-in, navigate to `/settings`
6. **Expected**: Settings page loads successfully (confirms admin access)
7. **Expected**: Can see "User Invitations" link

**Result**: ✅ PASS / ❌ FAIL

---

### 11. Viewer Role Restrictions

**Objective**: Verify that users created via viewer invitations cannot access admin features.

**Steps**:
1. As admin, create invitation with role: "Viewer"
2. Copy invitation URL
3. Redeem invitation (incognito/different browser)
4. Create account: username "newviewer", password "viewerpass123"
5. After auto-sign-in, try to navigate directly to `/settings`
6. **Expected**: Redirected to `/forbidden` or similar
7. Try to navigate to `/settings/invitations`
8. **Expected**: Redirected to `/forbidden` or similar

**Result**: ✅ PASS / ❌ FAIL

---

### 12. Copy Invitation URL

**Objective**: Verify the "Copy" button works correctly.

**Steps**:
1. As admin, create a new invitation
2. After success, click the "Copy" button
3. **Expected**: Button text changes to "✓ Copied!"
4. **Expected**: Button returns to "Copy" after 2 seconds
5. Paste the clipboard contents
6. **Expected**: Valid invitation URL is pasted

**Result**: ✅ PASS / ❌ FAIL

---

### 13. Navigation and Accessibility

**Objective**: Verify navigation flows and accessibility.

**Steps**:
1. On invitation redemption page, verify:
   - "Already have an account? Sign in" link exists
   - Click it, verify navigation to `/users/signin`
2. On invalid invitation page, verify:
   - "Return to Home" link exists
   - Click it, verify navigation to `/`
3. Test keyboard navigation:
   - Tab through form fields
   - Submit form with Enter key

**Result**: ✅ PASS / ❌ FAIL

---

## Edge Cases to Test

### A. Concurrent Redemption Attempts

**Scenario**: Two users try to redeem the same invitation simultaneously.

**Expected**: Only the first one succeeds, second sees "already used" error.

### B. Browser Back Button After Redemption

**Scenario**: After successfully redeeming, click browser back button.

**Expected**: Should not allow re-submission. Form should be in success state or redirect.

### C. Long Note Fields

**Scenario**: Create invitation with 200-character note (max length).

**Expected**: Note saves and displays correctly, no truncation issues.

### D. Special Characters in Username

**Scenario**: Try creating account with username containing special characters.

**Expected**: Follow application's username validation rules consistently.

---

## Automation Test Coverage

The following scenarios are covered by automated tests (69 tests total):

✅ Token generation (crypto-secure, URL-safe)
✅ Invitation validation logic
✅ Status determination (pending/used/expired/revoked)
✅ Database queries and relations
✅ Admin authorization checks
✅ Form data validation
✅ Password hashing and account creation
✅ Auto-sign-in after redemption

---

## Bug Reporting Template

If you find issues, please report them with:

```markdown
### Bug: [Brief Description]

**Environment**: Development / Production
**User Role**: Admin / Viewer / Unauthenticated
**Browser**: Chrome/Firefox/Safari [version]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:


**Actual Behavior**:


**Screenshots/Console Errors**:


**Database State** (if relevant):
- Invitation status:
- User count:
```

---

## Performance Considerations

- **Invitation List Loading**: With 100+ invitations, verify page loads in < 2s
- **Form Submission**: Redemption should complete in < 1s
- **Database Queries**: Check console for N+1 query issues

---

## Security Checklist

- [ ] Invitation URLs use crypto-secure random tokens
- [ ] Tokens are URL-safe (no special characters)
- [ ] Passwords are hashed before storage
- [ ] Admin actions require authentication + authorization
- [ ] Public redemption page doesn't leak sensitive data
- [ ] CSRF protection via Next.js form actions
- [ ] No SQL injection vulnerabilities in queries

---

## Test Completion Summary

| Test # | Scenario | Status | Notes |
|--------|----------|--------|-------|
| 1 | Happy Path | ⬜ | |
| 2 | Invalid Token | ⬜ | |
| 3 | Expired Invitation | ⬜ | Requires DB manipulation |
| 4 | Already Used | ⬜ | |
| 5 | Revoked Invitation | ⬜ | |
| 6 | Username Validation | ⬜ | |
| 7 | Password Mismatch | ⬜ | |
| 8 | Short Password | ⬜ | |
| 9 | Multiple Invitations | ⬜ | |
| 10 | Admin Role | ⬜ | |
| 11 | Viewer Role | ⬜ | |
| 12 | Copy URL | ⬜ | |
| 13 | Navigation | ⬜ | |

**Overall Status**: ⬜ Not Started / 🟡 In Progress / ✅ Complete

**Tested By**: _______________
**Date**: _______________
**Approval**: _______________
