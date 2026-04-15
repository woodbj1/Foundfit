# Mobile App Runtime Issues Analysis

## Summary
Analysis of `apps/mobile/src` identified **8 critical and high-priority issues** across navigation, error handling, null/undefined handling, and API calls.

---

## Issues Found

### 1. **Missing Non-Null Assertion Safety in Dashboard**
**File:** [apps/mobile/src/app/(app)/dashboard.tsx](apps/mobile/src/app/(app)/dashboard.tsx#L190)  
**Severity:** HIGH  
**Issue:** Non-null assertion on `data.access.libraryAccess!.accessUrl` without verifying the object exists.
```typescript
// Line 190 - UNSAFE
onPress={() => openExternalUrl(data.access.libraryAccess!.accessUrl)}
```
**Problem:** If `libraryAccess` becomes null at runtime (server state changes), this will crash with "Cannot read property 'accessUrl' of null"  
**Fix:** Add null check before using the object

---

### 2. **Potential JSON Parsing Error in API Layer**
**File:** [apps/mobile/src/lib/api.ts](apps/mobile/src/lib/api.ts#L30)  
**Severity:** HIGH  
**Issue:** `JSON.parse()` is called without try-catch wrapper, can throw `SyntaxError` if response is malformed.
```typescript
// Line 30 - UNPROTECTED
const data = text ? JSON.parse(text) : null
```
**Problem:** Invalid JSON response from server will throw uncaught error, crashing the app or leaving it in error state  
**Fix:** Wrap in try-catch, or use a safer parser with fallback

---

### 3. **Missing Optional Chaining on Trainer Timezone**
**File:** [apps/mobile/src/app/(app)/book.tsx](apps/mobile/src/app/(app)/book.tsx#L119-L127)  
**Severity:** MEDIUM  
**Issue:** `selectedTrainer?.timezone` is used with fallback, but `selectedTrainer` could be null in other operations.
```typescript
// Lines 119-127 - Inconsistent null handling
const pinnedTrainer = context?.trainers.find((trainer) => trainer.id === selectedService.trainerId) || null
setSelectedTrainer(pinnedTrainer)
// Later: pinnedTrainer could be null but is used without guards in other calculations
```
**Problem:** If `pinnedTrainer` is null and used later without optional chaining, causes runtime errors  
**Fix:** Add explicit null check or use optional chaining consistently

---

### 4. **Unsafe Array Access in Library Screen Modal**
**File:** [apps/mobile/src/app/(app)/library.tsx](apps/mobile/src/app/(app)/library.tsx#L305-L325)  
**Severity:** HIGH  
**Issue:** Modal renders `selectedExercise` properties without defensive checks inside the Modal JSX.
```typescript
// Lines 309-321 - INSIDE Modal, assumes selectedExercise is not null
{selectedExercise.howTo.map((step, index) => (
  <Text style={styles.exerciseStep}>{step}</Text>
))}
```
**Problem:** Even though modal checks `visible={Boolean(selectedExercise)}`, if `selectedExercise` is null when accessing properties inside JSX, it will crash  
**Fix:** Add explicit null check before accessing properties, or restructure Modal content

---

### 5. **Unhandled Promise Rejection in Calendar Addition**
**File:** [apps/mobile/src/app/(app)/sessions.tsx](apps/mobile/src/app/(app)/sessions.tsx#L137-L143)  
**Severity:** MEDIUM  
**Issue:** `addSessionToCalendar()` is async but the Promise chain doesn't have a dedicated catch block in one branch.
```typescript
// Line 137-143 - Async promise without full error handling
async function handleAddToCalendar(booking: MobileBooking) {
  try {
    await addSessionToCalendar(booking)
    Alert.alert('Added to calendar', 'The session is now in your device calendar.')
  } catch (error) {
    Alert.alert('Could not add to calendar', error instanceof Error ? error.message : 'Please try again.')
  }
}
```
**Problem:** While this has try-catch, if `addSessionToCalendar()` rejects before line 100 check, it could propagate uncaught  
**Fix:** Already properly handled - this is good pattern to follow in other functions

---

### 6. **Unsafe Calendar Event Notes Construction**
**File:** [apps/mobile/src/lib/calendar.ts](apps/mobile/src/lib/calendar.ts#L36-L43)  
**Severity:** MEDIUM  
**Issue:** `booking.notes` and `joinUrl` are used in notes string without nil checks after filter(Boolean).
```typescript
// Lines 36-43 - UNSAFE
const notes = [
  `Trainer: ${booking.trainerName}`,
  `Service: ${booking.serviceName}`,
  // ...
  booking.notes ? `Notes: ${booking.notes}` : null,
  joinUrl ? `Join link: ${joinUrl}` : null,
]
  .filter(Boolean)
  .join('\n')
```
**Problem:** If `booking.trainerName` or `booking.serviceName` is null/undefined, string interpolation creates "undefined" strings  
**Fix:** Add defensive checks: `booking.trainerName || 'Unknown Trainer'`

---

### 7. **Missing Error Boundary for API Failures in Profile Load**
**File:** [apps/mobile/src/app/(app)/profile.tsx](apps/mobile/src/app/(app)/profile.tsx#L43-L52)  
**Severity:** MEDIUM  
**Issue:** `loadProfile()` has no error handling for API failures, silently fails leaving `loading` state.
```typescript
// Lines 43-52 - NO ERROR HANDLING
const loadProfile = useCallback(async () => {
  if (!session?.access_token) return

  try {
    setLoading(true)
    const response = await apiRequest<MobileDashboardResponse>('/api/mobile/dashboard', {
      accessToken: session.access_token,
    })
    setData(response)
  } finally {
    setLoading(false)
  }
}, [session?.access_token])
```
**Problem:** If API fails, no catch block, so user sees loading state indefinitely with no error message  
**Fix:** Add catch block with `Alert.alert()` like other screens

---

### 8. **Race Condition: Session Access Token Null Check**
**File:** [apps/mobile/src/app/(app)/dashboard.tsx](apps/mobile/src/app/(app)/dashboard.tsx#L32-L48)  
**Severity:** MEDIUM  
**Issue:** Early return if `!session?.access_token` but session could become null between check and API call.
```typescript
// Lines 32-35 - RACE CONDITION
const loadDashboard = useCallback(async (showRefresh = false) => {
  if (!session?.access_token) return  // Early return

  try {
    // ... 
    const response = await apiRequest<MobileDashboardResponse>('/api/mobile/dashboard', {
      accessToken: session.access_token,  // Could be null if session cleared
    })
```
**Problem:** Between the check and the async call, `session` could become null (user logged out), causing `undefined` to be passed as token  
**Fix:** Capture `session.access_token` in a local variable at the top of function, or add inline check on usage

---

## Additional Code Quality Notes

### Minor Issues (Non-blocking):
1. **Type Safety:** `formatPrice()` function returns `number | null` but return type is not explicitly annotated
2. **Consistency:** Some screens show error alerts on API failure, others don't (Profile screen missing error handling)
3. **Calendar Permissions:** `addSessionToCalendar()` requests permissions every time, consider caching result

### Good Practices Found:
✅ Proper error boundary implementation in `_layout.tsx`  
✅ Runtime error monitoring via `getLatestRuntimeError()` and subscription pattern  
✅ Consistent use of loading/refreshing states  
✅ Proper cleanup with `isMounted` flag in AuthProvider  
✅ Type-safe route parameters with TypeScript strict mode  

---

## Recommended Priority Fixes

1. **HIGH:** Issue #2 - JSON parsing error handling in API layer
2. **HIGH:** Issue #4 - Modal null safety in Library screen
3. **HIGH:** Issue #1 - Non-null assertion on libraryAccess
4. **MEDIUM:** Issue #7 - Add error handling to Profile load
5. **MEDIUM:** Issue #3 - Consistent optional chaining in Book flow
6. **MEDIUM:** Issue #8 - Session token race condition

---

## Testing Recommendations

- Test network errors during API calls (mock 500, timeout responses)
- Logout while async operations are in flight
- Test with missing/invalid profile data from backend
- Test calendar permission denial
- Test with null/undefined values in booking data from API
