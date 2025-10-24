#!/bin/bash

# Pi-Chat Deployment Script for Debian/Ubuntu/Raspberry Pi OS
# Deploys Next.js chat application with MongoDB Atlas, Nginx, and Ngrok
# Compatible with:
#   - Debian 12/13 (Bookworm/Trixie)
#   - Ubuntu 22.04/24.04
#   - Raspberry Pi OS (Debian 13 Trixie)
#   - AWS EC2, DigitalOcean, etc.
# Supports: x86_64, ARM64, ARMv7

# Exit on error and print commands
set -e
set -x

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/tejbruhath/pi-chat.git"
APP_DIR="/home/$(whoami)/pi-chat"
NGROK_AUTH_TOKEN="34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Warning function
warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Info function
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Error function
error_exit() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    error_exit "Please run as root or use sudo"
fi

log "🚀 Starting Pi-Chat deployment"
log "📦 This will install: Node.js, PM2, Nginx, Ngrok, and deploy the chat app"
log "ℹ️  Using port 8080 for Nginx to avoid port 80 conflicts"

# Detect system information
if [ -f /etc/os-release ]; then
    OS_NAME=$(grep "^NAME=" /etc/os-release | cut -d '"' -f 2)
    OS_VERSION=$(grep "VERSION=" /etc/os-release | cut -d '"' -f 2 || echo "Unknown")
    info "OS: $OS_NAME $OS_VERSION"
fi

# Detect Raspberry Pi model (if applicable)
if [ -f /proc/cpuinfo ] && grep -q "Raspberry Pi" /proc/cpuinfo; then
    PI_MODEL=$(grep "Model" /proc/cpuinfo | cut -d ":" -f 2 | xargs || echo "Unknown")
    info "🍓 Detected: $PI_MODEL"
fi

# Check system resources
ARCH=$(uname -m)
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
info "Architecture: $ARCH"
info "Total RAM: ${TOTAL_MEM}MB"

if [ "$TOTAL_MEM" -lt 1024 ]; then
    warn "Low memory detected! Minimum 1GB RAM recommended for optimal performance"
    warn "Consider enabling swap if not already enabled"
fi

# Get the actual non-root user
ACTUAL_USER=$(logname 2>/dev/null || echo $SUDO_USER)
if [ -z "$ACTUAL_USER" ] || [ "$ACTUAL_USER" == "root" ]; then
    # Try to detect common user accounts
    if id "ubuntu" &>/dev/null; then
        ACTUAL_USER="ubuntu"  # AWS EC2, DigitalOcean
    elif id "admin" &>/dev/null; then
        ACTUAL_USER="admin"  # Some cloud providers
    elif id "pi" &>/dev/null; then
        ACTUAL_USER="pi"  # Raspberry Pi OS
    else
        # Fall back to first non-system user
        ACTUAL_USER=$(awk -F: '$3 >= 1000 && $1 != "nobody" {print $1; exit}' /etc/passwd)
    fi
fi
USER_HOME="/home/$ACTUAL_USER"

log "👤 Deploying for user: $ACTUAL_USER"
log "📁 Home directory: $USER_HOME"

# Update system
log "🔄 Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update || error_exit "Failed to update package lists"
apt-get upgrade -y || error_exit "Failed to upgrade packages"
apt-get dist-upgrade -y || error_exit "Failed to perform distribution upgrade"
apt-get autoremove -y || log "Warning: Failed to remove unnecessary packages"
apt-get autoclean -y || log "Warning: Failed to clean package cache"

# Install required dependencies
log "📦 Installing system dependencies..."
apt-get install -y --no-install-recommends \
    git \
    build-essential \
    python3-pip \
    libpcre2-dev \
    libssl-dev \
    zlib1g-dev \
    ca-certificates \
    curl \
    gnupg \
    lsb-release || error_exit "Failed to install system dependencies"

# Install Node.js from NodeSource
log "📥 Installing Node.js from NodeSource..."
NODE_MAJOR=20
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
apt-get update || error_exit "Failed to update package lists for Node.js"
apt-get install -y nodejs || error_exit "Failed to install Node.js"

# Verify Node.js installation
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
log "✅ Node.js version: $NODE_VERSION"
log "✅ npm version: $NPM_VERSION"

# Update npm
log "🔄 Updating npm to the latest version..."
npm install -g npm@latest || error_exit "Failed to update npm"

# Install PM2 process manager with specific version
log "⚙️  Installing PM2..."
npm install -g pm2@latest || error_exit "Failed to install PM2"

# Verify PM2 installation
if ! command -v pm2 &> /dev/null; then
    error_exit "PM2 installation verification failed"
fi
PM2_VERSION=$(pm2 --version)
log "✅ PM2 version: $PM2_VERSION"

# Setup PM2 to start on boot
log "🔧 Setting up PM2 startup..."
# Get the current non-root user (usually 'pi' on Raspberry Pi OS)
CURRENT_USER=$(whoami)
pm2 startup -u $ACTUAL_USER --hp $USER_HOME | tail -n 1 | bash || warn "Failed to set up PM2 startup (non-critical)"
pm2 save || warn "Failed to save PM2 process list (non-critical)"

# Install Ngrok (snap method for Raspberry Pi, apt fallback for others)
log "🔌 Installing Ngrok..."
if ! command -v ngrok &> /dev/null; then
    # Try snap first (recommended for Raspberry Pi)
    if command -v snap &> /dev/null; then
        log "Installing Ngrok via snap (Raspberry Pi method)..."
        snap install ngrok || warn "Snap installation failed, trying apt method..."
        
        if command -v ngrok &> /dev/null; then
            NGROK_VER=$(ngrok version | head -n1 || echo "unknown")
            log "✅ Ngrok installed via snap: $NGROK_VER"
        fi
    fi
    
    # If snap failed or not available, try apt
    if ! command -v ngrok &> /dev/null; then
        log "Installing Ngrok via apt repository..."
        
        # Add Ngrok GPG key
        curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
            | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
            || warn "Failed to add Ngrok GPG key"
        
        # Determine Debian codename
        if [ -f /etc/os-release ]; then
            DEBIAN_CODENAME=$(grep VERSION_CODENAME /etc/os-release | cut -d= -f2)
            if [ -z "$DEBIAN_CODENAME" ]; then
                DEBIAN_CODENAME="bookworm"  # Default for Debian 12/13
            fi
        else
            DEBIAN_CODENAME="bookworm"
        fi
        
        log "Using Debian codename: $DEBIAN_CODENAME"
        
        # Add Ngrok repository
        echo "deb https://ngrok-agent.s3.amazonaws.com $DEBIAN_CODENAME main" \
            | tee /etc/apt/sources.list.d/ngrok.list
        
        # Update and install
        apt-get update || error_exit "Failed to update package lists after adding Ngrok repo"
        apt-get install -y ngrok || error_exit "Failed to install Ngrok"
        
        # Verify installation
        if ngrok version &> /dev/null; then
            NGROK_VER=$(ngrok version | head -n1 || echo "unknown")
            log "✅ Ngrok installed via apt: $NGROK_VER"
        else
            error_exit "Failed to verify Ngrok installation"
        fi
    fi
else
    log "ℹ️  Ngrok is already installed: $(ngrok version | head -n1 || echo 'unknown version')"
fi

# Configure Ngrok auth token
log "🔑 Configuring Ngrok auth token..."
if command -v ngrok &> /dev/null; then
    ngrok config add-authtoken $NGROK_AUTH_TOKEN \
        || error_exit "Failed to add Ngrok auth token"
    log "✅ Ngrok auth token configured successfully"
else
    error_exit "Ngrok not found. Cannot configure auth token."
fi

# Check if port 8080 is available
log "🔍 Checking port 8080 availability..."
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    warn "Port 8080 is already in use!"
    warn "Services using port 8080:"
    lsof -Pi :8080 -sTCP:LISTEN || true
    warn "Pi-Chat will use port 8080. You may need to stop the conflicting service."
    warn "To stop a service: sudo systemctl stop <service-name>"
else
    log "✅ Port 8080 is available"
fi

# Install Nginx
log "📦 Installing Nginx..."

# Update package lists
apt-get update || error_exit "Failed to update package lists"

# Install basic Nginx (without NJS module as it's not needed for Next.js)
apt-get install -y nginx || error_exit "Failed to install Nginx"

# Verify Nginx installation
if ! command -v nginx &> /dev/null; then
    error_exit "Nginx installation failed"
fi

log "✅ Nginx $(nginx -v 2>&1 | cut -d' ' -f3 | cut -d'/' -f2) installed successfully"

# Configure UFW to allow Nginx traffic on port 8080
if command -v ufw &> /dev/null; then
    log "🔧 Configuring UFW for Nginx on port 8080..."
    ufw allow 8080/tcp || log "⚠️  Failed to configure UFW for port 8080"
    ufw --force enable || log "⚠️  Failed to enable UFW"
    ufw status || log "⚠️  Failed to check UFW status"
fi

# Configure Nginx as reverse proxy for Next.js with WebSocket support
log "🔧 Configuring Nginx as reverse proxy with WebSocket support..."
cat > /etc/nginx/sites-available/pi-chat << 'EOL'
# Pi-Chat Nginx Configuration
# Reverse proxy for Next.js app with Socket.IO WebSocket support

# WebSocket connection upgrade map
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 8080 default_server;
    listen [::]:8080 default_server;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Max upload size (for file uploads in chat)
    client_max_body_size 10M;

    # Socket.IO WebSocket endpoint (must be first for specific matching)
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        
        # WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts (24 hours for persistent connections)
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        
        # Disable buffering for WebSocket
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    # Main application and API routes
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # Support WebSocket upgrades on all routes
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Caching
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

# Enable the site
log "Enabling Pi-Chat site in Nginx..."
ln -sf /etc/nginx/sites-available/pi-chat /etc/nginx/sites-enabled/pi-chat

# Remove default site
if [ -L /etc/nginx/sites-enabled/default ]; then
    log "Removing default Nginx site..."
    rm -f /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
log "Testing Nginx configuration..."
nginx -t || error_exit "Nginx configuration test failed - check syntax"

# Reload or restart Nginx
if systemctl is-active --quiet nginx; then
    log "Reloading Nginx..."
    systemctl reload nginx || systemctl restart nginx || error_exit "Failed to reload Nginx"
else
    log "Starting Nginx..."
    systemctl start nginx || error_exit "Failed to start Nginx"
fi

# Enable Nginx on boot
systemctl enable nginx || warn "Failed to enable Nginx on boot (non-critical)"

# Verify Nginx is running
if systemctl is-active --quiet nginx; then
    log "✅ Nginx configured and running successfully"
else
    error_exit "Nginx is not running after configuration"
fi

# Create systemd service for the application
log "⚙️  Creating systemd service..."
cat > /etc/systemd/system/pi-chat.service << EOL
[Unit]
Description=Pi-Chat Application
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=/home/$(whoami)/pi-chat
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Create standalone ngrok starter script
log "📝 Creating Ngrok management scripts..."
cat > $USER_HOME/start-ngrok.sh << 'EOL'
#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stop any existing ngrok instances
pkill -f ngrok 2>/dev/null || true
sleep 2

# Start Ngrok tunnel in the background
echo -e "${GREEN}🌐 Starting Ngrok tunnel...${NC}"
nohup ngrok http --log=stdout 8080 > ~/ngrok.log 2>&1 &

# Wait for Ngrok to start
echo "⏳ Waiting for tunnel to establish..."
sleep 8

# Try to get the public URL
NGROK_URL=""
NGROK_ERROR=""

for i in {1..3}; do
    echo "Attempt $i: Checking Ngrok API..."
    NGROK_RESPONSE=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null || echo "")
    
    if [ -n "$NGROK_RESPONSE" ]; then
        # Check for errors
        if echo "$NGROK_RESPONSE" | grep -q "err_ngrok"; then
            NGROK_ERROR=$(echo "$NGROK_RESPONSE" | grep -o 'err_ngrok_[0-9]*' | head -n1)
            echo -e "${RED}⚠️  Ngrok error: $NGROK_ERROR${NC}"
            break
        fi
        
        # Extract URL
        NGROK_URL=$(echo "$NGROK_RESPONSE" | grep -o '"public_url":"https://[^"]*"' | cut -d'"' -f4 | head -n1)
        
        if [ -n "$NGROK_URL" ] && [[ "$NGROK_URL" == https://*.ngrok* ]]; then
            break
        fi
    fi
    
    if [ $i -lt 3 ]; then
        sleep 3
    fi
done

# Try log file if API failed
if [ -z "$NGROK_URL" ] && [ -z "$NGROK_ERROR" ]; then
    NGROK_URL=$(grep -o 'url=https://[^ ]*\.ngrok[^ ]*' ~/ngrok.log 2>/dev/null | cut -d= -f2 | tr -d '\r' | head -n1 || echo "")
fi

# Display results
echo ""
if [ -n "$NGROK_URL" ] && [ -z "$NGROK_ERROR" ]; then
    echo -e "${GREEN}✅ Ngrok tunnel established!${NC}"
    echo -e "${GREEN}🌍 Public URL: $NGROK_URL${NC}"
    echo -e "${GREEN}📊 Dashboard:  http://localhost:4040${NC}"
elif [ -n "$NGROK_ERROR" ]; then
    echo -e "${RED}❌ Ngrok tunnel failed: $NGROK_ERROR${NC}"
    echo ""
    echo -e "${YELLOW}Common causes:${NC}"
    echo "  • Free tier limitations"
    echo "  • Account not verified"
    echo "  • Too many active tunnels"
    echo ""
    echo -e "${YELLOW}Solutions:${NC}"
    echo "  1. Visit: https://dashboard.ngrok.com"
    echo "  2. Check logs: tail -f ~/ngrok.log"
    echo "  3. Verify setup: ngrok config check"
else
    echo -e "${RED}⚠️  Could not get Ngrok URL${NC}"
    echo "Check logs: tail -f ~/ngrok.log"
fi
EOL

chmod +x $USER_HOME/start-ngrok.sh
chown $ACTUAL_USER:$ACTUAL_USER $USER_HOME/start-ngrok.sh

# Create ngrok stop script
cat > $USER_HOME/stop-ngrok.sh << 'EOL'
#!/bin/bash
echo "⏹️  Stopping Ngrok..."
pkill -f ngrok
echo "✅ Ngrok stopped"
EOL

chmod +x $USER_HOME/stop-ngrok.sh
chown $ACTUAL_USER:$ACTUAL_USER $USER_HOME/stop-ngrok.sh

# Clone and setup application
log "📝 Cloning and setting up Pi-Chat application..."

# Clone or update repository
if [ ! -d "$USER_HOME/pi-chat" ]; then
    log "🚀 Cloning Pi-Chat repository from GitHub..."
    sudo -u $ACTUAL_USER git clone $REPO_URL $USER_HOME/pi-chat || error_exit "Failed to clone repository"
else
    log "📁 Repository already exists, pulling latest changes..."
    cd $USER_HOME/pi-chat
    sudo -u $ACTUAL_USER git pull || log "Warning: Failed to update repository"
fi

cd $USER_HOME/pi-chat

# Install dependencies
log "📦 Installing npm dependencies..."
sudo -u $ACTUAL_USER npm install || error_exit "Failed to install dependencies"

# Build the project
log "🔨 Building Next.js application..."
sudo -u $ACTUAL_USER npm run build || error_exit "Build failed"

# Create systemd service for the app
log "⚙️  Creating systemd service..."
cat > /etc/systemd/system/pi-chat.service << EOF
[Unit]
Description=Pi-Chat Next.js Application
After=network.target

[Service]
Type=simple
User=$ACTUAL_USER
WorkingDirectory=$USER_HOME/pi-chat
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable pi-chat
systemctl restart pi-chat || error_exit "Failed to start Pi-Chat service"

log "✅ Pi-Chat application deployed successfully!"

# Create setup script for future updates
log "📝 Creating update script..."
cat > $USER_HOME/update-pi-chat.sh << 'EOL'
#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

cd ~/pi-chat

log "📥 Pulling latest changes..."
git pull

log "📦 Installing dependencies..."
npm install

log "🔨 Building application..."
npm run build

log "🔄 Restarting service..."
sudo systemctl restart pi-chat

log "✅ Update complete!"
EOL

chmod +x $USER_HOME/update-pi-chat.sh
chown $ACTUAL_USER:$ACTUAL_USER $USER_HOME/update-pi-chat.sh

# Start Ngrok tunnel
log "🌐 Starting Ngrok tunnel..."
sudo -u $ACTUAL_USER bash -c "nohup ngrok http --log=stdout 8080 > $USER_HOME/ngrok.log 2>&1 &"

# Wait for Ngrok to start and get URL
log "⏳ Waiting for Ngrok to establish tunnel..."
sleep 8

# Try to get the public URL from API
NGROK_URL=""
NGROK_ERROR=""
for i in {1..3}; do
    log "Attempt $i: Checking Ngrok API..."
    NGROK_RESPONSE=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null || echo "")
    
    if [ -n "$NGROK_RESPONSE" ]; then
        # Check for errors in response
        if echo "$NGROK_RESPONSE" | grep -q "err_ngrok"; then
            NGROK_ERROR=$(echo "$NGROK_RESPONSE" | grep -o 'err_ngrok_[0-9]*' | head -n1)
            warn "Ngrok error detected: $NGROK_ERROR"
            break
        fi
        
        # Try to extract URL
        NGROK_URL=$(echo "$NGROK_RESPONSE" | grep -o '"public_url":"https://[^"]*"' | cut -d'"' -f4 | head -n1)
        
        if [ -n "$NGROK_URL" ] && [[ "$NGROK_URL" == https://*.ngrok* ]]; then
            log "✅ Ngrok tunnel established!"
            break
        fi
    fi
    
    if [ $i -lt 3 ]; then
        sleep 3
    fi
done

# If API failed, try log file as fallback
if [ -z "$NGROK_URL" ] || [ -n "$NGROK_ERROR" ]; then
    warn "Could not get URL from API, checking log file..."
    sleep 2
    NGROK_URL=$(grep -o 'url=https://[^ ]*\.ngrok[^ ]*' $USER_HOME/ngrok.log 2>/dev/null | cut -d= -f2 | tr -d '\r' | head -n1 || echo "")
fi

log "🎉 Deployment Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Pi-Chat is now running on your server!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌍 PUBLIC URL:"
if [ -n "$NGROK_URL" ] && [ -z "$NGROK_ERROR" ]; then
    echo "   $NGROK_URL"
elif [ -n "$NGROK_ERROR" ]; then
    echo "   ⚠️  Ngrok tunnel failed: $NGROK_ERROR"
    echo ""
    echo "   Common causes:"
    echo "   - Free tier limitations (try upgrading at ngrok.com)"
    echo "   - Account not verified"
    echo "   - Too many active tunnels"
    echo "   - Invalid auth token"
    echo ""
    echo "   Troubleshooting:"
    echo "   1. Check logs: tail -f $USER_HOME/ngrok.log"
    echo "   2. Verify auth token: ngrok config check"
    echo "   3. Visit: https://dashboard.ngrok.com/get-started/setup"
    echo "   4. Or use: $USER_HOME/start-ngrok.sh"
else
    echo "   ⚠️  Could not get Ngrok URL"
    echo "   Check logs: tail -f $USER_HOME/ngrok.log"
    echo "   Or restart: $USER_HOME/start-ngrok.sh"
fi
echo ""
echo "🔧 LOCAL ACCESS:"
echo "   App (Direct):  http://localhost:3000"
echo "   Nginx (Proxy): http://localhost:8080"
echo ""
echo "📊 SERVICE STATUS:"
echo "   sudo systemctl status pi-chat"
echo ""
echo "📋 VIEW LOGS:"
echo "   Application: journalctl -u pi-chat -f"
echo "   Ngrok:       tail -f $USER_HOME/ngrok.log"
echo ""
echo "🔄 UPDATE APP:"
echo "   $USER_HOME/update-pi-chat.sh"
echo ""
echo "🌐 NGROK DASHBOARD:"
echo "   http://localhost:4040"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Save deployment info
cat > $USER_HOME/pi-chat-info.txt << EOF
Pi-Chat Deployment Information
Generated: $(date)

═══════════════════════════════════════
📡 ACCESS URLS
═══════════════════════════════════════
Public URL: $NGROK_URL
Local URL: http://localhost:3000
Local (Nginx): http://localhost:8080
Ngrok Dashboard: http://localhost:4040

═══════════════════════════════════════
📁 INSTALLATION
═══════════════════════════════════════
GitHub Repository: $REPO_URL
Installation Directory: $USER_HOME/pi-chat
User: $ACTUAL_USER
System: $(uname -a)

═══════════════════════════════════════
🔧 SERVICE MANAGEMENT
═══════════════════════════════════════
Application Service: pi-chat

Status:
  sudo systemctl status pi-chat
  sudo systemctl status nginx

Restart:
  sudo systemctl restart pi-chat
  sudo systemctl restart nginx

Logs:
  journalctl -u pi-chat -f
  sudo tail -f /var/log/nginx/error.log
  tail -f $USER_HOME/ngrok.log

═══════════════════════════════════════
🌐 NGINX COMMANDS
═══════════════════════════════════════
Status:
  sudo systemctl status nginx

Restart:
  sudo systemctl restart nginx
  sudo systemctl reload nginx    # No downtime

Test Config:
  sudo nginx -t

View Logs:
  sudo tail -f /var/log/nginx/access.log
  sudo tail -f /var/log/nginx/error.log

Edit Config:
  sudo nano /etc/nginx/sites-available/pi-chat

═══════════════════════════════════════
🚀 NGROK COMMANDS
═══════════════════════════════════════
Start: $USER_HOME/start-ngrok.sh
Stop:  $USER_HOME/stop-ngrok.sh
Logs:  tail -f $USER_HOME/ngrok.log
Config: ngrok config check

═══════════════════════════════════════
🔄 MAINTENANCE
═══════════════════════════════════════
Update App: $USER_HOME/update-pi-chat.sh

Full Restart:
  sudo systemctl restart pi-chat
  sudo systemctl reload nginx
  $USER_HOME/stop-ngrok.sh
  $USER_HOME/start-ngrok.sh

═══════════════════════════════════════
🗄️ DATABASE
═══════════════════════════════════════
MongoDB Atlas: Connected
Database: pi-chat
Connection: See lib/db.ts for connection string
No local database setup required

═══════════════════════════════════════
📚 DOCUMENTATION
═══════════════════════════════════════
README: $USER_HOME/pi-chat/README.md
Nginx Guide: $USER_HOME/pi-chat/NGINX_RASPBERRY_PI_GUIDE.md
Ngrok Guide: $USER_HOME/pi-chat/NGROK_TROUBLESHOOTING.md
Mobile UI: $USER_HOME/pi-chat/MOBILE_IMPROVEMENTS.md

═══════════════════════════════════════
🔍 TROUBLESHOOTING
═══════════════════════════════════════
Check all services:
  sudo systemctl status pi-chat nginx
  ps aux | grep ngrok

Test connections:
  curl -I http://localhost:3000  # App
  curl -I http://localhost:8080    # Nginx
  curl http://localhost:4040/api/tunnels  # Ngrok

View all logs:
  journalctl -u pi-chat -n 50
  sudo tail -n 50 /var/log/nginx/error.log
  tail -n 50 $USER_HOME/ngrok.log

═══════════════════════════════════════
For more help, visit:
https://github.com/tejbruhath/pi-chat
EOF

chown $ACTUAL_USER:$ACTUAL_USER $USER_HOME/pi-chat-info.txt

log "📄 Deployment info saved to: $USER_HOME/pi-chat-info.txt"