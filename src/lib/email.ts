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
    subject: `${code} is your IMAX Alerts code`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed,#9333ea);padding:32px 24px;border-radius:16px 16px 0 0">
          <h2 style="color:#fff;margin:0 0 4px 0;font-size:20px;font-weight:700">IMAX Alerts</h2>
          <p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px">Verify your email to activate your alert</p>
        </div>
        <div style="background:#ffffff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px">
          <p style="color:#374151;font-size:15px;margin:0 0 20px 0">Enter this code to verify your email:</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:10px;text-align:center;padding:20px;background:#f3f2ff;border:2px solid #e0e0ff;border-radius:12px;margin:0 0 20px 0;color:#4f46e5">
            ${code}
          </div>
          <p style="color:#9ca3af;font-size:13px;margin:0">This code expires in 10 minutes. If you didn't request this, just ignore this email.</p>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin:16px 0 0 0">IMAX Alerts by guneetsk.com</p>
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
    subject: `Bookings open! ${movieName} IMAX tickets are live`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed,#9333ea);padding:32px 24px;border-radius:16px 16px 0 0">
          <h2 style="color:#fff;margin:0 0 4px 0;font-size:20px;font-weight:700">IMAX Alerts</h2>
          <p style="color:rgba(255,255,255,0.9);margin:0;font-size:16px;font-weight:600">Bookings are open!</p>
        </div>
        <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px">
          <p style="color:#374151;font-size:15px;margin:0 0 16px 0"><strong>${escapeHtml(movieName)}</strong> — ${shows.length} IMAX show(s) found:</p>
          <table style="border-collapse:collapse;width:100%;font-size:14px">
            <tr style="background:#f3f2ff">
              <th style="padding:10px 8px;text-align:left;color:#4f46e5;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Date</th>
              <th style="padding:10px 8px;text-align:left;color:#4f46e5;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Time</th>
              <th style="padding:10px 8px;text-align:left;color:#4f46e5;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Screen</th>
              <th style="padding:10px 8px;text-align:left;color:#4f46e5;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Status</th>
              <th style="padding:10px 8px;text-align:left;color:#4f46e5;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Price</th>
              <th style="padding:10px 8px;text-align:left;color:#4f46e5;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Link</th>
            </tr>
            ${rows}
          </table>
          <p style="margin:20px 0 0 0;color:#6b7280;font-size:13px">
            This alert has been automatically deactivated. No more emails from us for this one.
          </p>
          <p style="color:#9ca3af;font-size:12px;margin:12px 0 0 0">
            <a href="${unsubscribeUrl}" style="color:#9ca3af">Unsubscribe</a> &middot; IMAX Alerts by guneetsk.com
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendConfirmationEmail(
  email: string,
  movieName: string,
  screenCount: number,
  dateCount: number,
  anyDate: boolean,
  unsubscribeUrl: string
) {
  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: `Alert active: ${movieName} IMAX`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed,#9333ea);padding:32px 24px;border-radius:16px 16px 0 0">
          <h2 style="color:#fff;margin:0 0 4px 0;font-size:20px;font-weight:700">IMAX Alerts</h2>
          <p style="color:rgba(255,255,255,0.9);margin:0;font-size:16px;font-weight:600">Your alert is active!</p>
        </div>
        <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px">
          <p style="color:#374151;font-size:15px;margin:0 0 20px 0">We are now monitoring BookMyShow for you. Here is what we are tracking:</p>
          <div style="background:#f3f2ff;border:1px solid #e0e0ff;border-radius:12px;padding:16px;margin:0 0 20px 0">
            <p style="margin:0 0 8px 0;font-size:14px"><strong style="color:#4f46e5">Movie:</strong> <span style="color:#374151">${escapeHtml(movieName)}</span></p>
            <p style="margin:0 0 8px 0;font-size:14px"><strong style="color:#4f46e5">Screens:</strong> <span style="color:#374151">${screenCount} IMAX ${screenCount === 1 ? 'screen' : 'screens'}</span></p>
            <p style="margin:0;font-size:14px"><strong style="color:#4f46e5">Dates:</strong> <span style="color:#374151">${anyDate ? 'Any date in the next 2 weeks' : `${dateCount} specific ${dateCount === 1 ? 'date' : 'dates'}`}</span></p>
          </div>
          <p style="color:#374151;font-size:14px;margin:0 0 8px 0"><strong>What happens next?</strong></p>
          <p style="color:#6b7280;font-size:13px;margin:0 0 20px 0">We check every 15 minutes. The moment bookings open, you will get an email with direct booking links. After that, this alert automatically deactivates — no spam, no ongoing emails.</p>
          <p style="color:#9ca3af;font-size:12px;margin:0">
            <a href="${unsubscribeUrl}" style="color:#9ca3af">Cancel this alert</a> &middot; IMAX Alerts by guneetsk.com
          </p>
        </div>
      </div>
    `,
  });
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'get.guneet@gmail.com';

export async function sendAdminNewSubEmail(
  userEmail: string,
  movieName: string,
  venueCodes: string[],
  targetDates: string[]
) {
  const dates = targetDates.map((d) => formatDate(d)).join(', ');
  await getTransporter().sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `New sub: ${movieName} — ${venueCodes.join(', ')}`,
    html: `
      <div style="font-family:sans-serif;color:#333;max-width:480px;padding:16px">
        <p><strong>New active subscription</strong></p>
        <p>Email: ${escapeHtml(userEmail)}</p>
        <p>Movie: ${escapeHtml(movieName)}</p>
        <p>Screens: ${venueCodes.join(', ')}</p>
        <p>Dates: ${dates}</p>
        <p style="color:#999;font-size:12px">${new Date().toISOString()}</p>
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
