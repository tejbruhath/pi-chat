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

log "🚀 Starting Pi-Chat deployment on Raspberry Pi"

# Update system
log "🔄 Updating system packages..."
apt-get update || error_exit "Failed to update package lists"
apt-get upgrade -y || error_exit "Failed to upgrade packages"
apt-get dist-upgrade -y || error_exit "Failed to perform distribution upgrade"
apt-get autoremove -y || log "Warning: Failed to remove unnecessary packages"
apt-get autoclean -y || log "Warning: Failed to clean package cache"

# Install required dependencies
log "📦 Installing system dependencies..."
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
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
    lsb-release || error_exit "Failed to install system dependencies"

# Install Node.js from NodeSource
log "📥 Installing Node.js from NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || error_exit "Failed to add NodeSource repository"
apt-get install -y nodejs || error_exit "Failed to install Node.js"

# Ensure npm is up to date
log "🔄 Updating npm to the latest version..."
npm install -g npm@latest || error_exit "Failed to update npm"

# Check Node.js version
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
log "✅ Node.js version: $NODE_VERSION"
log "✅ npm version: $NPM_VERSION"

# Install PM2 process manager with specific version
log "⚙️  Installing PM2..."
npm install -g pm2@latest || error_exit "Failed to install PM2"

# Verify PM2 installation
PM2_VERSION=$(pm2 --version 2>/dev/null || echo "0")
if [ "$PM2_VERSION" = "0" ]; then
    error_exit "PM2 installation verification failed"
fi
log "✅ PM2 version: $PM2_VERSION"

# Setup PM2 to start on boot
log "🔧 Setting up PM2 startup..."
pm2 startup | tail -n 1 | bash || log "Warning: Failed to set up PM2 startup"

# Install Ngrok
log "🔌 Installing Ngrok via official Debian package..."
if ! command -v ngrok &> /dev/null; then
    curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
        | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
        || error_exit "Failed to add Ngrok GPG key"
    
    echo "deb https://ngrok-agent.s3.amazonaws.com bookworm main" \
        | tee /etc/apt/sources.list.d/ngrok.list \
        || error_exit "Failed to add Ngrok repository"
    
    apt-get update || error_exit "Failed to update package lists for Ngrok"
    apt-get install -y ngrok || error_exit "Failed to install Ngrok"
    
    log "✅ Ngrok installed successfully"
else
    log "ℹ️  Ngrok is already installed"
fi

# Add Ngrok auth token
log "🔑 Configuring Ngrok auth token..."
if command -v ngrok &> /dev/null; then
    ngrok config add-authtoken 34VRqCR1RxyNl66HNouWceHmA96_7btc3WYii8zQEgb1ZJt1 \
        || error_exit "Failed to add Ngrok auth token"
    log "✅ Ngrok auth token configured"
else
    error_exit "Ngrok not found. Cannot configure auth token."
fi

# Install specific version of Nginx with NJS module
log "📦 Installing Nginx with NJS module..."
NGINX_VERSION="1.25.3-1~bookworm"

# Add Nginx repository
apt-get install -y --no-install-recommends \
    gnupg2 \
    lsb-release \
    ca-certificates \
    curl || error_exit "Failed to install prerequisites"

# Add Nginx signing key
curl -fsSL https://nginx.org/keys/nginx_signing.key | gpg --dearmor | tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null || error_exit "Failed to add Nginx GPG key"

# Add Nginx repository
echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] http://nginx.org/packages/debian $(lsb_release -cs) nginx" | tee /etc/apt/sources.list.d/nginx.list || error_exit "Failed to add Nginx repository"

# Install specific version of Nginx with NJS module
apt-get update || error_exit "Failed to update package lists for Nginx"
apt-get install -y --no-install-recommends \
    nginx=${NGINX_VERSION} \
    nginx-module-njs || error_exit "Failed to install Nginx with NJS module"

# Verify Nginx installation
NGINX_VERSION_INSTALLED=$(nginx -v 2>&1 | awk -F'/' '{print $2}')
log "✅ Nginx version: $NGINX_VERSION_INSTALLED"

# Configure Nginx with NJS
echo "🌐 Configuring Nginx with NJS..."
sudo bash -c 'cat > /etc/nginx/nginx.conf << EOL
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Logging Settings
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip Settings
    gzip on;
    gzip_disable "msie6";

    # Load NJS module
    js_import /usr/share/nginx/njs/example.js;

    # Virtual Host Configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOL'

# Create NJS example script
sudo mkdir -p /usr/share/nginx/njs
sudo bash -c 'cat > /usr/share/nginx/njs/example.js << EOL
function hello(r) {
    r.return(200, "Hello from NJS!");
}

export default { hello };
EOL'

# Configure Pi-Chat site
echo "🌐 Configuring Pi-Chat site..."
sudo bash -c 'cat > /etc/nginx/sites-available/pi-chat << EOL
server {
    listen 80;
    server_name _;

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # NJS example endpoint
    location /hello {
        js_content example.hello;
    }

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL'

# Enable the site
sudo ln -sf /etc/nginx/sites-available/pi-chat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# Create systemd service for the application
echo "⚙️  Creating systemd service..."
sudo bash -c 'cat > /etc/systemd/system/pi-chat.service << EOL
[Unit]
Description=Pi-Chat Application
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/pi-chat
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL'

# Create startup script for Ngrok
echo "📝 Creating startup scripts..."
cat > ~/start-ngrok.sh << 'EOL'
#!/bin/bash

# Start Ngrok tunnel
ngrok http --log=stdout 80 > /home/pi/ngrok.log &

# Get public URL
sleep 5
public_url=$(grep -o 'https://[^ ]*.ngrok.io' /home/pi/ngrok.log | tail -n1)
echo "🌍 Your Pi-Chat is available at: $public_url"
EOL

chmod +x ~/start-ngrok.sh

# Create a setup script for first-time run
cat > ~/setup-pi-chat.sh << 'EOL'
#!/bin/bash

# Clone the repository
if [ ! -d "pi-chat" ]; then
    git clone https://github.com/tejbruhath/pi-chat.git
    cd pi-chat
    
    # Install dependencies with exact versions
    log "📦 Installing project dependencies..."
    npm ci || error_exit "Failed to install project dependencies"
    
    # Build the project
    log "🔨 Building the project..."
    npm run build || error_exit "Build failed"
else
    cd pi-chat
    git pull
    npm install
    npm run build
fi

# Start the service
sudo systemctl daemon-reload
sudo systemctl enable pi-chat
sudo systemctl start pi-chat

# Start Ngrok (this will show the public URL)
~/start-ngrok.sh
EOL

chmod +x ~/setup-pi-chat.sh

echo "✅ Setup complete!"
echo "To get started:"
echo "1. Edit ~/start-ngrok.sh and add your Ngrok auth token"
echo "2. Run: ~/setup-pi-chat.sh"
echo "3. Your Pi-Chat will be available at the Ngrok URL shown"

# Make the script executable
chmod +x "$0"
echo "\n📋 Copy this file to your Raspberry Pi and run it with: ./$(basename "$0")"
echo "   or directly run: bash $(basename "$0")"
