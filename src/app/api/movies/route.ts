import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cachedMovies } from '@/lib/schema';
import { fetchVenueShows } from '@/lib/bms-client';
import { gt } from 'drizzle-orm';

// Refresh movies if cache is older than 6 hours
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Well-known IMAX screens to poll for movie discovery
const DISCOVERY_SCREENS = [
  { venueCode: 'PAEG', regionCode: 'NCR' }, // PVR Ambience Gurugram
  { venueCode: 'XLLS', regionCode: 'MUMBAI' }, // INOX R-City Mumbai
  { venueCode: 'PVFM', regionCode: 'BANG' }, // PVR Forum Bengaluru
];

export async function GET() {
  try {
    // Check if cache is fresh
    const cutoff = new Date(Date.now() - CACHE_TTL_MS);
    const freshMovies = await db
      .select()
      .from(cachedMovies)
      .where(gt(cachedMovies.lastSeenAt, cutoff));

    if (freshMovies.length > 0) {
      return NextResponse.json({
        movies: freshMovies.map((m) => ({
          eventCode: m.eventCode,
          eventName: m.eventName,
        })),
      });
    }

    // Cache is stale — refresh from BMS
    const today = new Date();
    const dateCode = formatDateCode(today);
    const seen = new Map<string, string>(); // eventCode → eventName

    for (const screen of DISCOVERY_SCREENS) {
      try {
        const shows = await fetchVenueShows(
          screen.venueCode,
          screen.regionCode,
          dateCode
        );
        for (const show of shows) {
          if (!seen.has(show.eventCode)) {
            seen.set(show.eventCode, show.eventName);
          }
        }
      } catch (err) {
        console.warn(
          `Movie discovery failed for ${screen.venueCode}:`,
          err
        );
      }
    }

    // Upsert into cache
    const now = new Date();
    for (const [eventCode, eventName] of seen) {
      await db
        .insert(cachedMovies)
        .values({ eventCode, eventName, lastSeenAt: now })
        .onConflictDoUpdate({
          target: cachedMovies.eventCode,
          set: { eventName, lastSeenAt: now },
        });
    }

    // Return movies seen in the last 7 days (prune stale entries)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const allMovies = await db
      .select()
      .from(cachedMovies)
      .where(gt(cachedMovies.lastSeenAt, sevenDaysAgo));

    return NextResponse.json({
      movies: allMovies.map((m) => ({
        eventCode: m.eventCode,
        eventName: m.eventName,
      })),
    });
  } catch (err) {
    console.error('Movies API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch movies.' },
      { status: 500 }
    );
  }
}

function formatDateCode(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
