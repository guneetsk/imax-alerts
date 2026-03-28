import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/schema';
import { verifyOTP } from '@/lib/otp';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { email, code, subscriptionId } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required.' },
        { status: 400 }
      );
    }

    const result = await verifyOTP(email, code);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // If subscriptionId was provided, verify it matches the OTP's subscription
    if (subscriptionId && result.subscriptionId !== subscriptionId) {
      return NextResponse.json({ error: 'Invalid verification.' }, { status: 400 });
    }

    // Activate the subscription
    await db
      .update(subscriptions)
      .set({ emailVerified: true, active: true })
      .where(eq(subscriptions.id, result.subscriptionId));

    return NextResponse.json({ message: 'Email verified! Alert is now active.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
