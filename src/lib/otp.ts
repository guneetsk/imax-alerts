import crypto from 'crypto';
import { db } from './db';
import { otpCodes } from './schema';
import { eq, and, gt, sql } from 'drizzle-orm';

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_PER_HOUR = 3;

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function createOTP(
  email: string,
  subscriptionId: string
): Promise<{ code: string; otpId: string } | { error: string }> {
  // Rate limit: max 3 OTPs per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await db
    .select({ count: sql<string>`count(*)` })
    .from(otpCodes)
    .where(
      and(eq(otpCodes.email, email), gt(otpCodes.createdAt, oneHourAgo))
    );

  if (Number(recentCount[0].count) >= MAX_OTP_PER_HOUR) {
    return { error: 'Too many OTP requests. Try again in an hour.' };
  }

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const [row] = await db
    .insert(otpCodes)
    .values({
      email,
      code,
      subscriptionId,
      expiresAt,
    })
    .returning({ id: otpCodes.id });

  return { code, otpId: row.id };
}

export async function updateOTPSubscription(
  otpId: string,
  subscriptionId: string
) {
  await db
    .update(otpCodes)
    .set({ subscriptionId })
    .where(eq(otpCodes.id, otpId));
}

export async function verifyOTP(
  email: string,
  code: string
): Promise<{ subscriptionId: string } | { error: string }> {
  const now = new Date();

  const rows = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, now)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return { error: 'Invalid or expired OTP.' };
  }

  const otp = rows[0];

  // Mark as used
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(eq(otpCodes.id, otp.id));

  return { subscriptionId: otp.subscriptionId };
}
