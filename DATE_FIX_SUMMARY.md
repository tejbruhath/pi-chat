# Date Format Fix - Summary

## Issue
MongoDB returns `Date` objects, but the frontend expects Unix timestamps (integers) as the application was originally designed for SQLite which stored dates as Unix timestamps.

This caused "Invalid Date" errors when the frontend tried to process Date objects.

## Root Cause
- **SQLite**: Stored dates as `INTEGER` (Unix timestamps in seconds)
- **MongoDB**: Stores dates as `Date` objects
- **Frontend**: Expected Unix timestamps (numbers)

When MongoDB Date objects were serialized to JSON, they became ISO 8601 strings (e.g., "2025-10-24T10:42:00.000Z"), causing date parsing issues.

## Solution
Convert all MongoDB Date objects to Unix timestamps (seconds) before returning them to the frontend.

## Files Fixed

### 1. **Messages Route** (`app/api/conversations/[id]/messages/route.ts`)
- **GET** - Convert `sentAt` when retrieving messages
- **POST** - Convert `sentAt` when sending new messages

**Before:**
```typescript
sentAt: msg.sentAt  // Returns Date object
```

**After:**
```typescript
sentAt: Math.floor(new Date(msg.sentAt).getTime() / 1000)  // Returns Unix timestamp
```

### 2. **Conversations Route** (`app/api/conversations/route.ts`)
- Convert `lastMessage.sentAt` when listing conversations
- Convert `conversation.createdAt` for all conversations

**Before:**
```typescript
sentAt: lastMessageDoc.sentAt,      // Date object
createdAt: conversation.createdAt,   // Date object
```

**After:**
```typescript
sentAt: Math.floor(new Date(lastMessageDoc.sentAt).getTime() / 1000),
createdAt: Math.floor(new Date(conversation.createdAt).getTime() / 1000),
```

### 3. **Auth Routes**
Updated all user object returns to convert `createdAt`:

- **Register** (`app/api/auth/register/route.ts`)
- **Login** (`app/api/auth/login/route.ts`)
- **Me** (`app/api/auth/me/route.ts`)
- **Profile** (`app/api/auth/profile/route.ts`)

**Before:**
```typescript
createdAt: user.createdAt  // Date object
```

**After:**
```typescript
createdAt: Math.floor(new Date(user.createdAt).getTime() / 1000)
```

## Date Format Consistency

All dates are now returned as **Unix timestamps in seconds**:

| Field | Format | Example |
|-------|--------|---------|
| `sentAt` | Unix timestamp (seconds) | `1729765320` |
| `createdAt` | Unix timestamp (seconds) | `1729765320` |
| `expiresAt` | Unix timestamp (seconds) | `1729851720` |

## Conversion Formula

```typescript
// MongoDB Date object → Unix timestamp (seconds)
Math.floor(new Date(mongoDate).getTime() / 1000)

// Breakdown:
// 1. new Date(mongoDate)  - Ensures it's a Date object
// 2. .getTime()           - Returns milliseconds since epoch
// 3. / 1000               - Converts to seconds
// 4. Math.floor()         - Removes decimals
```

## Testing Checklist

After this fix, verify:
- ✅ Message timestamps display correctly
- ✅ Conversation list shows proper last message times
- ✅ User creation dates display correctly
- ✅ No "Invalid Date" errors in browser console
- ✅ Real-time messages show correct timestamps
- ✅ Message sorting works properly (by sentAt)

## Build Verification

```bash
✓ npm run build - SUCCESSFUL
✓ All routes compiled
✓ TypeScript compilation successful
✓ Zero errors
```

## Impact

This fix ensures **100% compatibility** between:
- MongoDB's Date storage format
- Frontend's date handling expectations
- Original SQLite behavior

The application now works seamlessly with MongoDB while maintaining the same date behavior as the SQLite version.

---

**Fixed**: October 24, 2025
**Status**: ✅ Complete
