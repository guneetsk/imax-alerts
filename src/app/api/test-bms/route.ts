import { NextResponse } from 'next/server';

export async function GET() {
  const url = 'https://in.bookmyshow.com/api/v3/mobile/showtimes/byvenue?venueCode=PAEG&regionCode=NCR&dateCode=20260329&appCode=MOBAND';

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BookMyShow/3.0 Android',
        'Accept': 'application/json',
      },
    });

    const status = res.status;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ status, error: text.slice(0, 200) });
    }

    const data = await res.json();
    const showCount = (data.ShowDetails || []).length;
    return NextResponse.json({ status, showCount, firstDate: data.ShowDetails?.[0]?.Date });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
