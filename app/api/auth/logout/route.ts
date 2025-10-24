import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { userSessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');

    if (sessionToken) {
      // Delete the session from the database
      await db
        .delete(userSessions)
        .where(eq(userSessions.token, sessionToken.value));
    }

    // Clear the session cookie
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.delete('session_token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
