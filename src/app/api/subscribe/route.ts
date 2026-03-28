import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/schema';
import { createOTP } from '@/lib/otp';
import { sendOTPEmail } from '@/lib/email';
import { eq, and, or, sql } from 'drizzle-orm';

const MAX_SUBS_PER_EMAIL = 5;
const MAX_VENUE_CODES = 20;
const MAX_TARGET_DATES = 14;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, movieEventCode, movieName, venueCodes, targetDates } = body;

    // Validate types and presence
    if (
      typeof email !== 'string' ||
      typeof movieEventCode !== 'string' ||
      typeof movieName !== 'string' ||
      !Array.isArray(venueCodes) ||
      !Array.isArray(targetDates) ||
      !venueCodes.length ||
      !targetDates.length
    ) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email.' }, { status: 400 });
    }

    // Validate lengths
    if (movieName.length > 200 || movieEventCode.length > 50) {
      return NextResponse.json({ error: 'Invalid movie data.' }, { status: 400 });
    }
    if (venueCodes.length > MAX_VENUE_CODES) {
      return NextResponse.json({ error: `Max ${MAX_VENUE_CODES} screens.` }, { status: 400 });
    }
    if (targetDates.length > MAX_TARGET_DATES) {
      return NextResponse.json({ error: `Max ${MAX_TARGET_DATES} dates.` }, { status: 400 });
    }

    // Validate date format (YYYYMMDD)
    const dateRegex = /^\d{8}$/;
    if (!targetDates.every((d: unknown) => typeof d === 'string' && dateRegex.test(d))) {
      return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 });
    }
    if (!venueCodes.every((v: unknown) => typeof v === 'string' && v.length <= 10)) {
      return NextResponse.json({ error: 'Invalid venue code.' }, { status: 400 });
    }

    // Check subscription limit (active + pending)
    const subCount = await db
      .select({ count: sql<string>`count(*)` })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.email, email),
          or(eq(subscriptions.active, true), eq(subscriptions.emailVerified, false))
        )
      );

    if (Number(subCount[0].count) >= MAX_SUBS_PER_EMAIL) {
      return NextResponse.json(
        { error: `Max ${MAX_SUBS_PER_EMAIL} alerts per email.` },
        { status: 429 }
      );
    }

    // Check OTP rate limit BEFORE creating subscription
    const otpCheck = await createOTP(email, 'pending');
    if ('error' in otpCheck) {
      return NextResponse.json({ error: otpCheck.error }, { status: 429 });
    }

    // Now insert subscription and link the OTP
    const [sub] = await db
      .insert(subscriptions)
      .values({
        email,
        movieEventCode,
        movieName,
        venueCodes: venueCodes as string[],
        targetDates: targetDates as string[],
      })
      .returning({ id: subscriptions.id });

    // Update the OTP to point to the real subscription
    const { updateOTPSubscription } = await import('@/lib/otp');
    await updateOTPSubscription(otpCheck.otpId, sub.id);

    await sendOTPEmail(email, otpCheck.code);

    return NextResponse.json({
      message: 'OTP sent to your email.',
      subscriptionId: sub.id,
    });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
