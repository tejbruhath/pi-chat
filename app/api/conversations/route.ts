import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, userSessions, conversations, participants, messages } from '@/lib/schema';
import { eq, and, gt, or, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Get all conversations for the current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: 'Not authenticated' },
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
      return NextResponse.json(
        { message: 'Session expired' },
        { status: 401 }
      );
    }

    // Get all conversations where user is a participant
    const userParticipations = await db
      .select()
      .from(participants)
      .where(eq(participants.userId, session.userId));

    const conversationIds = userParticipations.map(p => p.conversationId);

    if (conversationIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Get conversation details with last message
    const conversationList = await Promise.all(
      conversationIds.map(async (convId) => {
        const conversation = await db.query.conversations.findFirst({
          where: eq(conversations.id, convId),
        });

        if (!conversation) return null;

        // Get all participants
        const convParticipants = await db
          .select({
            id: participants.id,
            userId: participants.userId,
            userName: users.name,
            userAvatar: users.avatar,
          })
          .from(participants)
          .leftJoin(users, eq(participants.userId, users.id))
          .where(eq(participants.conversationId, convId));

        // Get last message
        const lastMessage = await db
          .select({
            id: messages.id,
            content: messages.content,
            sentAt: messages.sentAt,
            senderName: users.name,
            senderId: messages.senderId,
          })
          .from(messages)
          .leftJoin(users, eq(messages.senderId, users.id))
          .where(eq(messages.conversationId, convId))
          .orderBy(desc(messages.sentAt))
          .limit(1);

        // For direct messages, use other user's name as conversation name
        let displayName = conversation.name;
        if (!conversation.isGroup) {
          const otherParticipant = convParticipants.find(
            p => p.userId !== session.userId
          );
          displayName = otherParticipant?.userName || 'Unknown User';
        }

        return {
          id: conversation.id,
          name: displayName,
          isGroup: conversation.isGroup,
          participants: convParticipants,
          lastMessage: lastMessage[0] || null,
          createdAt: conversation.createdAt,
        };
      })
    );

    const validConversations = conversationList.filter(c => c !== null);

    return NextResponse.json({ conversations: validConversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new conversation (direct or group)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: 'Not authenticated' },
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
      return NextResponse.json(
        { message: 'Session expired' },
        { status: 401 }
      );
    }

    const { participantIds, isGroup, name } = await request.json();

    if (!participantIds || !Array.isArray(participantIds)) {
      return NextResponse.json(
        { message: 'Participant IDs are required' },
        { status: 400 }
      );
    }

    // For direct messages, check if conversation already exists
    if (!isGroup && participantIds.length === 1) {
      const otherUserId = participantIds[0];
      
      // Find existing direct conversation between these two users
      const existingParticipations = await db
        .select()
        .from(participants)
        .where(
          or(
            eq(participants.userId, session.userId),
            eq(participants.userId, otherUserId)
          )
        );

      const conversationCounts = new Map<string, number>();
      existingParticipations.forEach(p => {
        const count = conversationCounts.get(p.conversationId) || 0;
        conversationCounts.set(p.conversationId, count + 1);
      });

      for (const [convId, count] of conversationCounts.entries()) {
        if (count === 2) {
          const conv = await db.query.conversations.findFirst({
            where: and(
              eq(conversations.id, convId),
              eq(conversations.isGroup, false)
            ),
          });
          
          if (conv) {
            return NextResponse.json({
              conversation: { id: conv.id },
              existed: true,
            });
          }
        }
      }
    }

    // Create new conversation
    const conversationId = uuidv4();
    await db.insert(conversations).values({
      id: conversationId,
      name: isGroup ? name : null,
      isGroup: isGroup || false,
    });

    // Add current user as participant
    await db.insert(participants).values({
      id: uuidv4(),
      userId: session.userId,
      conversationId,
    });

    // Add other participants
    for (const userId of participantIds) {
      await db.insert(participants).values({
        id: uuidv4(),
        userId,
        conversationId,
      });
    }

    return NextResponse.json({
      conversation: { id: conversationId },
      existed: false,
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
