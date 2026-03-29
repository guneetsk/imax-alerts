import nodemailer from 'nodemailer';
import type { BMSShow } from './bms-client';

let _transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!_transporter) {
    if (!process.env.GMAIL_APP_PASSWORD) {
      throw new Error('GMAIL_APP_PASSWORD is not set.');
    }
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

const FROM = '"IMAX Alerts" <alerts.guneet@gmail.com>';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendOTPEmail(email: string, code: string) {
  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: `Your IMAX Alerts verification code: ${code}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#e23744;margin-bottom:8px">IMAX Alerts</h2>
        <p>Your verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f5f5f5;border-radius:8px;margin:16px 0">
          ${code}
        </div>
        <p style="color:#666;font-size:14px">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendShowAlert(
  email: string,
  movieName: string,
  shows: BMSShow[],
  unsubscribeUrl: string
) {
  const rows = shows
    .map(
      (s) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${formatDate(s.date)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee"><strong>${escapeHtml(s.time)}</strong></td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(s.screenName)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${s.availStatus === 'available' ? 'Available' : 'Fast Filling'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">Rs ${s.minPrice}–${s.maxPrice}</td>
        <td style="padding:8px;border-bottom:1px solid #eee"><a href="${s.bookingUrl}" style="color:#e23744;font-weight:bold">Book Now</a></td>
      </tr>`
    )
    .join('');

  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: `IMAX Alert: ${movieName} — ${shows.length} show(s) open!`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
        <h2 style="color:#e23744">IMAX bookings are open!</h2>
        <p><strong>${escapeHtml(movieName)}</strong> — ${shows.length} IMAX show(s) found:</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">Date</th>
            <th style="padding:8px;text-align:left">Time</th>
            <th style="padding:8px;text-align:left">Screen</th>
            <th style="padding:8px;text-align:left">Status</th>
            <th style="padding:8px;text-align:left">Price</th>
            <th style="padding:8px;text-align:left">Link</th>
          </tr>
          ${rows}
        </table>
        <p style="margin-top:24px;color:#666;font-size:13px">
          This alert has been automatically deactivated. You won't receive more emails for this subscription.
        </p>
        <p style="color:#999;font-size:12px">
          <a href="${unsubscribeUrl}" style="color:#999">Unsubscribe</a> | IMAX Alerts by guneetsk.com
        </p>
      </div>
    `,
  });
}

function formatDate(dateCode: string): string {
  const y = dateCode.slice(0, 4);
  const m = parseInt(dateCode.slice(4, 6), 10) - 1;
  const d = parseInt(dateCode.slice(6, 8), 10);
  return new Date(parseInt(y), m, d).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
