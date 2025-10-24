# Modern Chat Application

A feature-rich chat application built with Next.js 16, TypeScript, Tailwind CSS, and MongoDB Atlas.

## Features

✅ **User Authentication**: Secure login and registration with bcrypt password hashing
✅ **Real-time Messaging**: WebSocket-powered instant messaging with Socket.IO
✅ **User Search**: Search for other users by name to start conversations
✅ **Direct Messages**: One-on-one private conversations
✅ **Group Chats**: Create and manage group conversations with multiple members
✅ **File & Media Upload**: Share images, videos, and documents (up to 10MB)
✅ **Message History**: View conversation history with timestamps
✅ **Online Status**: See when you're connected to the chat server
✅ **Modern UI**: Beautiful, responsive design with shadcn/ui and Tailwind CSS
✅ **Persistent Storage**: MongoDB Atlas cloud database for scalable data storage
✅ **Group Management**: Add or remove members from group chats

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB Atlas with Mongoose ODM
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Authentication**: Custom JWT-based sessions with HTTP-only cookies
- **Real-time**: Socket.IO for WebSocket connections

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

This will start both the Next.js app and WebSocket server on port 3000.

3. Open [http://localhost:3000](http://localhost:3000) with your browser.

**Note**: The application connects to MongoDB Atlas automatically. The connection string is configured in `lib/db.ts`. No local database setup is required.

### First Time Setup

1. Navigate to the registration page at `/register`
2. Create a new account with your name, email, and password
3. You'll be automatically logged in and redirected to the chat interface
4. Start messaging!

## Project Structure

```
windsurf-chat/
├── app/
│   ├── api/
│   │   └── auth/          # Authentication API routes
│   ├── chat/              # Chat interface page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Home page (redirects to chat/login)
├── components/
│   ├── auth/              # Authentication context and components
│   └── ui/                # Reusable UI components (shadcn/ui)
├── lib/
│   ├── db.ts              # MongoDB Atlas connection with Mongoose
│   ├── schema.ts          # Mongoose models and schemas
│   ├── useSocket.ts       # WebSocket hook for real-time communication
│   └── utils.ts           # Utility functions
└── migrations/            # Database migration notes
```

## Database Schema (MongoDB Collections)

- **users**: User accounts with authentication (name, email, password, avatar)
- **conversations**: Chat conversations (name, isGroup, createdAt)
- **participants**: User-conversation relationships (userId, conversationId, joinedAt)
- **messages**: Chat messages (content, mediaUrl, mediaType, senderId, conversationId, sentAt)
- **user_sessions**: Active user sessions (userId, token, expiresAt)

See [MongoDB Setup Guide](docs/MONGODB_SETUP.md) for detailed database configuration and query examples.

## API Routes

- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate and create session
- `POST /api/auth/logout` - End user session
- `GET /api/auth/me` - Get current user information

## How to Use

### Starting a Direct Message

1. Click the "New Chat" button in the sidebar
2. Search for a user by typing their name
3. Click on the user to start a conversation
4. Start messaging!

### Creating a Group Chat

1. Click the "New Group" button in the sidebar
2. Enter a group name
3. Search and select multiple users to add
4. Click "Create Group"
5. Your group chat is ready!

### Sending Messages

- **Text messages**: Type in the input box and press Enter or click Send
- **Files/Media**: Click the paperclip icon to upload images, videos, or documents
- **Supported formats**: Images (JPEG, PNG, GIF, WebP), Videos (MP4, WebM), PDF, Text files

### Managing Group Chats

- Group members are shown in the chat header
- Add new members through the API endpoint `/api/conversations/{id}/participants`
- Remove members using the DELETE method on the same endpoint

## Project Architecture

### Backend APIs

- **Authentication**:
  - `POST /api/auth/register` - Register new user
  - `POST /api/auth/login` - Login user
  - `POST /api/auth/logout` - Logout user
  - `GET /api/auth/me` - Get current user info

- **User Management**:
  - `GET /api/users/search?q={query}` - Search users by name

- **Conversations**:
  - `GET /api/conversations` - Get all user's conversations
  - `POST /api/conversations` - Create new conversation (direct or group)
  - `GET /api/conversations/{id}/messages` - Get messages
  - `POST /api/conversations/{id}/messages` - Send message
  - `POST /api/conversations/{id}/participants` - Add group members
  - `DELETE /api/conversations/{id}/participants?userId={id}` - Remove member

- **File Upload**:
  - `POST /api/upload` - Upload file/media (max 10MB)

### WebSocket Events

**Client → Server:**
- `authenticate` - Authenticate user with socket
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `send_message` - Send a message
- `typing` - User is typing indicator
- `stop_typing` - User stopped typing

**Server → Client:**
- `connect` - Connection established
- `disconnect` - Connection lost
- `new_message` - New message received
- `user_typing` - Another user is typing
- `user_stop_typing` - User stopped typing

## 📚 Documentation

Comprehensive documentation is available in the [`/docs`](docs/) folder:

### Quick Start
- [**Quickstart Guide**](docs/QUICKSTART.md) - Get up and running in 3 steps
- [**Features Overview**](docs/FEATURES.md) - Complete feature list
- [**MongoDB Setup**](docs/MONGODB_SETUP.md) - Database configuration

### Deployment
- [**Deployment Guide**](docs/DEPLOYMENT_GUIDE.md) - General deployment instructions
- [**Raspberry Pi Deployment**](docs/RASPBERRY_PI_DEPLOYMENT.md) - Deploy on Raspberry Pi/EC2
- [**Nginx Guide**](docs/NGINX_RASPBERRY_PI_GUIDE.md) - Nginx setup and commands

### Troubleshooting
- [**Auth Fix (401 Errors)**](docs/AUTH_FIX_401_ERRORS.md) - Fix authentication issues
- [**Ngrok Troubleshooting**](docs/NGROK_TROUBLESHOOTING.md) - Tunnel issues and solutions

### Additional
- [**Mobile UI**](docs/MOBILE_IMPROVEMENTS.md) - Mobile responsive features
- [**Documentation Index**](docs/README.md) - Complete documentation index

## Future Enhancements

- Message read receipts
- Typing indicators in UI
- Emoji picker and reactions
- Voice/video calling
- Message editing and deletion
- Search within conversations
- Push notifications
- Dark mode toggle
- Message threading
- User profiles and avatars
- Status messages
- End-to-end encryption

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
# pi-chat
