import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(html('Missing unsubscribe token.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.unsubscribeToken, token))
      .limit(1);

    if (!sub) {
      return new NextResponse(html('Subscription not found.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!sub.active) {
      return new NextResponse(
        html('This alert was already deactivated.'),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    await db
      .update(subscriptions)
      .set({ active: false })
      .where(eq(subscriptions.unsubscribeToken, token));

    return new NextResponse(
      html('You have been unsubscribed. You will no longer receive alerts for this subscription.'),
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return new NextResponse(html('Something went wrong.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

function html(message: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>IMAX Alerts</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:0 16px;text-align:center">
  <h2 style="color:#e23744">IMAX Alerts</h2>
  <p>${message}</p>
</body>
</html>`;
}
