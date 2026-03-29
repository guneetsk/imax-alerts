import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

let _transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'alerts.guneet@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return _transporter;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret, to, subject, html } = body;

    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing to, subject, or html' }, { status: 400 });
    }

    await getTransporter().sendMail({
      from: '"IMAX Alerts" <alerts.guneet@gmail.com>',
      to,
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('send-alert error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
