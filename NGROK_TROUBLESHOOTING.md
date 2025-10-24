# Ngrok Troubleshooting Guide

## Common Ngrok Errors and Solutions

### Error: `err_ngrok_4018`

**Description**: This error typically indicates an account or authentication issue with Ngrok.

#### Common Causes:
1. **Free tier limitations** - Too many tunnels or connections
2. **Account not verified** - Email verification required
3. **Invalid auth token** - Token expired or incorrect
4. **IP restrictions** - Your IP may be blocked

#### Solutions:

**1. Verify Your Ngrok Account**
```bash
# Visit Ngrok dashboard
https://dashboard.ngrok.com

# Check your account status
# Verify your email if not done
```

**2. Check Auth Token**
```bash
# View current config
ngrok config check

# Re-add auth token
ngrok config add-authtoken YOUR_TOKEN_HERE
```

**3. Check Ngrok Logs**
```bash
# View logs
tail -f ~/ngrok.log

# Look for specific error messages
grep -i error ~/ngrok.log
```

**4. Restart Ngrok**
```bash
# Stop ngrok
~/stop-ngrok.sh

# Start ngrok again
~/start-ngrok.sh
```

**5. Upgrade Ngrok Plan**
If you're hitting free tier limits:
- Visit: https://dashboard.ngrok.com/billing/subscription
- Consider upgrading to a paid plan for:
  - More tunnels
  - Custom domains
  - Better performance
  - No connection limits

---

## Other Common Errors

### Error: `err_ngrok_105` - Session Limit
**Cause**: Too many active tunnels on your account

**Solution**:
```bash
# Check active tunnels
curl -s http://localhost:4040/api/tunnels

# Kill all ngrok processes
pkill -f ngrok

# Start fresh
~/start-ngrok.sh
```

### Error: `err_ngrok_108` - Tunnel already exists
**Cause**: Another ngrok instance is running

**Solution**:
```bash
# Find ngrok processes
ps aux | grep ngrok

# Kill all instances
pkill -f ngrok

# Restart
~/start-ngrok.sh
```

### Error: `err_ngrok_4003` - Account violation
**Cause**: Terms of service violation or abuse detection

**Solution**:
- Contact Ngrok support at: support@ngrok.com
- Check if your IP is flagged
- Review Ngrok's acceptable use policy

---

## Verification Steps

### 1. Check Ngrok Installation
```bash
# Verify ngrok is installed
which ngrok
ngrok version

# Should show: ngrok version 3.x.x
```

### 2. Verify Auth Token
```bash
# Check if token is configured
ngrok config check

# View config file
cat ~/.config/ngrok/ngrok.yml
```

### 3. Test Ngrok Locally
```bash
# Start a simple test tunnel
ngrok http 80

# Press Ctrl+C to stop
# If this works, your token is valid
```

### 4. Check Dashboard
```bash
# Open in browser
http://localhost:4040

# Should show tunnel status and logs
```

---

## Manual Ngrok Setup

If the automatic setup fails, try manual configuration:

### 1. Install Ngrok
```bash
# Using apt (recommended)
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null

echo "deb https://ngrok-agent.s3.amazonaws.com bookworm main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list

sudo apt update
sudo apt install ngrok
```

### 2. Configure Auth Token
```bash
ngrok config add-authtoken 34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1
```

### 3. Start Tunnel
```bash
# For Pi-Chat (port 80)
ngrok http 80

# Or if using port 3000 directly
ngrok http 3000
```

---

## Alternative: Use Cloudflare Tunnel

If Ngrok continues to have issues, consider using Cloudflare Tunnel as an alternative:

### 1. Install Cloudflare Tunnel
```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# For ARM (Raspberry Pi)
# wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64

sudo mv cloudflared-linux-* /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared
```

### 2. Login and Create Tunnel
```bash
cloudflared tunnel login
cloudflared tunnel create pi-chat
cloudflared tunnel route dns pi-chat chat.yourdomain.com
```

### 3. Run Tunnel
```bash
cloudflared tunnel run --url http://localhost:80 pi-chat
```

---

## Alternative: Use Tailscale

For private access without public exposure:

### 1. Install Tailscale
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

### 2. Connect
```bash
sudo tailscale up
```

### 3. Access
- Access your app via: `http://hostname:3000`
- From any device on your Tailscale network

---

## Debugging Commands

### Check if Ngrok is Running
```bash
ps aux | grep ngrok
pgrep -fl ngrok
```

### Check Ports
```bash
# Check if port 4040 (ngrok dashboard) is listening
sudo lsof -i :4040

# Check if app is running on port 80
sudo lsof -i :80
```

### Test API Endpoint
```bash
# Get tunnel status
curl -s http://localhost:4040/api/tunnels | jq .

# Pretty print (if jq installed)
curl -s http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'
```

### View Real-time Logs
```bash
# Ngrok logs
tail -f ~/ngrok.log

# Application logs
journalctl -u pi-chat -f

# Nginx logs
tail -f /var/log/nginx/error.log
```

---

## Ngrok Dashboard Commands

### Access Dashboard
```bash
# Local browser
http://localhost:4040

# Or via curl
curl http://localhost:4040/api/tunnels
```

### Dashboard Features
- **Status**: View tunnel status and URL
- **Inspect**: See all HTTP requests
- **Replay**: Replay requests for debugging
- **Logs**: View detailed logs

---

## Getting Help

### 1. Check Ngrok Status
Visit: https://status.ngrok.com

### 2. Ngrok Documentation
Visit: https://ngrok.com/docs

### 3. Ngrok Community
Visit: https://community.ngrok.com

### 4. Contact Support
Email: support@ngrok.com

### 5. Check Your Deployment Logs
```bash
cat ~/pi-chat-info.txt
tail -f ~/ngrok.log
journalctl -u pi-chat -f
```

---

## Prevention Tips

1. **Keep only one tunnel running** - Close unused tunnels
2. **Use reserved domains** - Consider paid plan for stable URLs
3. **Monitor usage** - Check dashboard regularly
4. **Verify email** - Ensure your Ngrok account is verified
5. **Update regularly** - Keep ngrok updated: `sudo apt upgrade ngrok`

---

## Quick Reference

### Common Commands
```bash
# Start Ngrok
~/start-ngrok.sh

# Stop Ngrok
~/stop-ngrok.sh

# Check status
curl -s http://localhost:4040/api/tunnels

# View logs
tail -f ~/ngrok.log

# Restart app
sudo systemctl restart pi-chat

# Check app status
sudo systemctl status pi-chat
```

### Important Files
- **Ngrok config**: `~/.config/ngrok/ngrok.yml`
- **Ngrok logs**: `~/ngrok.log`
- **App info**: `~/pi-chat-info.txt`
- **Start script**: `~/start-ngrok.sh`
- **Stop script**: `~/stop-ngrok.sh`

### Important URLs
- **Dashboard**: http://localhost:4040
- **Ngrok account**: https://dashboard.ngrok.com
- **App local**: http://localhost:3000
- **App via Nginx**: http://localhost:80

---

## Success Indicators

When Ngrok is working correctly, you should see:

```bash
✅ Ngrok tunnel established!
🌍 Public URL: https://abc123.ngrok.io
📊 Dashboard: http://localhost:4040
```

And in the dashboard (http://localhost:4040), you should see:
- Status: `online`
- Public URL: Active tunnel URL
- Connections: Request logs
- No error messages

---

## Still Having Issues?

If none of these solutions work:

1. **Check system requirements**
   - Internet connection working?
   - Firewall blocking ngrok?
   - Sufficient system resources?

2. **Try a different approach**
   - Use Cloudflare Tunnel
   - Use Tailscale for private access
   - Set up port forwarding on your router
   - Use a VPS with public IP

3. **Contact support**
   - Ngrok support: support@ngrok.com
   - Pi-Chat issues: github.com/tejbruhath/pi-chat/issues

---

**Remember**: Ngrok free tier has limitations. For production use, consider:
- Upgrading to Ngrok paid plan
- Using Cloudflare Tunnel (free)
- Getting a VPS with public IP
- Setting up proper DNS and domain
