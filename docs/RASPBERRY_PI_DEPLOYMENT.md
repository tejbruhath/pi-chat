# 🍓 Pi-Chat Deployment Guide for Raspberry Pi

## Raspberry Pi OS (Debian 13 Trixie) Deployment

This guide covers deploying Pi-Chat on Raspberry Pi running the latest Raspberry Pi OS based on Debian 13 (Trixie).

---

## ✅ Supported Raspberry Pi Models

- **Raspberry Pi 5** - Best performance, recommended
- **Raspberry Pi 4 (2GB+)** - Excellent performance
- **Raspberry Pi 3 B+** - Good performance (minimum 1GB RAM)
- **Raspberry Pi Zero 2 W** - Works but slower

### ⚠️ Not Recommended

- Raspberry Pi Zero/Zero W (too slow, insufficient RAM)
- Raspberry Pi 1/2 (outdated, limited resources)

---

## 📋 Prerequisites

### Hardware Requirements

**Minimum:**
- Raspberry Pi 3 or newer
- 1GB RAM (2GB+ recommended)
- 8GB microSD card
- Power supply (official recommended)
- Internet connection (Ethernet or WiFi)

**Recommended:**
- Raspberry Pi 4 or 5
- 2GB+ RAM
- 16GB+ microSD card (Class 10 or better)
- Cooling (heatsink or fan)
- Stable power supply (5V 3A for Pi 4/5)

### Software Requirements

- **Raspberry Pi OS (Debian 13 Trixie)** - Latest version
- **SSH access** (optional but recommended)
- **Root/sudo privileges**

---

## 🚀 Quick Deployment

### Method 1: One-Command Deployment (Recommended)

```bash
# Download the deployment script
wget https://raw.githubusercontent.com/tejbruhath/pi-chat/main/deploy-pi.sh

# Make it executable
chmod +x deploy-pi.sh

# Run the deployment
sudo ./deploy-pi.sh
```

That's it! The script will automatically:
1. ✅ Update your Raspberry Pi
2. ✅ Install Node.js 20.x (ARM-optimized)
3. ✅ Install PM2, Nginx, Ngrok
4. ✅ Clone the repository
5. ✅ Build the application
6. ✅ Start everything
7. ✅ Give you a public URL

---

## 📊 What Gets Installed

### System Packages
- **Git** - Version control
- **Build Essential** - Compilation tools
- **Node.js 20.x** - ARM-optimized version
- **PM2** - Process manager
- **Nginx** - Web server
- **Ngrok** - ARM-compatible version (ARM64 or ARMv7)

### Application
- Pi-Chat from GitHub
- All npm dependencies
- Production build

---

## 🔧 Raspberry Pi Specific Configuration

### Node.js on ARM

The script automatically installs the ARM-compatible version of Node.js from NodeSource:
- **ARM64** (Pi 4/5 with 64-bit OS)
- **ARMv7** (Pi 3/4 with 32-bit OS)

### Ngrok for ARM

Automatically detects and installs the correct Ngrok version:
- **ARM64** for 64-bit Raspberry Pi OS
- **ARMv7** for 32-bit Raspberry Pi OS

### Memory Management

For Raspberry Pis with limited RAM:

```bash
# Check current swap
free -h

# Enable/increase swap if needed
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=2048 (for 2GB swap)
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

---

## 🌡️ Performance Considerations

### CPU Temperature Monitoring

```bash
# Check CPU temperature
vcgencmd measure_temp

# Monitor in real-time
watch -n 1 vcgencmd measure_temp
```

**Recommended:** Keep temperature below 75°C. Consider adding cooling if higher.

### Resource Usage

```bash
# Check memory usage
free -h

# Check CPU usage
htop

# Check disk space
df -h
```

### Optimization Tips

1. **Use 64-bit OS** (if using Pi 4/5)
   - Better performance
   - More efficient memory usage

2. **Overclock (Optional)**
   ```bash
   sudo raspi-config
   # Performance Options → Overclock
   ```
   ⚠️ Only with proper cooling!

3. **Disable unused services**
   ```bash
   sudo systemctl disable bluetooth
   sudo systemctl disable hciuart
   ```

4. **Use Ethernet instead of WiFi**
   - More stable
   - Lower latency
   - Better performance

---

## 🔌 Power Management

### Preventing Power Issues

Raspberry Pi can be sensitive to power issues. Recommendations:

1. **Use official power supply**
   - Pi 4/5: 5V 3A USB-C
   - Pi 3: 5V 2.5A micro-USB

2. **Check for undervoltage**
   ```bash
   vcgencmd get_throttled
   # 0x0 = No issues
   # Other values = Power/thermal problems
   ```

3. **Add to crontab for auto-restart after power loss**
   ```bash
   crontab -e
   # Add:
   @reboot sleep 30 && /home/pi/start-ngrok.sh
   ```

---

## 📡 Network Configuration

### Static IP (Recommended)

For reliable access, set a static IP:

```bash
sudo nano /etc/dhcpcd.conf

# Add at the end:
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

### Port Forwarding (Alternative to Ngrok)

If you have router access:
1. Forward port 80 to your Pi's IP
2. Set up Dynamic DNS (No-IP, DuckDNS)
3. Disable Ngrok if not needed

---

## 🔒 Security for Raspberry Pi

### Essential Security Steps

1. **Change default password**
   ```bash
   passwd pi
   ```

2. **Update regularly**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Configure firewall**
   ```bash
   sudo apt install ufw
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

4. **Disable SSH password auth (use keys)**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   sudo systemctl restart ssh
   ```

5. **Install fail2ban**
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

---

## 🛠️ Troubleshooting Raspberry Pi Specific Issues

### Build Fails (Out of Memory)

```bash
# Increase swap temporarily
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Then rebuild
cd ~/pi-chat
npm run build
```

### Application Slow/Crashing

```bash
# Check memory
free -h

# Check if swap is being used heavily
vmstat 1 5

# Restart application
sudo systemctl restart pi-chat
```

### Ngrok Won't Start

```bash
# Check architecture
uname -m

# Reinstall Ngrok manually
cd /tmp
# For ARM64:
curl -L https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz -o ngrok.tgz
# For ARMv7:
# curl -L https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm.tgz -o ngrok.tgz

tar -xzf ngrok.tgz
sudo mv ngrok /usr/local/bin/
```

### Node.js/npm Issues

```bash
# Verify ARM version is installed
node -v
file $(which node)

# Should show: ARM or aarch64

# Reinstall if needed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 📈 Monitoring Your Raspberry Pi

### System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop

# Real-time monitoring
htop  # CPU/Memory
iotop # Disk I/O
```

### Application Monitoring

```bash
# Service status
sudo systemctl status pi-chat

# Real-time logs
journalctl -u pi-chat -f

# Resource usage
ps aux | grep node
```

### Temperature Monitoring

```bash
# Create a monitoring script
nano ~/monitor_temp.sh

# Add:
#!/bin/bash
while true; do
    clear
    echo "Temperature: $(vcgencmd measure_temp)"
    echo "CPU Freq: $(vcgencmd measure_clock arm | cut -d= -f2)"
    echo "Throttled: $(vcgencmd get_throttled)"
    sleep 2
done

chmod +x ~/monitor_temp.sh
./monitor_temp.sh
```

---

## 🔄 Updating Pi-Chat on Raspberry Pi

### Quick Update

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

## 💾 Backup Recommendations

### SD Card Backup

**From another computer:**
```bash
# Linux/Mac
sudo dd if=/dev/sdX of=~/pi-chat-backup.img bs=4M status=progress

# Windows: Use Win32DiskImager or Balena Etcher
```

### Application Backup

```bash
# Backup application files
cd ~
tar -czf pi-chat-backup-$(date +%Y%m%d).tar.gz pi-chat/

# Backup to USB drive
cp pi-chat-backup-*.tar.gz /media/usb/
```

---

## 🌐 Remote Access Options

### 1. Ngrok (Default)
- ✅ Works automatically
- ✅ HTTPS included
- ✅ No router configuration needed
- ⚠️ URL changes on restart (free plan)

### 2. Tailscale (Alternative)
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Connect
sudo tailscale up

# Access via: http://pi-hostname:3000
```

### 3. CloudFlare Tunnel (Alternative)
```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
sudo mv cloudflared-linux-arm64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Set up tunnel
cloudflared tunnel login
cloudflared tunnel create pi-chat
cloudflared tunnel route dns pi-chat chat.yourdomain.com
```

---

## 📊 Performance Benchmarks

### Expected Performance by Model

| Model | Build Time | Response Time | Concurrent Users |
|-------|-----------|---------------|------------------|
| Pi 5 | ~2 min | <100ms | 50+ |
| Pi 4 (4GB) | ~3 min | <150ms | 30+ |
| Pi 4 (2GB) | ~4 min | <200ms | 20+ |
| Pi 3 B+ | ~8 min | <300ms | 10+ |
| Pi Zero 2 W | ~15 min | <500ms | 5+ |

---

## 🎯 Best Practices for Raspberry Pi

1. **Use Quality SD Card**
   - SanDisk Extreme or Samsung EVO
   - Class 10 or UHS-I minimum

2. **Proper Cooling**
   - Heatsinks for Pi 3/4
   - Fan for Pi 4/5 (optional)

3. **Stable Power**
   - Official power supply
   - Avoid cheap USB chargers

4. **Regular Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo reboot
   ```

5. **Monitor Temperature**
   - Keep below 75°C
   - Check: `vcgencmd measure_temp`

6. **Enable Watchdog** (auto-reboot if crash)
   ```bash
   sudo modprobe bcm2835_wdt
   echo "bcm2835_wdt" | sudo tee -a /etc/modules
   sudo apt install watchdog
   sudo systemctl enable watchdog
   ```

---

## 🆘 Support & Resources

### Official Resources
- **Raspberry Pi Forums**: https://forums.raspberrypi.com/
- **Pi-Chat GitHub**: https://github.com/tejbruhath/pi-chat

### Helpful Commands

```bash
# System Info
cat /proc/cpuinfo
cat /etc/os-release
uname -a

# Raspberry Pi specific
vcgencmd get_config int
vcgencmd get_mem arm
vcgencmd measure_volts

# Network info
hostname -I
ip addr show
```

---

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] Service running: `sudo systemctl status pi-chat`
- [ ] Ngrok tunnel active: `curl http://localhost:4040/api/tunnels`
- [ ] Temperature normal: `vcgencmd measure_temp`
- [ ] Memory available: `free -h`
- [ ] Application accessible locally: `curl http://localhost:3000`
- [ ] Public URL works
- [ ] WebSocket connections work
- [ ] File uploads work

---

## 🎉 Success!

Your Raspberry Pi is now a fully functional chat server accessible from anywhere in the world! 

**Access your chat:**
- Local: `http://[pi-ip]:3000`
- Public: Check the Ngrok URL displayed after deployment

**Manage your deployment:**
```bash
sudo systemctl status pi-chat  # Check status
~/update-pi-chat.sh            # Update app
~/start-ngrok.sh               # Restart Ngrok
cat ~/pi-chat-info.txt         # View all info
```

Enjoy your Raspberry Pi powered chat application! 🍓💬
