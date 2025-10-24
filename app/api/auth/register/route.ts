import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, UserSession } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const { name, email, password } = await request.json();

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already in use' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Create session
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await UserSession.create({
      userId: newUser._id.toString(),
      token: sessionToken,
      expiresAt: Math.floor(expiresAt.getTime() / 1000),
    });

    // Return user data (excluding password)
    const user = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      createdAt: Math.floor(new Date(newUser.createdAt).getTime() / 1000),
    };

    const response = NextResponse.json({
      user,
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
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
