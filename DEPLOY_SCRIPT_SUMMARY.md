# Deploy Script Update Summary

## Overview
Updated `deploy-pi.sh` to fully automate Pi-Chat deployment with GitHub repository cloning, dependency installation, and internet access via Ngrok.

---

## What the Script Does

### 1. System Preparation
- ✅ Updates Ubuntu 24.04 system packages
- ✅ Installs system dependencies (git, build-essential, curl, etc.)
- ✅ Installs Node.js 20.x from NodeSource
- ✅ Installs and configures npm
- ✅ Installs PM2 process manager globally

### 2. Ngrok Setup
- ✅ Installs Ngrok via snap
- ✅ Configures auth token: `34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1`
- ✅ Creates symlink for easy access
- ✅ Verifies installation

### 3. Nginx Configuration
- ✅ Installs Nginx web server
- ✅ Configures reverse proxy (port 80 → localhost:3000)
- ✅ Enables WebSocket support
- ✅ Adds security headers
- ✅ Configures UFW firewall

### 4. Application Deployment
- ✅ Clones repository from: `https://github.com/tejbruhath/pi-chat.git`
- ✅ Installs all npm dependencies (`npm install`)
- ✅ Builds production version (`npm run build`)
- ✅ Creates systemd service for auto-start
- ✅ Enables and starts the service

### 5. Internet Access
- ✅ Starts Ngrok tunnel to port 80
- ✅ Retrieves public URL automatically
- ✅ Displays complete access information

### 6. Helper Scripts Created

The script creates these utilities in the user's home directory:

**`~/update-pi-chat.sh`**
- Pulls latest code from GitHub
- Installs dependencies
- Rebuilds application
- Restarts service

**`~/start-ngrok.sh`**
- Starts Ngrok tunnel
- Displays public URL
- Shows dashboard link

**`~/stop-ngrok.sh`**
- Stops Ngrok tunnel

**`~/pi-chat-info.txt`**
- Deployment information
- URLs and commands
- Configuration details

---

## Configuration Variables

```bash
REPO_URL="https://github.com/tejbruhath/pi-chat.git"
APP_DIR="/home/[username]/pi-chat"
NGROK_AUTH_TOKEN="34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1"
```

---

## Deployment Flow

```
1. Run: sudo ./deploy-pi.sh
   ↓
2. Update system packages
   ↓
3. Install Node.js, npm, PM2, Nginx, Ngrok
   ↓
4. Configure Ngrok with auth token
   ↓
5. Configure Nginx reverse proxy
   ↓
6. Clone GitHub repository
   ↓
7. npm install (install dependencies)
   ↓
8. npm run build (build Next.js app)
   ↓
9. Create systemd service
   ↓
10. Start application service
   ↓
11. Start Ngrok tunnel
   ↓
12. Display public URL
```

---

## Services Created

### 1. Systemd Service: `pi-chat.service`

**Location**: `/etc/systemd/system/pi-chat.service`

**Configuration**:
- Service Type: Simple
- User: Non-root user
- Working Directory: `~/pi-chat`
- Start Command: `npm start`
- Auto-restart: Yes (on failure)
- Environment: `NODE_ENV=production`

**Commands**:
```bash
sudo systemctl status pi-chat   # Check status
sudo systemctl restart pi-chat  # Restart
sudo systemctl stop pi-chat     # Stop
sudo systemctl start pi-chat    # Start
journalctl -u pi-chat -f        # View logs
```

### 2. Nginx Reverse Proxy

**Location**: `/etc/nginx/sites-available/pi-chat`

**Configuration**:
- Listen: Port 80
- Proxy: localhost:3000
- WebSocket: Enabled (Socket.IO support)
- Security Headers: Added
- Connection Timeout: 86400s (24h for WebSocket)

**Nginx Config**:
```nginx
server {
    listen 80;
    server_name _;

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Access Information

### Public Internet Access
```
URL: https://[random].ngrok.io
(Displayed at end of deployment)
```

### Local Access
```
Application: http://localhost:3000
Nginx: http://localhost:80
Ngrok Dashboard: http://localhost:4040
```

---

## File Structure After Deployment

```
/home/[username]/
├── pi-chat/                    # Cloned repository
│   ├── app/                    # Next.js app
│   ├── components/             # React components
│   ├── lib/                    # Database & utilities
│   ├── public/                 # Static files
│   ├── node_modules/           # Dependencies
│   ├── .next/                  # Built application
│   ├── package.json
│   └── ...
├── start-ngrok.sh              # Start Ngrok tunnel
├── stop-ngrok.sh               # Stop Ngrok tunnel
├── update-pi-chat.sh           # Update application
├── pi-chat-info.txt            # Deployment information
└── ngrok.log                   # Ngrok logs

/etc/systemd/system/
└── pi-chat.service             # Service definition

/etc/nginx/sites-available/
└── pi-chat                     # Nginx configuration
```

---

## Requirements Met

✅ **Install npm** - Node.js 20.x with npm installed
✅ **Install PM2** - Installed globally via npm
✅ **Clone repo** - `github.com/tejbruhath/pi-chat.git`
✅ **Install dependencies** - `npm install` executed
✅ **Configure Nginx** - Reverse proxy on port 80
✅ **Configure Ngrok** - Auth token configured
✅ **Internet access** - Public URL via Ngrok
✅ **Auto-start** - Systemd service enabled

---

## Usage

### Initial Deployment
```bash
# Download script
wget https://raw.githubusercontent.com/tejbruhath/pi-chat/main/deploy-pi.sh

# Make executable
chmod +x deploy-pi.sh

# Run deployment
sudo ./deploy-pi.sh
```

### Post-Deployment

**Check status**:
```bash
sudo systemctl status pi-chat
```

**View logs**:
```bash
journalctl -u pi-chat -f
```

**Update app**:
```bash
~/update-pi-chat.sh
```

**Manage Ngrok**:
```bash
~/start-ngrok.sh  # Start tunnel
~/stop-ngrok.sh   # Stop tunnel
```

---

## Verification Checklist

After deployment, verify:

- [ ] Node.js and npm installed
  ```bash
  node -v && npm -v
  ```

- [ ] PM2 installed
  ```bash
  pm2 --version
  ```

- [ ] Repository cloned
  ```bash
  ls ~/pi-chat
  ```

- [ ] Dependencies installed
  ```bash
  ls ~/pi-chat/node_modules
  ```

- [ ] Application built
  ```bash
  ls ~/pi-chat/.next
  ```

- [ ] Service running
  ```bash
  sudo systemctl status pi-chat
  ```

- [ ] Nginx running
  ```bash
  sudo systemctl status nginx
  ```

- [ ] Ngrok running
  ```bash
  ps aux | grep ngrok
  ```

- [ ] Local access works
  ```bash
  curl http://localhost:3000
  ```

- [ ] Public URL accessible
  - Visit the Ngrok URL in browser

---

## Troubleshooting

### Service Won't Start
```bash
# Check logs
journalctl -u pi-chat -n 50

# Check if port is in use
sudo lsof -i :3000

# Restart service
sudo systemctl restart pi-chat
```

### Ngrok Not Working
```bash
# Check Ngrok logs
tail -f ~/ngrok.log

# Restart Ngrok
~/stop-ngrok.sh
~/start-ngrok.sh
```

### Build Failures
```bash
# Re-run build manually
cd ~/pi-chat
npm install
npm run build
```

---

## Security Notes

⚠️ **Important Security Considerations**:

1. **MongoDB Connection String**: Currently hardcoded in `lib/db.ts`
   - For production, move to environment variables
   - Create `.env.local` with `MONGODB_URI`

2. **Ngrok Auth Token**: Hardcoded in script
   - Consider using environment variable
   - Rotate token periodically

3. **Firewall**: Configure UFW
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow ssh
   sudo ufw enable
   ```

4. **HTTPS**: Ngrok provides HTTPS automatically
   - All traffic is encrypted
   - URL uses HTTPS by default

---

## Performance Optimization

### Enable PM2 (Optional)

If you prefer PM2 over systemd:

```bash
# Stop systemd service
sudo systemctl stop pi-chat
sudo systemctl disable pi-chat

# Start with PM2
cd ~/pi-chat
pm2 start npm --name "pi-chat" -- start
pm2 save
pm2 startup
```

### Configure Nginx Caching

Add to Nginx config for better performance:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m;
```

---

## Summary

The `deploy-pi.sh` script now provides **complete one-command deployment** with:

- ✅ All required packages (Node.js, npm, PM2, Nginx, Ngrok)
- ✅ GitHub repository cloning
- ✅ Automatic dependency installation
- ✅ Production build
- ✅ Systemd service setup
- ✅ Nginx reverse proxy
- ✅ Public internet access via Ngrok
- ✅ Helper scripts for management
- ✅ Comprehensive logging

**Run once, deploy completely!** 🚀
