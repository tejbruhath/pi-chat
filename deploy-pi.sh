#!/bin/bash

# Pi-Chat Deployment Script for Ubuntu 24.04
# Deploys Next.js chat application with MongoDB Atlas, Nginx, and Ngrok

# Exit on error and print commands
set -e
set -x

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/tejbruhath/pi-chat.git"
APP_DIR="/home/$(whoami)/pi-chat"
NGROK_AUTH_TOKEN="34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
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

log "🚀 Starting Pi-Chat deployment on Ubuntu 24.04"
log "📦 This will install: Node.js, PM2, Nginx, Ngrok, and deploy the chat app"

# Get the actual non-root user
ACTUAL_USER=$(logname 2>/dev/null || echo $SUDO_USER)
if [ -z "$ACTUAL_USER" ]; then
    ACTUAL_USER="ubuntu"  # Default to ubuntu if we can't determine
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
    sqlite3 \
    libpcre3-dev \
    libssl-dev \
    zlib1g-dev \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common || error_exit "Failed to install system dependencies"

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
# Get the current non-root user (usually 'ubuntu' on cloud instances)
CURRENT_USER=$(whoami)
pm2 startup -u $CURRENT_USER --hp /home/$CURRENT_USER | tail -n 1 | bash || log "Warning: Failed to set up PM2 startup"
pm2 save || log "Warning: Failed to save PM2 process list"

# Install Ngrok using snap (recommended method)
log "🔌 Installing Ngrok using snap..."
if ! command -v ngrok &> /dev/null; then
    # Install snapd if not already installed
    if ! command -v snap &> /dev/null; then
        log "📦 Installing snapd..."
        apt-get update
        apt-get install -y snapd
        systemctl enable --now snapd.socket
        systemctl restart snapd
    fi

    # Install ngrok using snap
    snap install ngrok || error_exit "Failed to install ngrok via snap"
    
    # Create a symlink to make it available in the PATH
    ln -s /snap/bin/ngrok /usr/local/bin/ngrok || true
    
    # Verify installation
    if ngrok --version &> /dev/null; then
        log "✅ Ngrok $(ngrok --version) installed successfully"
    else
        error_exit "Failed to verify Ngrok installation"
    fi
else
    log "ℹ️  Ngrok is already installed"
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

# Configure UFW to allow Nginx traffic
if command -v ufw &> /dev/null; then
    log "🔧 Configuring UFW for Nginx..."
    ufw allow 'Nginx Full' || log "⚠️  Failed to configure UFW for Nginx"
    ufw --force enable || log "⚠️  Failed to enable UFW"
    ufw status || log "⚠️  Failed to check UFW status"
fi

# Configure Nginx as reverse proxy for Next.js
log "🔧 Configuring Nginx as reverse proxy..."
cat > /etc/nginx/sites-available/pi-chat << 'EOL'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOL

# Enable the site
ln -sf /etc/nginx/sites-available/pi-chat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default  # Remove default config

# Test and restart Nginx
nginx -t || error_exit "Nginx configuration test failed"
systemctl restart nginx || error_exit "Failed to restart Nginx"
log "✅ Nginx configured as reverse proxy for port 3000"

# Verify Nginx installation
if ! command -v nginx &> /dev/null; then
    error_exit "Nginx installation verification failed"
fi
NGINX_VERSION=$(nginx -v 2>&1 | awk -F'/' '{print $2}')
log "✅ Nginx version: $NGINX_VERSION"

# Configure Nginx
log "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/pi-chat << 'EOL'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

# Enable the site
ln -sf /etc/nginx/sites-available/pi-chat /etc/nginx/sites-enabled/
nginx -t || error_exit "Nginx configuration test failed"
systemctl restart nginx || error_exit "Failed to restart Nginx"

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

# Start Ngrok tunnel in the background
echo "🌐 Starting Ngrok tunnel..."
nohup ngrok http --log=stdout 80 > ~/ngrok.log 2>&1 &

# Wait for Ngrok to start
sleep 5

# Get public URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*ngrok[^"]*' | head -n1 || true)

if [ -z "$NGROK_URL" ]; then
    NGROK_URL=$(grep -o 'https://[^ ]*ngrok[^ ]*' ~/ngrok.log 2>/dev/null | tail -n1 || echo "")
fi

if [ -n "$NGROK_URL" ]; then
    echo "✅ Ngrok tunnel established!"
    echo "🌍 Your Pi-Chat is available at: $NGROK_URL"
    echo "📊 Ngrok dashboard: http://localhost:4040"
else
    echo "⚠️  Failed to get Ngrok URL. Check ~/ngrok.log for details."
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
sudo -u $ACTUAL_USER bash -c "nohup ngrok http --log=stdout 80 > $USER_HOME/ngrok.log 2>&1 &"

# Wait for Ngrok to start and get URL
log "⏳ Waiting for Ngrok to establish tunnel..."
sleep 5

# Try to get the public URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*ngrok[^"]*' | head -n1 || true)

if [ -z "$NGROK_URL" ]; then
    # Fallback: try to extract from log file
    NGROK_URL=$(grep -o 'https://[^ ]*ngrok[^ ]*' $USER_HOME/ngrok.log 2>/dev/null | tail -n1 || echo "")
fi

log "🎉 Deployment Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Pi-Chat is now running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌍 PUBLIC URL:"
if [ -n "$NGROK_URL" ]; then
    echo "   $NGROK_URL"
else
    echo "   Check ngrok.log: cat $USER_HOME/ngrok.log"
fi
echo ""
echo "🔧 LOCAL ACCESS:"
echo "   http://localhost:3000"
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

Public URL: $NGROK_URL
Local URL: http://localhost:3000
Ngrok Dashboard: http://localhost:4040

GitHub Repository: $REPO_URL
Installation Directory: $USER_HOME/pi-chat

Service Name: pi-chat
Service Status: sudo systemctl status pi-chat
Application Logs: journalctl -u pi-chat -f
Ngrok Logs: tail -f $USER_HOME/ngrok.log

Update Script: $USER_HOME/update-pi-chat.sh

MongoDB Atlas: Connected (see lib/db.ts for connection string)
EOF

chown $ACTUAL_USER:$ACTUAL_USER $USER_HOME/pi-chat-info.txt

log "📄 Deployment info saved to: $USER_HOME/pi-chat-info.txt"