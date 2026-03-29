import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cachedMovies } from '@/lib/schema';

// Movies are seeded/refreshed via a GitHub Action (curl works, Vercel fetch doesn't
// due to Cloudflare blocking). This API just returns what's in the DB.

export async function GET() {
  try {
    const allMovies = await db.select().from(cachedMovies);

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
