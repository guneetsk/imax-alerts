import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/schema';
import { createOTP } from '@/lib/otp';
import { sendOTPEmail } from '@/lib/email';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscription ID.' }, { status: 400 });
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.emailVerified, false)
        )
      )
      .limit(1);

    if (!sub) {
      return NextResponse.json(
        { error: 'Subscription not found or already verified.' },
        { status: 404 }
      );
    }

    const otpResult = await createOTP(sub.email, sub.id);
    if ('error' in otpResult) {
      return NextResponse.json({ error: otpResult.error }, { status: 429 });
    }

    await sendOTPEmail(sub.email, otpResult.code);

    return NextResponse.json({ message: 'New code sent.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
