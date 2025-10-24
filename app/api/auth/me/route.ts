import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, userSessions } from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';

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

    // Find the session
    const session = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.token, sessionToken),
        gt(userSessions.expiresAt, Math.floor(Date.now() / 1000))
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      // Clear invalid session cookie
      const response = NextResponse.json(
        { message: 'Session expired' },
        { status: 401 }
      );
      response.cookies.delete('session_token');
      return response;
    }

    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
