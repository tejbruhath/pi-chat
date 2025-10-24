# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 3. Create Your First Account
- Go to `http://localhost:3000/register`
- Fill in your name, email, and password
- Click "Create Account"

You're in! 🎉

---

## 📱 Quick Feature Tour

### Send Your First Message

1. **Find a friend**: Click "New Chat" and search for another user
2. **Start chatting**: Click on their name to open the conversation
3. **Send a message**: Type and press Enter

### Create a Group

1. **Click "New Group"** in the sidebar
2. **Name your group**: Give it a fun name
3. **Add members**: Search and select users
4. **Click "Create Group"**

### Share Media

1. **Open a conversation**
2. **Click the paperclip icon** 📎
3. **Select your file** (images, videos, PDFs)
4. **File uploads automatically!**

---

## 🎯 Key Features at a Glance

| Feature | How to Use |
|---------|-----------|
| **Real-time Chat** | Messages appear instantly with WebSocket |
| **User Search** | Type names in the search box |
| **Group Chats** | Up to unlimited members per group |
| **File Sharing** | Images, videos, PDFs (max 10MB) |
| **Message History** | All messages are saved automatically |

---

## 🔧 Troubleshooting

### Port Already in Use?
```bash
# Kill the process on port 3000 (Windows)
npx kill-port 3000

# Then restart
npm run dev
```

### Database Connection Issues?
The app uses **MongoDB Atlas** (cloud database):
- No local setup required
- Connection string is pre-configured in `lib/db.ts`
- Check internet connection if you see database errors
- MongoDB Atlas cluster: `pi-chat.qeg5ums.mongodb.net`

### WebSocket Not Connecting?
- Check console for errors
- Make sure server is running on port 3000
- Refresh the page
- Verify `server.js` is running (included in `npm run dev`)

---

## 📚 Need More Help?

- Check the full [README.md](./README.md) for detailed documentation
- Review API endpoints in the README
- Look at the code in `/app/chat/chat-interface.tsx`

---

## 🎨 Customize Your Experience

### Change Colors
Edit `app/globals.css` to modify the theme

### Add Features
All API routes are in `/app/api/`
All UI components are in `/components/`

---

**Happy Chatting! 💬**
