export const metadata = {
  title: "Terms",
  description: "Way Work terms for guests and hosts.",
};

const guestTerms = [
  "Guests must provide accurate identity, payment, and booking details.",
  "Guest payments are collected by Way Work as merchant of record for bookings made through the platform.",
  "Confirmed bookings are binding and cancellation outcomes follow the listing policy shown at checkout.",
  "Guests are responsible for all attendee conduct, property damage, and compliance with local laws and building rules.",
  "Unauthorized parties, illegal activity, and commercial misuse are prohibited and may trigger immediate cancellation.",
];

const hostTerms = [
  "Hosts warrant they have legal authority to list each property and grant occupancy rights for booked periods.",
  "Hosts are solely responsible for listing accuracy, statutory compliance, safety standards, and tax obligations.",
  "Hosts retain all liability for property condition, building permissions, guest injury claims, and third-party claims arising from their listings.",
  "Way Work commission is deducted automatically before host payout remittance according to the active host or partner agreement.",
  "Hosts must honor confirmed reservations except where cancellation is legally required or approved through platform support.",
  "Hosts authorize synchronization of listing availability, rates, and reservation metadata through configured channel manager integrations.",
];

const platformTerms = [
  "Way Work may suspend listings or accounts for fraud, material policy breaches, unsafe conduct, or payment risk.",
  "All fees, payouts, and refunds are processed through integrated payment providers subject to provider terms and KYC requirements.",
  "Way Work may update these terms to address legal, regulatory, or product changes; continued use constitutes acceptance of updated terms.",
  "To the maximum extent permitted by law, Way Work excludes indirect/consequential damages and caps direct liability to fees retained in the 12 months preceding a claim.",
  "These terms are governed by the laws of England and Wales, and disputes are subject to exclusive adjudication in London, England.",
];

export default function TermsPage() {
  return (
    <div className="waywork-shell py-12">
      <h1 className="text-4xl font-semibold text-[var(--ww-primary-blue)]">Terms of Service</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--ww-text-primary)]">
        Effective date: March 6, 2026. These terms apply to all guests and hosts using Way Work.
      </p>

      <section className="mt-8 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">Guest Terms</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-text-primary)]">
          {guestTerms.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">Host Terms</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-text-primary)]">
          {hostTerms.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">Platform Terms</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-text-primary)]">
          {platformTerms.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        This page is a production-ready baseline and should still be reviewed by UK-qualified counsel
        before public launch.
      </section>
    </div>
  );
}
