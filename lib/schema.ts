import mongoose, { Schema, Document, Model } from 'mongoose';

// TypeScript interfaces
export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  createdAt: Date;
}

export interface IConversation extends Document {
  _id: string;
  name?: string;
  isGroup: boolean;
  createdAt: Date;
}

export interface IParticipant extends Document {
  _id: string;
  userId: string;
  conversationId: string;
  joinedAt: Date;
}

export interface IMessage extends Document {
  _id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  senderId: string;
  conversationId: string;
  sentAt: Date;
}

export interface IUserSession extends Document {
  _id: string;
  userId: string;
  expiresAt: number;
  token: string;
}

// Mongoose Schemas
const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  avatar: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const ConversationSchema = new Schema<IConversation>({
  name: { type: String, default: null },
  isGroup: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const ParticipantSchema = new Schema<IParticipant>({
  userId: { type: String, required: true, index: true },
  conversationId: { type: String, required: true, index: true },
  joinedAt: { type: Date, default: Date.now },
});

// Add compound index for participants
ParticipantSchema.index({ userId: 1, conversationId: 1 });

const MessageSchema = new Schema<IMessage>({
  content: { type: String, required: true },
  mediaUrl: { type: String, default: null },
  mediaType: { type: String, default: null },
  senderId: { type: String, required: true, index: true },
  conversationId: { type: String, required: true, index: true },
  sentAt: { type: Date, default: Date.now },
});

const UserSessionSchema = new Schema<IUserSession>({
  userId: { type: String, required: true, index: true },
  expiresAt: { type: Number, required: true },
  token: { type: String, required: true, unique: true, index: true },
});

// Export models (with singleton pattern to prevent recompilation)
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Conversation: Model<IConversation> = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
export const Participant: Model<IParticipant> = mongoose.models.Participant || mongoose.model<IParticipant>('Participant', ParticipantSchema);
export const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
export const UserSession: Model<IUserSession> = mongoose.models.UserSession || mongoose.model<IUserSession>('UserSession', UserSessionSchema);
