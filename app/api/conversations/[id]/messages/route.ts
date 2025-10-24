import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User, UserSession, Participant, Message } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

// Get messages for a conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
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
    const session = await UserSession.findOne({
      token: sessionToken,
      expiresAt: { $gt: Math.floor(Date.now() / 1000) }
    });

    if (!session) {
      return NextResponse.json({ message: "Session expired" }, { status: 401 });
    }

    // Verify user is a participant
    const participation = await Participant.findOne({
      conversationId,
      userId: session.userId
    });

    if (!participation) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    // Get messages with sender info
    const messagesDocs = await Message.find({ conversationId })
      .sort({ sentAt: 1 })
      .limit(100)
      .lean();

    const messageList = await Promise.all(
      messagesDocs.map(async (msg) => {
        const sender = await User.findById(msg.senderId).select('name avatar').lean();
        return {
          id: msg._id.toString(),
          content: msg.content,
          mediaUrl: msg.mediaUrl,
          mediaType: msg.mediaType,
          senderId: msg.senderId,
          senderName: sender?.name || 'Unknown',
          senderAvatar: sender?.avatar || null,
          sentAt: Math.floor(new Date(msg.sentAt).getTime() / 1000),
        };
      })
    );

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
    await connectDB();
    
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
    const session = await UserSession.findOne({
      token: sessionToken,
      expiresAt: { $gt: Math.floor(Date.now() / 1000) }
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
    const participation = await Participant.findOne({
      conversationId,
      userId: session.userId
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
    const newMessage = await Message.create({
      content: content || "",
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      senderId: session.userId,
      conversationId,
      sentAt: new Date(),
    });

    // Get sender info
    const sender = await User.findById(session.userId).select('name avatar').lean();

    const messageResponse = {
      id: newMessage._id.toString(),
      content: newMessage.content,
      mediaUrl: newMessage.mediaUrl,
      mediaType: newMessage.mediaType,
      senderId: newMessage.senderId,
      senderName: sender?.name || 'Unknown',
      senderAvatar: sender?.avatar || null,
      sentAt: Math.floor(new Date(newMessage.sentAt).getTime() / 1000),
    };

    return NextResponse.json({ message: messageResponse });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
