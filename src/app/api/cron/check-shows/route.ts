import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/schema';
import { fetchVenueShows, type BMSShow } from '@/lib/bms-client';
import { sendShowAlert } from '@/lib/email';
import { eq, and } from 'drizzle-orm';
import imaxScreens from '@/lib/data/imax-screens.json';

export const maxDuration = 60; // Vercel function timeout

function verifySecret(req: NextRequest): boolean {
  const incoming = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  const expected = process.env.CRON_SECRET ?? '';
  if (incoming.length !== expected.length || !expected) return false;
  return crypto.timingSafeEqual(Buffer.from(incoming), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Load all active, verified subscriptions
    const activeSubs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.active, true),
          eq(subscriptions.emailVerified, true)
        )
      );

    if (activeSubs.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions.' });
    }

    // 2. Collect unique (venueCode, date) pairs across ALL users
    const venueScreenMap = new Map<string, { venueCode: string; regionCode: string }>();
    for (const s of imaxScreens) {
      venueScreenMap.set(s.venueCode, { venueCode: s.venueCode, regionCode: s.regionCode });
    }

    const pairsToFetch = new Set<string>(); // "venueCode|dateCode"
    for (const sub of activeSubs) {
      for (const vc of sub.venueCodes) {
        for (const dc of sub.targetDates) {
          pairsToFetch.add(`${vc}|${dc}`);
        }
      }
    }

    // 3. Fetch BMS data — ONE call per unique (venueCode, date)
    const showsByVenueDate = new Map<string, BMSShow[]>(); // "venueCode|dateCode" → shows

    // Run fetches with concurrency limit (5 at a time)
    const pairs = [...pairsToFetch];
    for (let i = 0; i < pairs.length; i += 5) {
      const chunk = pairs.slice(i, i + 5);
      await Promise.all(
        chunk.map(async (pair) => {
          const [venueCode, dateCode] = pair.split('|');
          const screenInfo = venueScreenMap.get(venueCode);
          if (!screenInfo) return;

          try {
            const shows = await fetchVenueShows(venueCode, screenInfo.regionCode, dateCode);
            if (shows.length > 0) {
              showsByVenueDate.set(pair, shows);
            }
          } catch (err) {
            console.warn(`BMS fetch failed for ${pair}:`, err);
          }
        })
      );
    }

    // 4. Match results to individual users
    let emailsSent = 0;

    for (const sub of activeSubs) {
      const matchedShows: BMSShow[] = [];

      for (const vc of sub.venueCodes) {
        for (const dc of sub.targetDates) {
          const shows = showsByVenueDate.get(`${vc}|${dc}`);
          if (!shows) continue;

          // Filter by user's selected movie
          const movieShows = shows.filter(
            (s) => s.eventCode === sub.movieEventCode
          );

          // Dedup: skip shows already notified
          const newShows = movieShows.filter((s) => {
            const key = `${s.date}-${s.dateTime}-${s.sessionId}`;
            return !sub.notifiedShowKeys.includes(key);
          });

          matchedShows.push(...newShows);
        }
      }

      // Always stamp last_checked_at so we know this sub was processed
      try {
        await db
          .update(subscriptions)
          .set({ lastCheckedAt: new Date() })
          .where(eq(subscriptions.id, sub.id));
      } catch (err) {
        console.error(`Failed to update lastCheckedAt for ${sub.id}:`, err);
      }

      if (matchedShows.length === 0) continue;

      // 5. Send personalized email
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://imax-alerts.vercel.app';
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${sub.unsubscribeToken}`;

      try {
        await sendShowAlert(sub.email, sub.movieName, matchedShows, unsubscribeUrl);
        emailsSent++;

        // Record notified keys and deactivate
        const newKeys = matchedShows.map(
          (s) => `${s.date}-${s.dateTime}-${s.sessionId}`
        );
        await db
          .update(subscriptions)
          .set({
            active: false,
            notifiedAt: new Date(),
            notifiedShowKeys: [...sub.notifiedShowKeys, ...newKeys],
          })
          .where(eq(subscriptions.id, sub.id));
      } catch (err) {
        console.error(`Failed to email ${sub.id} (${sub.email}):`, err);
        // Don't deactivate — will retry on next cron cycle
      }
    }

    return NextResponse.json({
      message: `Checked ${pairsToFetch.size} venue/date pairs, sent ${emailsSent} alerts.`,
      activeSubs: activeSubs.length,
      apiCalls: pairsToFetch.size,
      emailsSent,
    });
  } catch (err) {
    console.error('Cron error:', err);
    return NextResponse.json(
      { error: 'Cron check failed.' },
      { status: 500 }
    );
  }
}

