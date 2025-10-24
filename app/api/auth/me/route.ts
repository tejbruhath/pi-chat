import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { User, UserSession } from '@/lib/schema';

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

    // Find the session
    const session = await UserSession.findOne({
      token: sessionToken,
      expiresAt: { $gt: Math.floor(Date.now() / 1000) }
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

    // Get user data
    const user = await User.findById(session.userId).select('-password');

    if (!user) {
      const response = NextResponse.json(
        { message: 'User not found' },
        { status: 401 }
      );
      response.cookies.delete('session_token');
      return response;
    }

    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: Math.floor(new Date(user.createdAt).getTime() / 1000),
    };

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
