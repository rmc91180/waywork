export const metadata = {
  title: "Terms",
  description: "Way Work terms of use overview.",
};

export default function TermsPage() {
  return (
    <div className="waywork-shell py-12">
      <h1 className="text-4xl font-semibold text-[var(--ww-primary-blue)]">Terms of Service</h1>
      <div className="mt-6 max-w-3xl space-y-4 text-sm leading-7 text-[var(--ww-text-primary)]">
        <p>
          By using Way Work, guests and hosts agree to provide accurate information, respect booking
          commitments, and follow applicable laws and platform policies.
        </p>
        <p>
          Booking availability, pricing, cancellation terms, and host-specific rules are shown
          during checkout and become binding once a reservation is confirmed.
        </p>
        <p>
          Way Work may suspend accounts involved in fraud, policy abuse, or unsafe behavior to
          protect guests, hosts, and the platform ecosystem.
        </p>
      </div>
    </div>
  );
}

