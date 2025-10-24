#!/bin/bash

# Exit on error and print commands
set -e
set -x

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

# Install Ngrok
log "🔌 Installing Ngrok..."
if ! command -v ngrok &> /dev/null; then
    NGROK_VERSION="3.5.0"
    NGROK_ARCH="linux-amd64"
    NGROK_URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v${NGROK_VERSION}-${NGROK_ARCH}.tgz"
    
    curl -sSL $NGROK_URL -o /tmp/ngrok.tgz || error_exit "Failed to download Ngrok"
    tar xzf /tmp/ngrok.tgz -C /usr/local/bin/ || error_exit "Failed to extract Ngrok"
    rm -f /tmp/ngrok.tgz
    
    if ! ngrok --version &> /dev/null; then
        error_exit "Failed to verify Ngrok installation"
    fi
    log "✅ Ngrok $(ngrok --version) installed successfully"
else
    log "ℹ️  Ngrok is already installed"
fi

# Configure Ngrok auth token
log "🔑 Configuring Ngrok auth token..."
if command -v ngrok &> /dev/null; then
    ngrok config add-authtoken 34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1 \
        || error_exit "Failed to add Ngrok auth token"
    log "✅ Ngrok auth token configured"
else
    error_exit "Ngrok not found. Cannot configure auth token."
fi

# Clean up any existing Nginx repository configurations
log "🧹 Cleaning up any existing Nginx repository configurations..."
rm -f /etc/apt/sources.list.d/nginx-*.list* 2>/dev/null || true
rm -f /etc/apt/sources.list.d/nginx.list* 2>/dev/null || true

# Install Nginx with NJS module from Ubuntu's official repository
log "📦 Installing Nginx with NJS module..."

# First, clean the package cache
apt-get clean
rm -rf /var/lib/apt/lists/*

# Update package lists without any Nginx repositories
apt-get update || error_exit "Failed to update package lists"

# Install Nginx with NJS module from Ubuntu's repository
apt-get install -y --no-install-recommends \
    nginx \
    libnginx-mod-njs \
    libnginx-mod-http-js \
    nginx-common || error_exit "Failed to install Nginx with NJS module"

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

# Create startup script for Ngrok
log "📝 Creating startup scripts..."
cat > ~/start-ngrok.sh << 'EOL'
#!/bin/bash

# Start Ngrok tunnel in the background
nohup ngrok http --log=stdout 80 > /home/$(whoami)/ngrok.log 2>&1 &

# Wait for Ngrok to start
sleep 5

# Get public URL
public_url=$(grep -o 'https://[^ ]*.ngrok.io' /home/$(whoami)/ngrok.log | tail -n1)
if [ -n "$public_url" ]; then
    echo "🌍 Your Pi-Chat is available at: $public_url"
else
    echo "⚠️  Failed to get Ngrok URL. Check ~/ngrok.log for details."
fi
EOL

chmod +x ~/start-ngrok.sh

# Create setup script
log "📝 Creating setup script..."
cat > ~/setup-pi-chat.sh << 'EOL'
#!/bin/bash

set -e

# Logging function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Error function
error_exit() {
    log "[ERROR] $1" >&2
    exit 1
}

# Clone or update repository
if [ ! -d "pi-chat" ]; then
    log "🚀 Cloning Pi-Chat repository..."
    git clone https://github.com/tejbruhath/pi-chat.git || error_exit "Failed to clone repository"
    cd pi-chat
else
    log "🔄 Updating Pi-Chat repository..."
    cd pi-chat
    git pull || error_exit "Failed to update repository"
fi

# Install dependencies
log "📦 Installing dependencies..."
npm ci --production || error_exit "Failed to install dependencies"

# Build the project
log "🔨 Building the project..."
npm run build || error_exit "Build failed"

# Set up systemd service
log "⚙️  Setting up systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable pi-chat
sudo systemctl restart pi-chat || error_exit "Failed to start Pi-Chat service"

# Start Ngrok
log "🚀 Starting Ngrok..."
~/start-ngrok.sh

log "✅ Setup complete!"
EOL

chmod +x ~/setup-pi-chat.sh

log "🎉 Installation complete!"
echo -e "\nNext steps:"
echo "1. Run the setup script: ~/setup-pi-chat.sh"
echo "2. Your application will be available at the Ngrok URL shown"
echo "3. Check the status with: sudo systemctl status pi-chat"
echo "4. View logs with: journalctl -u pi-chat -f"add