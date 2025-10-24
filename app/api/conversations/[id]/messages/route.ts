import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  users,
  userSessions,
  conversations,
  participants,
  messages,
} from "@/lib/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Get messages for a conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify session
    const session = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.token, sessionToken),
        gt(userSessions.expiresAt, Math.floor(Date.now() / 1000))
      ),
    });

    if (!session) {
      return NextResponse.json({ message: "Session expired" }, { status: 401 });
    }

    // Verify user is a participant
    const participation = await db.query.participants.findFirst({
      where: and(
        eq(participants.conversationId, conversationId),
        eq(participants.userId, session.userId)
      ),
    });

    if (!participation) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    // Get messages
    const messageList = await db
      .select({
        id: messages.id,
        content: messages.content,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
        senderId: messages.senderId,
        senderName: users.name,
        senderAvatar: users.avatar,
        sentAt: messages.sentAt,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.sentAt)
      .limit(100);

    return NextResponse.json({ messages: messageList });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Send a message to a conversation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify session
    const session = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.token, sessionToken),
        gt(userSessions.expiresAt, Math.floor(Date.now() / 1000))
      ),
    });

    if (!session) {
      return NextResponse.json({ message: "Session expired" }, { status: 401 });
    }

    const { content, mediaUrl, mediaType } = await request.json();

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { message: "Message content or media is required" },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const participation = await db.query.participants.findFirst({
      where: and(
        eq(participants.conversationId, conversationId),
        eq(participants.userId, session.userId)
      ),
    });

    if (!participation) {
      console.error("User not authorized to send message:", {
        userId: session.userId,
        conversationId,
        sessionToken: sessionToken.substring(0, 8) + "...",
      });
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    // Create message
    const messageId = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(messages).values({
      id: messageId,
      content: content || "",
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      senderId: session.userId,
      conversationId,
      sentAt: now,
    });

    // Get the created message with sender info
    const newMessage = await db
      .select({
        id: messages.id,
        content: messages.content,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
        senderId: messages.senderId,
        senderName: users.name,
        senderAvatar: users.avatar,
        sentAt: messages.sentAt,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, messageId))
      .limit(1);

    return NextResponse.json({ message: newMessage[0] });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
