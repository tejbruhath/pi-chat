# MongoDB Atlas Setup Guide

## Database Configuration

This application uses **MongoDB Atlas** as the database with **Mongoose ODM** for data modeling.

### Connection Details

- **Database URI**: `mongodb+srv://tejdupes_db_user:KvTixU3C7KAvyc92@pi-chat.qeg5ums.mongodb.net/?appName=pi-chat`
- **Database Name**: `pi-chat`
- **Connection File**: `lib/db.ts`

### Collections (Mongoose Models)

All models are defined in `lib/schema.ts`:

1. **users** - User accounts
   - Fields: name, email, password (hashed), avatar, createdAt
   - Indexes: email (unique)

2. **conversations** - Chat conversations
   - Fields: name, isGroup, createdAt
   - No custom indexes

3. **participants** - User-conversation relationships
   - Fields: userId, conversationId, joinedAt
   - Indexes: userId, conversationId, compound (userId + conversationId)

4. **messages** - Chat messages
   - Fields: content, mediaUrl, mediaType, senderId, conversationId, sentAt
   - Indexes: senderId, conversationId

5. **user_sessions** - Authentication sessions
   - Fields: userId, expiresAt, token
   - Indexes: userId, token (unique)

### Indexes

Indexes are automatically created by Mongoose when the application starts. The schema definitions include:

- **Email uniqueness** on users collection
- **Token uniqueness** on user_sessions collection
- **Compound index** on participants (userId + conversationId)
- **Standard indexes** on foreign key references

### Database Operations

#### Connection Management

The database connection is managed in `lib/db.ts`:

```typescript
import { connectDB } from '@/lib/db';

// Call this at the start of each API route
await connectDB();
```

The connection uses:
- Connection pooling (max 10 connections)
- Auto-reconnection
- 5-second server selection timeout
- 45-second socket timeout

#### Query Examples

**Find users by regex:**
```typescript
User.find({
  name: { $regex: query, $options: 'i' }
}).limit(10);
```

**Session validation:**
```typescript
UserSession.findOne({
  token: sessionToken,
  expiresAt: { $gt: Math.floor(Date.now() / 1000) }
});
```

**Participant lookup:**
```typescript
Participant.find({ userId: session.userId });
```

### Migration from SQLite

This application was previously using SQLite with Drizzle ORM. The migration involved:

1. ✅ Removed dependencies: `better-sqlite3`, `drizzle-orm`, `drizzle-kit`
2. ✅ Added dependency: `mongoose@8.8.4`
3. ✅ Converted Drizzle tables to Mongoose models
4. ✅ Updated all API routes to use Mongoose queries
5. ✅ Replaced SQL queries with MongoDB query operators

### Environment Variables (Optional)

While the connection string is currently hardcoded in `lib/db.ts`, you can optionally move it to environment variables:

```env
MONGODB_URI=mongodb+srv://tejdupes_db_user:KvTixU3C7KAvyc92@pi-chat.qeg5ums.mongodb.net/?appName=pi-chat
MONGODB_DB_NAME=pi-chat
```

Then update `lib/db.ts`:
```typescript
const MONGODB_URI = process.env.MONGODB_URI || 'fallback-uri';
```

### Monitoring

You can monitor your database usage in the MongoDB Atlas dashboard:
- https://cloud.mongodb.com/

### Backup and Restore

MongoDB Atlas provides automatic backups. To manually backup:

```bash
# Export all collections
mongodump --uri="mongodb+srv://tejdupes_db_user:KvTixU3C7KAvyc92@pi-chat.qeg5ums.mongodb.net/?appName=pi-chat" --db=pi-chat --out=./backup

# Restore from backup
mongorestore --uri="mongodb+srv://tejdupes_db_user:KvTixU3C7KAvyc92@pi-chat.qeg5ums.mongodb.net/?appName=pi-chat" --db=pi-chat ./backup/pi-chat
```

### Troubleshooting

**Connection Issues:**
- Verify network access in MongoDB Atlas (IP whitelist)
- Check if the cluster is active
- Ensure credentials are correct

**Query Performance:**
- Use `.lean()` for read-only queries to improve performance
- Ensure proper indexes are created
- Monitor slow queries in MongoDB Atlas dashboard

**Data Migration:**
If you need to migrate existing SQLite data to MongoDB, create a migration script that:
1. Reads data from SQLite
2. Transforms it to match Mongoose schemas
3. Inserts into MongoDB using bulk operations
