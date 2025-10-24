/**
 * MongoDB Migration Notes
 * 
 * This application now uses MongoDB Atlas with Mongoose ODM.
 * Database schema is defined in lib/schema.ts using Mongoose models.
 * 
 * Collections:
 * - users: User accounts with authentication
 * - conversations: Chat conversations (direct and group)
 * - participants: User-conversation relationships
 * - messages: Chat messages with media support
 * - user_sessions: Active user sessions
 * 
 * Connection: mongodb+srv://tejdupes_db_user:KvTixU3C7KAvyc92@pi-chat.qeg5ums.mongodb.net/?appName=pi-chat
 * Database: pi-chat
 * 
 * Indexes are automatically created by Mongoose based on schema definitions in lib/schema.ts
 * No manual migrations are required for MongoDB - schemas are created on first use.
 */

export {};
