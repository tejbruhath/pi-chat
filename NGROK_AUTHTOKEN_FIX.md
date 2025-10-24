# Ngrok Authtoken Fix - ERR_NGROK_4018

## Problem

Getting this error when running the deploy script:
```
ERR_NGROK_4018
authentication failed: Usage of ngrok requires a verified account and authtoken.
```

**Root Cause**: The ngrok authtoken was configured for root user instead of your actual user.

---

## ✅ Quick Fix (If Deploy Script Already Ran)

Run this command as your user (NOT as root/sudo):

```bash
ngrok config add-authtoken 34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1
```

**Expected output:**
```
Authtoken saved to configuration file: /home/YOUR_USER/.config/ngrok/ngrok.yml
```

---

## 🔍 Verify Configuration

Check if the config file exists:

```bash
cat ~/.config/ngrok/ngrok.yml
```

**Should show:**
```yaml
version: "2"
authtoken: 34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1
```

---

## 🚀 Test Ngrok

After adding the token, test it:

```bash
# Stop any existing ngrok instances
pkill ngrok

# Start ngrok manually
ngrok http 8080
```

**Expected output:**
```
Session Status                online
Account                       Your Account
Version                       3.x.x
Region                        India (in)
Forwarding                    https://xyz.ngrok.io -> http://localhost:8080
```

Press `Ctrl+C` to stop, then restart with the script:

```bash
~/start-ngrok.sh
```

---

## 🔄 Re-run Deploy Script (Fixed)

If you want to re-run the deploy script, it's now fixed to configure the token for your user:

```bash
cd ~/pi-chat
git pull
sudo ./deploy-pi.sh
```

The script now runs:
```bash
sudo -u YOUR_USER ngrok config add-authtoken TOKEN
```

---

## 📝 Manual Configuration (Alternative)

If the command doesn't work, manually create the config file:

```bash
# Create config directory
mkdir -p ~/.config/ngrok

# Create config file
cat > ~/.config/ngrok/ngrok.yml << 'EOF'
version: "2"
authtoken: 34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1
EOF

# Verify
cat ~/.config/ngrok/ngrok.yml
```

---

## 🧪 Testing

### Test 1: Check Config
```bash
ngrok config check
```

**Expected**: No errors

### Test 2: View Config Path
```bash
ngrok config edit
```

**Should open**: `~/.config/ngrok/ngrok.yml` (not `/root/.config/ngrok/ngrok.yml`)

### Test 3: Start Tunnel
```bash
ngrok http 8080
```

**Should show**: Session Status "online" (not authentication error)

---

## 🔍 Troubleshooting

### Issue: Config file in wrong location

**Check where ngrok is looking:**
```bash
ngrok config check
```

**If it shows:**
```
/root/.config/ngrok/ngrok.yml
```

**Problem**: You're running ngrok as root. Run as your user instead:
```bash
# Wrong (as root)
sudo ngrok http 8080

# Correct (as your user)
ngrok http 8080
```

---

### Issue: Permission denied

**Fix permissions:**
```bash
# Ensure you own the config directory
sudo chown -R $USER:$USER ~/.config/ngrok/

# Verify
ls -la ~/.config/ngrok/
```

---

### Issue: Multiple config files

**Check both locations:**
```bash
# Your user's config (correct location)
cat ~/.config/ngrok/ngrok.yml

# Root's config (wrong location)
sudo cat /root/.config/ngrok/ngrok.yml
```

**Remove root's config if it exists:**
```bash
sudo rm -f /root/.config/ngrok/ngrok.yml
```

---

## 🎯 Why This Happened

### Before (Broken)
```bash
# Script ran as root
ngrok config add-authtoken TOKEN
# → Created /root/.config/ngrok/ngrok.yml

# But ngrok runs as user
sudo -u naman ngrok http 8080
# → Looking for /home/naman/.config/ngrok/ngrok.yml
# → Not found! Authentication failed
```

### After (Fixed)
```bash
# Script runs as user
sudo -u naman ngrok config add-authtoken TOKEN
# → Creates /home/naman/.config/ngrok/ngrok.yml

# Ngrok runs as same user
sudo -u naman ngrok http 8080
# → Finds /home/naman/.config/ngrok/ngrok.yml
# → Authentication success!
```

---

## ✅ Verification Checklist

After applying the fix:

- [ ] Config file exists at `~/.config/ngrok/ngrok.yml`
- [ ] `ngrok config check` shows no errors
- [ ] `ngrok config edit` opens your user's config (not root's)
- [ ] `ngrok http 8080` connects successfully
- [ ] `~/start-ngrok.sh` works without errors
- [ ] `curl http://localhost:4040/api/tunnels` shows active tunnel

---

## 📞 Still Having Issues?

### Check Ngrok Account

1. Visit https://dashboard.ngrok.com/get-started/your-authtoken
2. Verify the token: `34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1`
3. Check if your account is verified (email verification required)

### View Ngrok Logs
```bash
tail -f ~/ngrok.log
```

### Get Help
- [Ngrok Documentation](https://ngrok.com/docs/errors/err_ngrok_4018)
- [Pi-Chat Issues](https://github.com/tejbruhath/pi-chat/issues)

---

## 🎉 Summary

**The Fix:**
```bash
# Run as your user (not root)
ngrok config add-authtoken 34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1

# Verify
cat ~/.config/ngrok/ngrok.yml

# Test
ngrok http 8080
```

**All set!** Your ngrok tunnel should now work perfectly. 🚀
