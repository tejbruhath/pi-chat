# Nginx Configuration Guide for Raspberry Pi

## Overview
This guide covers Nginx setup, configuration, and management for Pi-Chat on Raspberry Pi OS (Debian 13 Trixie).

---

## Installation

### Automatic (via deploy script)
```bash
sudo ./deploy-pi.sh
```

### Manual Installation
```bash
# Update package lists
sudo apt update

# Install Nginx
sudo apt install nginx

# Verify installation
nginx -v
```

---

## Nginx Commands Reference

### Service Management

#### Start/Stop/Restart
```bash
# Start Nginx
sudo systemctl start nginx
sudo service nginx start
sudo /etc/init.d/nginx start

# Stop Nginx
sudo systemctl stop nginx
sudo service nginx stop
sudo /etc/init.d/nginx stop

# Restart Nginx
sudo systemctl restart nginx
sudo service nginx restart
sudo /etc/init.d/nginx restart

# Reload configuration (no downtime)
sudo systemctl reload nginx
sudo service nginx reload
sudo nginx -s reload
```

#### Status and Enable
```bash
# Check status
sudo systemctl status nginx
sudo service status nginx

# Enable on boot
sudo systemctl enable nginx

# Disable on boot
sudo systemctl disable nginx
```

### Configuration Management

#### Test Configuration
```bash
# Test configuration syntax
sudo nginx -t

# Test with specific config file
sudo nginx -t -c /etc/nginx/nginx.conf
```

#### View Configuration
```bash
# View main config
sudo nano /etc/nginx/nginx.conf

# View site config
sudo nano /etc/nginx/sites-available/pi-chat

# List enabled sites
ls -la /etc/nginx/sites-enabled/
```

### Logs

#### View Logs
```bash
# Access log
sudo tail -f /var/log/nginx/access.log

# Error log
sudo tail -f /var/log/nginx/error.log

# Last 50 lines
sudo tail -n 50 /var/log/nginx/error.log

# Follow both logs
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

#### Clear Logs
```bash
# Truncate logs (be careful!)
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log
```

---

## Pi-Chat Nginx Configuration

### Current Configuration
Location: `/etc/nginx/sites-available/pi-chat`

```nginx
# WebSocket connection upgrade map
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Max upload size
    client_max_body_size 10M;

    # Socket.IO WebSocket endpoint
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Key Features
- ✅ **WebSocket Support** - Full Socket.IO compatibility
- ✅ **Security Headers** - XSS, frame, content-type protection
- ✅ **File Uploads** - 10MB max size
- ✅ **Long Timeouts** - 24h for WebSocket, 5min for HTTP
- ✅ **IPv6 Support** - Ready for modern networks

---

## Site Management

### Enable/Disable Sites
```bash
# Enable Pi-Chat site
sudo ln -s /etc/nginx/sites-available/pi-chat /etc/nginx/sites-enabled/

# Disable Pi-Chat site
sudo rm /etc/nginx/sites-enabled/pi-chat

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test after changes
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx
```

### Edit Configuration
```bash
# Edit Pi-Chat config
sudo nano /etc/nginx/sites-available/pi-chat

# After editing, always test
sudo nginx -t

# Then reload
sudo systemctl reload nginx
```

---

## Troubleshooting

### Common Issues

#### 1. Port 80 Already in Use
```bash
# Check what's using port 80
sudo lsof -i :80

# Or with netstat
sudo netstat -tlnp | grep :80

# Kill process if needed
sudo kill -9 <PID>
```

#### 2. Configuration Test Fails
```bash
# Test and show detailed errors
sudo nginx -t

# Check syntax in main config
sudo nginx -t -c /etc/nginx/nginx.conf

# View error log
sudo tail -f /var/log/nginx/error.log
```

#### 3. Nginx Won't Start
```bash
# Check status
sudo systemctl status nginx

# View detailed errors
journalctl -xeu nginx.service

# Check logs
sudo tail -n 50 /var/log/nginx/error.log

# Verify port availability
sudo lsof -i :80
```

#### 4. 502 Bad Gateway
```bash
# Check if app is running
sudo systemctl status pi-chat

# Check app port
sudo lsof -i :3000

# Restart app
sudo systemctl restart pi-chat

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

#### 5. WebSocket Connection Failed
```bash
# Verify WebSocket config
sudo nginx -t

# Check proxy headers
sudo grep -A 10 "socket.io" /etc/nginx/sites-available/pi-chat

# Test connection
curl -I http://localhost:3000/socket.io/

# Check app WebSocket
journalctl -u pi-chat -f | grep -i socket
```

---

## Performance Tuning for Raspberry Pi

### Optimize for Low Memory

Edit `/etc/nginx/nginx.conf`:

```nginx
# Worker processes (1 per core, Pi 4 has 4 cores)
worker_processes auto;

# Connection limits (lower for Pi)
events {
    worker_connections 512;  # Default: 768
    use epoll;
}

# Buffer sizes (smaller for Pi)
http {
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 10m;
    large_client_header_buffers 2 1k;
    
    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;
    
    # Compression
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/javascript
        application/json
        text/css
        text/plain;
}
```

### Apply Changes
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Monitoring

### Check Resource Usage
```bash
# CPU and Memory
htop

# Nginx processes
ps aux | grep nginx

# Connection count
sudo netstat -an | grep :80 | wc -l

# Active connections
sudo lsof -i :80 | wc -l
```

### Real-time Monitoring
```bash
# Watch access log
sudo tail -f /var/log/nginx/access.log

# Watch error log
sudo tail -f /var/log/nginx/error.log

# Watch both
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log

# Watch with filtering
sudo tail -f /var/log/nginx/error.log | grep -i error
```

---

## Security

### Firewall Configuration
```bash
# Allow HTTP
sudo ufw allow 'Nginx HTTP'

# Allow HTTPS (if using SSL)
sudo ufw allow 'Nginx HTTPS'

# Allow both
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

### SSL/HTTPS Setup (Optional)

#### Using Let's Encrypt (Free)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

#### Using Ngrok (Already Configured)
- Ngrok provides HTTPS automatically
- No additional SSL setup needed
- Public URL format: `https://xyz.ngrok.io`

---

## Backup and Restore

### Backup Configuration
```bash
# Backup main config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Backup site config
sudo cp /etc/nginx/sites-available/pi-chat /etc/nginx/sites-available/pi-chat.backup

# Backup all configs
sudo tar -czf ~/nginx-backup-$(date +%Y%m%d).tar.gz /etc/nginx/
```

### Restore Configuration
```bash
# Restore from backup
sudo cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Useful Commands Cheat Sheet

```bash
# Quick reference
sudo systemctl status nginx      # Status
sudo systemctl restart nginx     # Restart
sudo systemctl reload nginx      # Reload config
sudo nginx -t                    # Test config
sudo tail -f /var/log/nginx/error.log  # View errors
sudo lsof -i :80                # Check port 80
ps aux | grep nginx             # Check processes
sudo nginx -s stop              # Stop quickly
sudo nginx -s quit              # Stop gracefully
```

---

## Integration with Pi-Chat

### Checking Full Stack
```bash
# 1. Check Nginx
sudo systemctl status nginx

# 2. Check Pi-Chat app
sudo systemctl status pi-chat

# 3. Check Ngrok
ps aux | grep ngrok

# 4. Test local access
curl -I http://localhost

# 5. Test app directly
curl -I http://localhost:3000

# 6. Check logs
sudo tail -f /var/log/nginx/error.log
journalctl -u pi-chat -f
tail -f ~/ngrok.log
```

### Full Restart Sequence
```bash
# Restart everything
sudo systemctl restart pi-chat
sudo systemctl reload nginx
~/stop-ngrok.sh
~/start-ngrok.sh
```

---

## Advanced Configuration

### Custom Domain Setup
If you have a domain name:

1. **Update Nginx config:**
```nginx
server_name yourdomain.com www.yourdomain.com;
```

2. **Test and reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

3. **Setup SSL:**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Rate Limiting
To prevent abuse:

```nginx
# Add to http block in nginx.conf
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Add to location block
location /api/ {
    limit_req zone=api burst=20;
    # ... other config
}
```

---

## Resources

### Official Documentation
- Nginx Docs: https://nginx.org/en/docs/
- Raspberry Pi Nginx: https://www.raspberrypi.com/documentation/computers/remote-access.html#nginx

### Configuration Examples
- `/etc/nginx/nginx.conf` - Main configuration
- `/etc/nginx/sites-available/` - Available sites
- `/etc/nginx/sites-enabled/` - Enabled sites
- `/var/log/nginx/` - Log files

### Support
- Nginx Forum: https://forum.nginx.org/
- Raspberry Pi Forums: https://forums.raspberrypi.com/

---

## Summary

Nginx on your Raspberry Pi provides:
- ✅ **Reverse Proxy** - Routes traffic to Pi-Chat
- ✅ **WebSocket Support** - Enables real-time chat
- ✅ **Security Headers** - Protects against attacks
- ✅ **Performance** - Optimized for low-power hardware
- ✅ **Monitoring** - Comprehensive logging
- ✅ **Reliability** - Auto-restart on failure

**Your Pi-Chat is production-ready with Nginx!** 🚀
