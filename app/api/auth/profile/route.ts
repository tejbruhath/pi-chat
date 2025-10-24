import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, userSessions } from "@/lib/schema";
import { eq, and, gt } from "drizzle-orm";

export async function PUT(request: Request) {
  try {
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

    const { name, avatar } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { message: "Name is required" },
        { status: 400 }
      );
    }

    // Update user profile
    await db
      .update(users)
      .set({
        name: name.trim(),
        avatar: avatar || null,
      })
      .where(eq(users.id, session.userId));

    // Get updated user data
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
