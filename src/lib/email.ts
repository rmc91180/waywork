import { Resend } from "resend";
import { format } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "WayWork <noreply@waywork.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://waywork.com";

// ─── Low-level send ──────────────────────────────────────────────────────────

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] No API key — would send to ${to}: ${subject}`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[Email] Failed to send:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

// ─── Shared layout ───────────────────────────────────────────────────────────

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WayWork</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0f2b5b;border-radius:12px 12px 0 0;padding:24px 32px;">
            <a href="${APP_URL}" style="text-decoration:none;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Way<span style="color:#4ade80;">Work</span></span>
            </a>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              You received this email because you have a WayWork account.
              <br/>© ${new Date().getFullYear()} WayWork. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;vertical-align:top;">${value}</td>
  </tr>`;
}

function cta(label: string, href: string, color = "#0f2b5b"): string {
  return `<p style="margin:24px 0 0;">
    <a href="${href}" style="background:${color};color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">${label}</a>
  </p>`;
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "EEE, d MMM yyyy");
}

// ─── Booking confirmed — guest ────────────────────────────────────────────────

export interface BookingConfirmedGuestData {
  guestName: string;
  guestEmail: string;
  listingTitle: string;
  listingCity: string;
  checkIn: Date | string;
  checkOut: Date | string;
  numberOfDays: number;
  totalPrice: string;
  bookingId: string;
  cancellationPolicy: string;
}

export async function sendBookingConfirmedGuest(data: BookingConfirmedGuestData): Promise<void> {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#111827;">Your workspace is booked ✓</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Here are your booking details, ${data.guestName.split(" ")[0]}.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#111827;">${data.listingTitle}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">${data.listingCity}</p>
      <table style="margin-top:16px;border-collapse:collapse;width:100%;">
        ${detailRow("Check-in", formatDate(data.checkIn))}
        ${detailRow("Check-out", formatDate(data.checkOut))}
        ${detailRow("Duration", `${data.numberOfDays} night${data.numberOfDays !== 1 ? "s" : ""}`)}
        ${detailRow("Total paid", data.totalPrice)}
        ${detailRow("Cancellation", data.cancellationPolicy)}
      </table>
    </div>

    <p style="color:#374151;font-size:14px;line-height:1.6;">
      Need to make changes or have questions about your stay? Message your host directly from your booking page.
    </p>
    ${cta("View booking", `${APP_URL}/bookings/${data.bookingId}`, "#0f2b5b")}
  `;

  await sendEmail({
    to: data.guestEmail,
    subject: `Confirmed: ${data.listingTitle} · ${formatDate(data.checkIn)}`,
    html: layout(body),
  });
}

// ─── New booking alert — host ─────────────────────────────────────────────────

export interface NewBookingHostData {
  hostName: string;
  hostEmail: string;
  guestName: string;
  listingTitle: string;
  checkIn: Date | string;
  checkOut: Date | string;
  numberOfDays: number;
  hostPayout: string;
  bookingId: string;
  specialRequests?: string;
}

export async function sendNewBookingHost(data: NewBookingHostData): Promise<void> {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#111827;">New booking received</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${data.hostName.split(" ")[0]}, <strong>${data.guestName}</strong> has booked your space.</p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#111827;">${data.listingTitle}</p>
      <table style="margin-top:16px;border-collapse:collapse;width:100%;">
        ${detailRow("Guest", data.guestName)}
        ${detailRow("Check-in", formatDate(data.checkIn))}
        ${detailRow("Check-out", formatDate(data.checkOut))}
        ${detailRow("Duration", `${data.numberOfDays} night${data.numberOfDays !== 1 ? "s" : ""}`)}
        ${detailRow("Your payout", data.hostPayout)}
      </table>
      ${data.specialRequests ? `<p style="margin:16px 0 0;font-size:13px;color:#374151;"><strong>Guest note:</strong> ${data.specialRequests}</p>` : ""}
    </div>

    <p style="color:#374151;font-size:14px;line-height:1.6;">
      The dates have been blocked in your calendar automatically. You can message the guest from your bookings dashboard.
    </p>
    ${cta("View booking", `${APP_URL}/host/bookings`, "#0f2b5b")}
  `;

  await sendEmail({
    to: data.hostEmail,
    subject: `New booking: ${data.listingTitle} · ${formatDate(data.checkIn)}`,
    html: layout(body),
  });
}

// ─── Booking cancelled — both parties ────────────────────────────────────────

export interface BookingCancelledData {
  recipientName: string;
  recipientEmail: string;
  listingTitle: string;
  checkIn: Date | string;
  checkOut: Date | string;
  cancelledBy: "guest" | "host";
  refundAmount?: string;
  bookingId: string;
}

export async function sendBookingCancelled(data: BookingCancelledData): Promise<void> {
  const byLine =
    data.cancelledBy === "guest"
      ? "This booking was cancelled by the guest."
      : "This booking was cancelled by the host.";

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#111827;">Booking cancelled</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${data.recipientName.split(" ")[0]}, ${byLine}</p>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#111827;">${data.listingTitle}</p>
      <table style="margin-top:16px;border-collapse:collapse;width:100%;">
        ${detailRow("Check-in", formatDate(data.checkIn))}
        ${detailRow("Check-out", formatDate(data.checkOut))}
        ${data.refundAmount ? detailRow("Refund", data.refundAmount) : ""}
      </table>
    </div>

    ${
      data.cancelledBy === "host"
        ? `<p style="color:#374151;font-size:14px;line-height:1.6;">We're sorry for the inconvenience. Browse other available workspaces on WayWork.</p>
           ${cta("Find another space", `${APP_URL}/search`, "#0f2b5b")}`
        : `<p style="color:#374151;font-size:14px;line-height:1.6;">
             ${data.refundAmount ? `A refund of ${data.refundAmount} has been initiated and will appear within 5–10 business days.` : "No refund is due based on the cancellation policy."}
           </p>
           ${cta("View details", `${APP_URL}/bookings/${data.bookingId}`, "#6b7280")}`
    }
  `;

  await sendEmail({
    to: data.recipientEmail,
    subject: `Booking cancelled: ${data.listingTitle}`,
    html: layout(body),
  });
}

// ─── Review prompt — guest (sent after checkout) ──────────────────────────────

export interface ReviewPromptData {
  guestName: string;
  guestEmail: string;
  listingTitle: string;
  listingCity: string;
  bookingId: string;
  listingId: string;
}

export async function sendReviewPrompt(data: ReviewPromptData): Promise<void> {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#111827;">How was your stay?</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
      Hi ${data.guestName.split(" ")[0]}, we hope your work trip to <strong>${data.listingCity}</strong> went well.
      Reviews help other remote workers find the right space — yours takes less than a minute.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${data.listingTitle}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">${data.listingCity}</p>
    </div>

    <p style="color:#374151;font-size:14px;line-height:1.6;">
      Just click below to rate your stay and leave a quick note for the next guest.
    </p>
    ${cta("Leave a review", `${APP_URL}/bookings/${data.bookingId}/review`, "#16a34a")}
  `;

  await sendEmail({
    to: data.guestEmail,
    subject: `How was ${data.listingTitle}? Leave a quick review`,
    html: layout(body),
  });
}

// ─── New message notification ─────────────────────────────────────────────────

export interface NewMessageData {
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  listingTitle: string;
  messagePreview: string;
  threadId: string;
}

export async function sendNewMessage(data: NewMessageData): Promise<void> {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#111827;">New message</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
      Hi ${data.recipientName.split(" ")[0]}, <strong>${data.senderName}</strong> sent you a message about <strong>${data.listingTitle}</strong>.
    </p>

    <div style="background:#f9fafb;border-left:4px solid #0f2b5b;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;font-style:italic;">"${data.messagePreview}"</p>
    </div>

    ${cta("Reply", `${APP_URL}/messages/${data.threadId}`, "#0f2b5b")}
  `;

  await sendEmail({
    to: data.recipientEmail,
    subject: `${data.senderName} sent you a message about ${data.listingTitle}`,
    html: layout(body),
  });
}

// ─── Review received — host ───────────────────────────────────────────────────

export interface ReviewReceivedData {
  hostName: string;
  hostEmail: string;
  guestName: string;
  listingTitle: string;
  rating: number;
  comment?: string;
  listingId: string;
}

export async function sendReviewReceived(data: ReviewReceivedData): Promise<void> {
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#111827;">New review received</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
      Hi ${data.hostName.split(" ")[0]}, <strong>${data.guestName}</strong> left a review for <strong>${data.listingTitle}</strong>.
    </p>

    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:20px;color:#d97706;letter-spacing:2px;">${stars}</p>
      ${data.comment ? `<p style="margin:0;color:#374151;font-size:14px;line-height:1.6;font-style:italic;">"${data.comment}"</p>` : '<p style="margin:0;color:#9ca3af;font-size:13px;">No written comment left.</p>'}
    </div>

    ${cta("View listing", `${APP_URL}/spaces/${data.listingId}`, "#0f2b5b")}
  `;

  await sendEmail({
    to: data.hostEmail,
    subject: `${data.guestName} left a ${data.rating}-star review for ${data.listingTitle}`,
    html: layout(body),
  });
}
