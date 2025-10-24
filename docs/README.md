# Pi-Chat Documentation

Complete documentation for the Pi-Chat real-time chat application.

---

## 📚 Table of Contents

### Getting Started
1. [**Quickstart Guide**](QUICKSTART.md) - Get up and running in 3 steps
2. [**Features Overview**](FEATURES.md) - Complete feature list and capabilities
3. [**MongoDB Setup**](MONGODB_SETUP.md) - Database configuration (MongoDB Atlas)

### Deployment
4. [**Deployment Guide**](DEPLOYMENT_GUIDE.md) - General deployment instructions
5. [**Raspberry Pi Deployment**](RASPBERRY_PI_DEPLOYMENT.md) - Pi-specific setup
6. [**Nginx Guide**](NGINX_RASPBERRY_PI_GUIDE.md) - Nginx configuration and commands

### Troubleshooting
7. [**Ngrok Troubleshooting**](NGROK_TROUBLESHOOTING.md) - Fix Ngrok tunnel issues
8. [**Auth Fix (401 Errors)**](AUTH_FIX_401_ERRORS.md) - Fix authentication issues

### Features & UI
9. [**Mobile Improvements**](MOBILE_IMPROVEMENTS.md) - Mobile UI enhancements

### Historical (Archive)
10. [**Migration Summary**](archive/MIGRATION_SUMMARY.md) - SQLite → MongoDB migration
11. [**Migration Complete**](archive/MIGRATION_COMPLETE.md) - Migration verification
12. [**Date Fix Summary**](archive/DATE_FIX_SUMMARY.md) - Date format fixes

---

## 🚀 Quick Links

### First Time Setup
```bash
# On your server (Ubuntu/Raspberry Pi/EC2)
git clone https://github.com/tejbruhath/pi-chat.git
cd pi-chat
sudo ./deploy-pi.sh
```

See: [Deployment Guide](DEPLOYMENT_GUIDE.md)

### Update Existing Installation
```bash
# Quick update
~/update-pi-chat.sh

# Or manual
cd ~/pi-chat
git pull
npm install
npm run build
sudo systemctl restart pi-chat
```

See: [Quickstart Guide](QUICKSTART.md#update-app)

### Common Issues
- **401 Errors?** → [Auth Fix Guide](AUTH_FIX_401_ERRORS.md)
- **Ngrok not working?** → [Ngrok Troubleshooting](NGROK_TROUBLESHOOTING.md)
- **Nginx errors?** → [Nginx Guide](NGINX_RASPBERRY_PI_GUIDE.md#troubleshooting)

---

## 📖 Documentation by Topic

### Architecture
- [Features Overview](FEATURES.md#architecture) - System architecture
- [MongoDB Setup](MONGODB_SETUP.md#schema) - Database schema
- [Features Overview](FEATURES.md#database-schema) - Data models

### API Reference
- [Features Overview](FEATURES.md#api-routes) - API endpoints
- [Features Overview](FEATURES.md#websocket-events) - WebSocket events

### Security
- [Features Overview](FEATURES.md#security-features) - Security measures
- [Auth Fix Guide](AUTH_FIX_401_ERRORS.md#security-considerations) - Cookie security

### Performance
- [Features Overview](FEATURES.md#performance-optimizations) - Performance tips
- [Nginx Guide](NGINX_RASPBERRY_PI_GUIDE.md#performance-tuning-for-raspberry-pi) - Nginx optimization

### Mobile
- [Mobile Improvements](MOBILE_IMPROVEMENTS.md) - Mobile responsive design
- [Mobile Improvements](MOBILE_IMPROVEMENTS.md#testing-checklist) - Testing guide

---

## 🔧 Configuration Files

```
pi-chat/
├── server.js                 # Custom Node.js + Socket.IO server
├── next.config.ts            # Next.js configuration
├── lib/
│   ├── db.ts                # MongoDB connection
│   └── schema.ts            # Mongoose models
├── deploy-pi.sh             # Automated deployment script
└── docs/
    └── (you are here)
```

---

## 🎯 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Node.js, Express, Socket.IO
- **Database**: MongoDB Atlas (cloud)
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Deployment**: PM2, Nginx, Ngrok, Systemd
- **Platform**: Ubuntu/Debian/Raspberry Pi OS

See: [Features Overview](FEATURES.md) for complete stack details

---

## 📱 Features

- ✅ Real-time messaging (WebSocket)
- ✅ User authentication (bcrypt + sessions)
- ✅ Direct messages (1-on-1)
- ✅ Group chats
- ✅ File & media upload (10MB max)
- ✅ User search
- ✅ Message history
- ✅ Mobile responsive UI

See: [Features Overview](FEATURES.md) for complete list

---

## 🐛 Troubleshooting

### Authentication Issues (401 Errors)
**Problem**: Can't login, getting 401 errors  
**Solution**: [Auth Fix Guide](AUTH_FIX_401_ERRORS.md)

### Ngrok Tunnel Issues
**Problem**: `err_ngrok_4018` or tunnel won't start  
**Solution**: [Ngrok Troubleshooting](NGROK_TROUBLESHOOTING.md)

### Nginx Not Working
**Problem**: 502 Bad Gateway, can't access app  
**Solution**: [Nginx Guide](NGINX_RASPBERRY_PI_GUIDE.md#troubleshooting)

### Database Connection Issues
**Problem**: MongoDB connection errors  
**Solution**: [MongoDB Setup](MONGODB_SETUP.md#troubleshooting)

---

## 🆘 Getting Help

1. **Check the relevant guide** above
2. **View logs**:
   ```bash
   journalctl -u pi-chat -f           # App logs
   sudo tail -f /var/log/nginx/error.log  # Nginx logs
   tail -f ~/ngrok.log                # Ngrok logs
   ```
3. **Check GitHub Issues**: https://github.com/tejbruhath/pi-chat/issues
4. **Review main README**: [Project README](../README.md)

---

## 📝 Contributing

Found an issue with the docs? Want to add more examples?

1. Fork the repository
2. Make your changes
3. Submit a pull request

---

## 🔄 Documentation Updates

Last updated: October 24, 2025

### Recent Changes
- ✅ Reorganized documentation into `/docs` folder
- ✅ Removed redundant deployment summaries
- ✅ Added comprehensive index (this file)
- ✅ Archived historical migration docs
- ✅ Fixed 401 authentication errors
- ✅ Added Nginx and Ngrok troubleshooting guides
- ✅ Improved mobile UI documentation

---

**Need more help?** Start with the [Quickstart Guide](QUICKSTART.md) or check the [Main README](../README.md)
