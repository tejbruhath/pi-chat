import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { User, UserSession } from '@/lib/schema';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search for users by name (excluding current user)
    const searchResults = await User.find({
      _id: { $ne: session.userId },
      name: { $regex: query, $options: 'i' }
    })
    .select('_id name email avatar')
    .limit(10)
    .lean();

    // Transform results to match expected format
    const users = searchResults.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
