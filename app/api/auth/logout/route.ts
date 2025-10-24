import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { UserSession } from '@/lib/schema';

export async function POST() {
  try {
    await connectDB();
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');

    if (sessionToken) {
      // Delete the session from the database
      await UserSession.deleteOne({ token: sessionToken.value });
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
