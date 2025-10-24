import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, userSessions } from '@/lib/schema';
import { eq, and, gt, like, ne } from 'drizzle-orm';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search for users by name or email (excluding current user)
    const searchResults = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      })
      .from(users)
      .where(
        and(
          ne(users.id, session.userId),
          like(users.name, `%${query}%`)
        )
      )
      .limit(10);

    return NextResponse.json({ users: searchResults });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
