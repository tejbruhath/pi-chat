import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { UserSession, Conversation, Participant } from "@/lib/schema";

// Add participants to a group conversation
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

    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 }
      );
    }

    // Verify conversation is a group
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!conversation.isGroup) {
      return NextResponse.json(
        { message: "Can only add participants to group conversations" },
        { status: 400 }
      );
    }

    // Verify user is a participant (only group members can add others)
    const participation = await Participant.findOne({
      conversationId,
      userId: session.userId
    });

    if (!participation) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    // Add new participants
    const addedParticipants = [];
    for (const userId of userIds) {
      // Check if already a participant
      const existing = await Participant.findOne({
        conversationId,
        userId
      });

      if (!existing) {
        await Participant.create({
          userId,
          conversationId,
        });
        addedParticipants.push(userId);
      }
    }

    return NextResponse.json({
      message: "Participants added successfully",
      addedCount: addedParticipants.length,
    });
  } catch (error) {
    console.error("Add participants error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Remove a participant from a group conversation
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const userIdToRemove = searchParams.get("userId");

    if (!userIdToRemove) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify conversation is a group
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!conversation.isGroup) {
      return NextResponse.json(
        { message: "Can only remove participants from group conversations" },
        { status: 400 }
      );
    }

    // Remove participant
    await Participant.deleteOne({
      conversationId,
      userId: userIdToRemove
    });

    return NextResponse.json({
      message: "Participant removed successfully",
    });
  } catch (error) {
    console.error("Remove participant error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
