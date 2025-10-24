import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { User, UserSession, Conversation, Participant, Message } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

// Get all conversations for the current user
export async function GET() {
  try {
    await connectDB();
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify session
    const session = await UserSession.findOne({
      token: sessionToken,
      expiresAt: { $gt: Math.floor(Date.now() / 1000) }
    });

    if (!session) {
      return NextResponse.json(
        { message: 'Session expired' },
        { status: 401 }
      );
    }

    // Get all conversations where user is a participant
    const userParticipations = await Participant.find({ userId: session.userId }).lean();
    const conversationIds = userParticipations.map(p => p.conversationId);

    if (conversationIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Get conversation details with last message
    const conversationList = await Promise.all(
      conversationIds.map(async (convId) => {
        const conversation = await Conversation.findById(convId).lean();

        if (!conversation) return null;

        // Get all participants with user info
        const convParticipants = await Participant.find({ conversationId: convId }).lean();
        const participantDetails = await Promise.all(
          convParticipants.map(async (p) => {
            const user = await User.findById(p.userId).select('name avatar').lean();
            return {
              id: p._id.toString(),
              userId: p.userId,
              userName: user?.name || 'Unknown',
              userAvatar: user?.avatar || null,
            };
          })
        );

        // Get last message
        const lastMessageDoc = await Message.findOne({ conversationId: convId })
          .sort({ sentAt: -1 })
          .limit(1)
          .lean();

        let lastMessage = null;
        if (lastMessageDoc) {
          const sender = await User.findById(lastMessageDoc.senderId).select('name').lean();
          lastMessage = {
            id: lastMessageDoc._id.toString(),
            content: lastMessageDoc.content,
            sentAt: Math.floor(new Date(lastMessageDoc.sentAt).getTime() / 1000),
            senderName: sender?.name || 'Unknown',
            senderId: lastMessageDoc.senderId,
          };
        }

        // For direct messages, use other user's name as conversation name
        let displayName = conversation.name;
        if (!conversation.isGroup) {
          const otherParticipant = participantDetails.find(
            p => p.userId !== session.userId
          );
          displayName = otherParticipant?.userName || 'Unknown User';
        }

        return {
          id: conversation._id.toString(),
          name: displayName,
          isGroup: conversation.isGroup,
          participants: participantDetails,
          lastMessage,
          createdAt: Math.floor(new Date(conversation.createdAt).getTime() / 1000),
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
    await connectDB();
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify session
    const session = await UserSession.findOne({
      token: sessionToken,
      expiresAt: { $gt: Math.floor(Date.now() / 1000) }
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
      const currentUserParticipations = await Participant.find({ userId: session.userId }).lean();
      const otherUserParticipations = await Participant.find({ userId: otherUserId }).lean();

      const currentConvIds = new Set(currentUserParticipations.map(p => p.conversationId));
      const sharedConvIds = otherUserParticipations
        .filter(p => currentConvIds.has(p.conversationId))
        .map(p => p.conversationId);

      for (const convId of sharedConvIds) {
        const conv = await Conversation.findOne({
          _id: convId,
          isGroup: false
        }).lean();
        
        if (conv) {
          return NextResponse.json({
            conversation: { id: conv._id.toString() },
            existed: true,
          });
        }
      }
    }

    // Create new conversation
    const newConversation = await Conversation.create({
      name: isGroup ? name : null,
      isGroup: isGroup || false,
    });

    // Add current user as participant
    await Participant.create({
      userId: session.userId,
      conversationId: newConversation._id.toString(),
    });

    // Add other participants
    for (const userId of participantIds) {
      await Participant.create({
        userId,
        conversationId: newConversation._id.toString(),
      });
    }

    return NextResponse.json({
      conversation: { id: newConversation._id.toString() },
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
