import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "WayWork <noreply@waywork.com>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] Would send to ${to}: ${subject}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[Email] Failed to send:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export function bookingConfirmationEmail(data: {
  guestName: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  bookingId: string;
}) {
  return {
    subject: `Booking Confirmed: ${data.listingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Booking Confirmed!</h1>
        <p>Hi ${data.guestName},</p>
        <p>Your workspace booking has been confirmed.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${data.listingTitle}</h3>
          <p><strong>Check-in:</strong> ${data.checkIn}</p>
          <p><strong>Check-out:</strong> ${data.checkOut}</p>
          <p><strong>Total:</strong> ${data.totalPrice}</p>
        </div>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/bookings/${data.bookingId}"
             style="background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            View Booking
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Thank you for choosing WayWork.</p>
      </div>
    `,
  };
}

export function hostNewBookingEmail(data: {
  hostName: string;
  guestName: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  hostPayout: string;
  bookingId: string;
}) {
  return {
    subject: `New Booking: ${data.listingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">New Booking!</h1>
        <p>Hi ${data.hostName},</p>
        <p><strong>${data.guestName}</strong> has booked your space.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${data.listingTitle}</h3>
          <p><strong>Check-in:</strong> ${data.checkIn}</p>
          <p><strong>Check-out:</strong> ${data.checkOut}</p>
          <p><strong>Your payout:</strong> ${data.hostPayout}</p>
        </div>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/host/bookings"
             style="background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            View Bookings
          </a>
        </p>
      </div>
    `,
  };
}

export function bookingCancellationEmail(data: {
  recipientName: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  cancelledBy: string;
  bookingId: string;
}) {
  return {
    subject: `Booking Cancelled: ${data.listingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Booking Cancelled</h2>
        <p>Hi ${data.recipientName},</p>
        <p>A booking for <strong>${data.listingTitle}</strong> has been cancelled by the ${data.cancelledBy}.</p>
        <div style="background: #fff3f3; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Check-in:</strong> ${data.checkIn}</p>
          <p><strong>Check-out:</strong> ${data.checkOut}</p>
        </div>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/bookings/${data.bookingId}"
             style="background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            View Details
          </a>
        </p>
      </div>
    `,
  };
}

export function reviewReceivedEmail(data: {
  hostName: string;
  guestName: string;
  listingTitle: string;
  rating: number;
  comment?: string;
  listingId: string;
}) {
  return {
    subject: `New Review for ${data.listingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Review</h2>
        <p>Hi ${data.hostName},</p>
        <p><strong>${data.guestName}</strong> left a ${data.rating}-star review for <strong>${data.listingTitle}</strong>.</p>
        ${
          data.comment
            ? `<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0; color: #333; font-style: italic;">"${data.comment}"</p>
              </div>`
            : ""
        }
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/spaces/${data.listingId}"
             style="background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            View Listing
          </a>
        </p>
      </div>
    `,
  };
}

export function newMessageEmail(data: {
  recipientName: string;
  senderName: string;
  listingTitle: string;
  messagePreview: string;
  threadId: string;
}) {
  return {
    subject: `New message about ${data.listingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Message</h2>
        <p>Hi ${data.recipientName},</p>
        <p><strong>${data.senderName}</strong> sent you a message about <strong>${data.listingTitle}</strong>:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #333;">${data.messagePreview}</p>
        </div>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/messages/${data.threadId}"
             style="background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            Reply
          </a>
        </p>
      </div>
    `,
  };
}
