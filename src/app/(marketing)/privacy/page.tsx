export const metadata = {
  title: "Privacy",
  description: "Way Work privacy policy for guests and hosts.",
};

const collection = [
  "Account and identity data (name, email, phone, verification data).",
  "Booking and listing data (dates, occupancy, rates, amenities, property details).",
  "Payment and payout metadata (transaction references, account status, compliance outcomes).",
  "Operational telemetry (security logs, fraud controls, performance diagnostics).",
];

const usage = [
  "Operate bookings, payouts, support, and contract enforcement.",
  "Synchronize listing and reservation data with configured channel manager providers.",
  "Detect abuse, prevent fraud, and satisfy legal/regulatory requirements.",
  "Improve relevance, search quality, and platform reliability.",
];

const rights = [
  "Access, correct, or delete account data where legally permitted.",
  "Object to processing or request restriction in specific circumstances.",
  "Request export of core personal data in a portable format.",
  "Lodge a complaint with the UK ICO or local supervisory authority.",
];

export default function PrivacyPage() {
  return (
    <div className="waywork-shell py-12">
      <h1 className="text-4xl font-semibold text-[var(--ww-primary-blue)]">Privacy Policy</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--ww-text-primary)]">
        Effective date: March 6, 2026. This policy applies to guests, hosts, and team members using Way Work.
      </p>

      <section className="mt-8 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">Data We Collect</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-text-primary)]">
          {collection.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">How We Use Data</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-text-primary)]">
          {usage.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">Sharing and Processors</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-text-primary)]">
          We share data only with processors necessary to run the platform, including payment providers,
          infrastructure vendors, communication tools, and configured channel managers. Payment card
          details are processed by PCI-compliant partners and are not stored directly by Way Work.
        </p>
      </section>

      <section className="mt-8 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">Retention</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-text-primary)]">
          Booking, payout, and audit records are retained for contractual, tax, fraud prevention, and
          legal compliance purposes. We minimize retained data and delete or anonymize data when no
          longer required.
        </p>
      </section>

      <section className="mt-8 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">Your Rights</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-text-primary)]">
          {rights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        Privacy requests: contact support through the platform support page or your account inbox.
        Governing law and dispute forum align with the Way Work Terms (England and Wales, London adjudication).
      </section>
    </div>
  );
}
