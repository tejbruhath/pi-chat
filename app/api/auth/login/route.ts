import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, UserSession } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const { email, password } = await request.json();

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await UserSession.create({
      userId: user._id.toString(),
      token: sessionToken,
      expiresAt: Math.floor(expiresAt.getTime() / 1000),
    });

    // Return user data (excluding password)
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: Math.floor(new Date(user.createdAt).getTime() / 1000),
    };
    
    const response = NextResponse.json({
      user: userData,
      token: sessionToken,
    });

    // Set HTTP-only cookie
    // Using sameSite: 'lax' for better compatibility with reverse proxies and Ngrok
    response.cookies.set({
      name: 'session_token',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' for reverse proxy compatibility
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
