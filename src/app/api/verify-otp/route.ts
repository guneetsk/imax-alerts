import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/schema';
import { verifyOTP } from '@/lib/otp';
import { sendConfirmationEmail } from '@/lib/email';
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

    // Send confirmation email (non-blocking — don't fail the response if email fails)
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, result.subscriptionId))
      .limit(1);

    if (sub) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://imaxalerts.guneetsk.com';
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${sub.unsubscribeToken}`;
      const anyDate = sub.targetDates.length >= 14;

      sendConfirmationEmail(
        sub.email,
        sub.movieName,
        sub.venueCodes.length,
        sub.targetDates.length,
        anyDate,
        unsubscribeUrl
      ).catch((err) => console.error('Confirmation email failed:', err));

      // Notify admin of new active subscription
      const { sendAdminNewSubEmail } = await import('@/lib/email');
      sendAdminNewSubEmail(sub.email, sub.movieName, sub.venueCodes, sub.targetDates)
        .catch((err) => console.error('Admin notification failed:', err));
    }

    return NextResponse.json({ message: 'Email verified! Alert is now active.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
