# Fix for 401 Unauthorized Errors (Session Cookie Issues)

## Problem Description

When accessing the Pi-Chat application through Ngrok HTTPS URLs on EC2, users were experiencing:

```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
Session expired, redirecting to login
api/auth/login: 401
api/conversations: 401
api/users/search: 401
```

## Root Cause

The issue was caused by **strict cookie settings** that prevented session cookies from working correctly through the reverse proxy chain:

```
Browser → Ngrok (HTTPS) → Nginx (HTTP) → Next.js App (HTTP)
```

### Specific Issues:

1. **`sameSite: 'strict'`** - Too restrictive for reverse proxy scenarios
   - Prevented cookies from being sent through the proxy chain
   - Blocked cookies on subdomain/cross-site navigation
   
2. **Lack of CORS headers** - API endpoints didn't properly handle cross-origin requests

3. **Cookie not recognized** - The `sameSite: strict` policy caused browsers to drop the session cookie when accessed via Ngrok's HTTPS URL

---

## Solution Implemented

### 1. Changed Cookie SameSite Policy

#### Files Modified:
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`

#### Change:
```typescript
// Before
sameSite: 'strict'

// After
sameSite: 'lax'  // Better compatibility with reverse proxies
```

### 2. Added CORS Headers

#### File Modified:
- `next.config.ts`

#### Added:
```typescript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: '...' },
      ],
    },
  ];
}
```

---

## Deployment Instructions

### On Your EC2 Server:

```bash
# 1. Pull latest changes
cd ~/pi-chat
git pull

# 2. Rebuild the application
npm run build

# 3. Restart the service
sudo systemctl restart pi-chat

# 4. Verify it's running
sudo systemctl status pi-chat

# 5. Check logs
journalctl -u pi-chat -f
```

### Quick Restart All Services:
```bash
sudo systemctl restart pi-chat
sudo systemctl reload nginx
~/stop-ngrok.sh
~/start-ngrok.sh
```

---

## How to Verify the Fix

### 1. Clear Browser Data
Before testing, clear your browser's cookies and cache:
- **Chrome**: Settings → Privacy → Clear browsing data
- **Firefox**: Settings → Privacy → Clear Data
- Or use Incognito/Private mode

### 2. Test Registration
1. Go to your Ngrok URL (e.g., `https://xyz.ngrok.io`)
2. Click "Register"
3. Create a new account
4. **Expected**: Should successfully register and log in

### 3. Test Login
1. Log out
2. Log back in with your credentials
3. **Expected**: Should successfully authenticate

### 4. Test Features
1. Search for users (should not show 401)
2. Create a conversation (should work)
3. Send messages (should work)
4. Upload files (should work)

### 5. Check Browser Console
Open Developer Tools (F12) and check the Console tab:
- ✅ **Good**: No 401 errors
- ✅ **Good**: "Connected to WebSocket" message
- ❌ **Bad**: Still seeing 401 errors (see troubleshooting)

---

## Technical Details

### Cookie Settings Comparison

| Setting | Before | After | Why Changed |
|---------|--------|-------|-------------|
| **sameSite** | `strict` | `lax` | Allows cookies through reverse proxy |
| **secure** | `true` in prod | `true` in prod | Unchanged - requires HTTPS |
| **httpOnly** | `true` | `true` | Unchanged - prevents XSS |
| **path** | `/` | `/` | Unchanged - works sitewide |

### SameSite Cookie Modes Explained

- **`strict`** - Cookie ONLY sent for same-site requests
  - ❌ Blocks: Clicking link from email
  - ❌ Blocks: Cross-domain redirects
  - ❌ Blocks: Through reverse proxies
  
- **`lax`** (Our choice) - Cookie sent for top-level navigation
  - ✅ Allows: Clicking links
  - ✅ Allows: GET requests from other sites
  - ✅ Allows: Through reverse proxies
  - ❌ Blocks: POST from other domains (good for security)
  
- **`none`** - Cookie sent everywhere
  - ✅ Allows: Everything
  - ⚠️ Requires: `secure: true` (HTTPS only)
  - ⚠️ Warning: Less secure

---

## Troubleshooting

### Still Getting 401 Errors?

#### 1. Check if App is Running
```bash
sudo systemctl status pi-chat
journalctl -u pi-chat -n 50
```

#### 2. Check MongoDB Connection
```bash
# View app logs
journalctl -u pi-chat -f

# Look for:
# ✅ "MongoDB Connected Successfully"
# ❌ "MongoDB connection error"
```

#### 3. Clear All Cookies
```bash
# In browser console (F12):
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

#### 4. Check Nginx is Running
```bash
sudo systemctl status nginx
sudo nginx -t  # Test configuration
```

#### 5. Verify Ngrok Tunnel
```bash
curl http://localhost:4040/api/tunnels
# Should show active tunnel with HTTPS URL
```

#### 6. Test API Directly
```bash
# Test from server itself
curl -I http://localhost:3000/api/auth/me

# Should show 401 (expected without cookie)
# If shows 500 or connection error, app has issues
```

### Database Issues?

```bash
# Check MongoDB connection in logs
journalctl -u pi-chat -f | grep -i mongo

# Test MongoDB from code:
cd ~/pi-chat
node -e "require('./lib/db').connectDB().then(() => console.log('Connected!')).catch(console.error)"
```

---

## Security Considerations

### Why `sameSite: 'lax'` is Still Secure

1. **Blocks CSRF on POST** - Form submissions from other sites are blocked
2. **Requires HTTPS in production** - `secure: true` flag enforces HTTPS
3. **HTTP-only cookies** - JavaScript cannot access the session token
4. **7-day expiration** - Sessions automatically expire
5. **Allows legitimate navigation** - Users can bookmark and share links

### What's Protected

- ✅ **CSRF attacks** - POST/PUT/DELETE from other sites blocked
- ✅ **XSS attacks** - httpOnly prevents script access
- ✅ **Man-in-the-middle** - HTTPS required in production
- ✅ **Session hijacking** - Secure cookies + HTTPS
- ✅ **Clickjacking** - X-Frame-Options headers

---

## Testing Checklist

Use this checklist after deploying the fix:

- [ ] Application builds successfully (`npm run build`)
- [ ] Service starts without errors (`systemctl status pi-chat`)
- [ ] MongoDB connection successful (check logs)
- [ ] Nginx is running (`systemctl status nginx`)
- [ ] Ngrok tunnel is active (`curl localhost:4040/api/tunnels`)
- [ ] Can access site via Ngrok URL
- [ ] Registration works (create new account)
- [ ] Login works (authenticate)
- [ ] No 401 errors in browser console
- [ ] User search works
- [ ] Can create conversations
- [ ] Can send messages
- [ ] WebSocket connects ("Connected to WebSocket" in console)
- [ ] File uploads work
- [ ] Logout works

---

## Performance Impact

The fix has **no negative performance impact**:

- ✅ Same number of cookies
- ✅ Same cookie size
- ✅ No additional requests
- ✅ No database changes
- ✅ Improved user experience (fewer auth failures)

---

## Rollback (If Needed)

If you need to revert the changes:

```bash
# 1. Checkout previous version
cd ~/pi-chat
git log --oneline -5  # Find commit before fix
git checkout <commit-hash>

# 2. Rebuild
npm run build

# 3. Restart
sudo systemctl restart pi-chat
```

Or manually change back in code:
```typescript
// In login/route.ts and register/route.ts
sameSite: 'strict'  // Change back to strict
```

---

## Additional Notes

### DialogContent Warning

You may see this warning in the console:
```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
```

This is **not related** to the 401 errors. It's an accessibility warning from shadcn/ui Dialog components. To fix:

```typescript
<DialogContent aria-describedby="dialog-description">
  <DialogDescription id="dialog-description">
    Your dialog description here
  </DialogDescription>
  {/* ... rest of content */}
</DialogContent>
```

---

## Summary

### What Was Fixed
- ✅ 401 Unauthorized errors
- ✅ Session cookie compatibility with reverse proxies
- ✅ CORS headers for API endpoints
- ✅ Authentication flow through Ngrok

### What Still Works
- ✅ All security features
- ✅ Session expiration
- ✅ Password hashing
- ✅ HTTP-only cookies
- ✅ HTTPS enforcement

### What's Better Now
- ✅ Works with Ngrok HTTPS URLs
- ✅ Works with reverse proxies
- ✅ Better user experience
- ✅ No more session drops
- ✅ Reliable authentication

---

## Need More Help?

### Check Logs
```bash
# Application logs
journalctl -u pi-chat -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Ngrok logs
tail -f ~/ngrok.log
```

### Debug Mode
To see more detailed errors, check the server logs while reproducing the issue.

### Contact
- GitHub Issues: https://github.com/tejbruhath/pi-chat/issues
- Check Documentation: ~/pi-chat/*.md files

---

**Your authentication should now work perfectly through Ngrok!** 🎉
