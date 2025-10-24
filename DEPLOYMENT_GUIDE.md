# Pi-Chat Deployment Guide

## Quick Deployment to Ubuntu 24.04

This guide will help you deploy Pi-Chat to an Ubuntu 24.04 server and make it accessible via the internet using Ngrok.

---

## Prerequisites

- Ubuntu 24.04 server (VPS, Raspberry Pi, or local machine)
- Root/sudo access
- Internet connection

---

## Automated One-Command Deployment

### Step 1: Download and Run Deployment Script

```bash
# Download the deployment script
wget https://raw.githubusercontent.com/tejbruhath/pi-chat/main/deploy-pi.sh

# Make it executable
chmod +x deploy-pi.sh

# Run the deployment (requires sudo)
sudo ./deploy-pi.sh
```

The script will automatically:
1. ✅ Update system packages
2. ✅ Install Node.js 20.x
3. ✅ Install PM2 process manager
4. ✅ Install Nginx web server
5. ✅ Install Ngrok tunneling service
6. ✅ Configure Ngrok with auth token
7. ✅ Clone the Pi-Chat repository from GitHub
8. ✅ Install all npm dependencies
9. ✅ Build the Next.js application
10. ✅ Create and start systemd service
11. ✅ Configure Nginx as reverse proxy
12. ✅ Start Ngrok tunnel
13. ✅ Display public access URL

---

## What Gets Installed

### System Packages
- **Git** - Version control
- **Build Essential** - Compilation tools
- **Node.js 20.x** - JavaScript runtime
- **npm** - Package manager
- **PM2** - Process manager
- **Nginx** - Web server/reverse proxy
- **Ngrok** - Secure tunneling service

### Application
- **Repository**: https://github.com/tejbruhath/pi-chat.git
- **Location**: `/home/[username]/pi-chat`
- **Service**: `pi-chat.service` (systemd)
- **Port**: 3000 (internal), 80 (Nginx proxy)

---

## After Deployment

### Access Your Application

**Public URL (Internet):**
```
The script will display the Ngrok URL at the end
Example: https://abc123.ngrok.io
```

**Local Access:**
```
http://localhost:3000
```

**Ngrok Dashboard:**
```
http://localhost:4040
```

### Check Service Status

```bash
# Check application status
sudo systemctl status pi-chat

# View application logs
journalctl -u pi-chat -f

# View Ngrok logs
tail -f ~/ngrok.log
```

### Manage the Application

```bash
# Restart the application
sudo systemctl restart pi-chat

# Stop the application
sudo systemctl stop pi-chat

# Start the application
sudo systemctl start pi-chat

# Enable auto-start on boot
sudo systemctl enable pi-chat
```

### Manage Ngrok Tunnel

```bash
# Start Ngrok tunnel
~/start-ngrok.sh

# Stop Ngrok tunnel
~/stop-ngrok.sh

# Check current Ngrok URL
curl -s http://localhost:4040/api/tunnels | grep public_url
```

---

## Useful Scripts Created

The deployment creates helper scripts in your home directory:

### 1. Update Application
```bash
~/update-pi-chat.sh
```
This script will:
- Pull latest changes from GitHub
- Install new dependencies
- Rebuild the application
- Restart the service

### 2. Start Ngrok
```bash
~/start-ngrok.sh
```
Starts the Ngrok tunnel and displays the public URL.

### 3. Stop Ngrok
```bash
~/stop-ngrok.sh
```
Stops the Ngrok tunnel.

### 4. Deployment Info
```bash
cat ~/pi-chat-info.txt
```
Contains all deployment information including URLs and commands.

---

## Configuration Details

### MongoDB Atlas Connection
The application connects to MongoDB Atlas automatically.
Connection string is hardcoded in `lib/db.ts`:
```
mongodb+srv://tejdupes_db_user:KvTixU3C7KAvyc92@pi-chat.qeg5ums.mongodb.net/?appName=pi-chat
```

### Nginx Configuration
Location: `/etc/nginx/sites-available/pi-chat`
- Listens on port 80
- Proxies to localhost:3000
- WebSocket support enabled

### Systemd Service
Location: `/etc/systemd/system/pi-chat.service`
- Auto-restart on failure
- Runs as your user (not root)
- Logs to systemd journal

### Ngrok Configuration
- Auth token: Configured during deployment
- Protocol: HTTP
- Port: 80 (Nginx)
- Dashboard: http://localhost:4040

---

## Troubleshooting

### Application Won't Start

```bash
# Check service status
sudo systemctl status pi-chat

# View detailed logs
journalctl -u pi-chat -n 50 --no-pager

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart the service
sudo systemctl restart pi-chat
```

### Ngrok Tunnel Not Working

```bash
# Check Ngrok logs
tail -f ~/ngrok.log

# Restart Ngrok
~/stop-ngrok.sh
~/start-ngrok.sh

# Verify auth token
ngrok config check

# Test connection
curl -s http://localhost:4040/api/tunnels
```

### Cannot Access via Public URL

1. Check if Ngrok is running:
   ```bash
   ps aux | grep ngrok
   ```

2. Check Ngrok URL:
   ```bash
   curl -s http://localhost:4040/api/tunnels | grep public_url
   ```

3. Check if application is running:
   ```bash
   sudo systemctl status pi-chat
   ```

4. Check Nginx status:
   ```bash
   sudo systemctl status nginx
   ```

### MongoDB Connection Issues

The app uses MongoDB Atlas (cloud database), so:
1. Ensure server has internet connection
2. Check if connection string is correct in `lib/db.ts`
3. View application logs for database errors:
   ```bash
   journalctl -u pi-chat -f | grep -i mongo
   ```

### Permission Issues

If you get permission errors:
```bash
# Fix ownership of application directory
sudo chown -R $USER:$USER ~/pi-chat

# Fix script permissions
chmod +x ~/update-pi-chat.sh
chmod +x ~/start-ngrok.sh
chmod +x ~/stop-ngrok.sh
```

---

## Manual Deployment (Alternative)

If you prefer to deploy manually:

### 1. Install Dependencies
```bash
sudo apt update
sudo apt install -y git nodejs npm nginx
```

### 2. Clone Repository
```bash
cd ~
git clone https://github.com/tejbruhath/pi-chat.git
cd pi-chat
```

### 3. Install npm Dependencies
```bash
npm install
```

### 4. Build Application
```bash
npm run build
```

### 5. Start Application
```bash
npm start
```

### 6. Set up Ngrok
```bash
# Install ngrok
sudo snap install ngrok

# Configure auth token
ngrok config add-authtoken 34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1

# Start tunnel
ngrok http 3000
```

---

## Security Considerations

### Production Recommendations

1. **Move Connection String to Environment Variables**
   - Create `.env.local` file
   - Add: `MONGODB_URI=your_connection_string`
   - Update `lib/db.ts` to read from environment

2. **Enable HTTPS**
   - Use Ngrok's built-in HTTPS (automatically enabled)
   - Or set up Let's Encrypt for custom domain

3. **Firewall Configuration**
   ```bash
   # Allow Nginx
   sudo ufw allow 'Nginx Full'
   
   # Allow SSH (important!)
   sudo ufw allow ssh
   
   # Enable firewall
   sudo ufw enable
   ```

4. **Update Regularly**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Update application
   ~/update-pi-chat.sh
   ```

---

## Monitoring & Maintenance

### Check Resource Usage
```bash
# CPU and Memory
htop

# Disk space
df -h

# Application resource usage
ps aux | grep node
```

### View Application Metrics
```bash
# PM2 monitoring (if using PM2 instead of systemd)
pm2 monit

# Real-time logs
journalctl -u pi-chat -f
```

### Backup
```bash
# MongoDB Atlas handles database backups automatically
# To backup the application files:
cd ~
tar -czf pi-chat-backup-$(date +%Y%m%d).tar.gz pi-chat/
```

---

## Updating the Application

### Automatic Update
```bash
~/update-pi-chat.sh
```

### Manual Update
```bash
cd ~/pi-chat
git pull
npm install
npm run build
sudo systemctl restart pi-chat
```

---

## Uninstalling

If you need to remove the application:

```bash
# Stop services
sudo systemctl stop pi-chat
sudo systemctl disable pi-chat
~/stop-ngrok.sh

# Remove application
rm -rf ~/pi-chat

# Remove systemd service
sudo rm /etc/systemd/system/pi-chat.service
sudo systemctl daemon-reload

# Remove Nginx config (optional)
sudo rm /etc/nginx/sites-enabled/pi-chat
sudo rm /etc/nginx/sites-available/pi-chat
sudo systemctl restart nginx

# Uninstall Ngrok (optional)
sudo snap remove ngrok
```

---

## Support

For issues or questions:
- **GitHub**: https://github.com/tejbruhath/pi-chat
- **Documentation**: See README.md and MONGODB_SETUP.md in the repository

---

## Summary

After running the deployment script, you'll have:
- ✅ Fully functional Pi-Chat application
- ✅ Running on systemd with auto-restart
- ✅ Nginx reverse proxy configured
- ✅ Public internet access via Ngrok
- ✅ MongoDB Atlas cloud database connected
- ✅ Automatic updates via helper scripts
- ✅ Complete monitoring and logging setup

**Your app will be accessible worldwide via the Ngrok URL!** 🌍
