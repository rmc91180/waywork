import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description: "Way Work privacy policy for guests, hosts, and site visitors.",
};

const dataCategories = [
  "Identity and account data, such as name, email address, phone number, profile details, and verification information.",
  "Booking and stay data, such as search activity, reservation details, dates, guest count, house rules, and property preferences.",
  "Host and listing data, such as property details, pricing, availability, payout information, tax identifiers, and compliance documents.",
  "Payment and transaction data, such as booking totals, refund status, payout status, and payment processor references.",
  "Usage, device, and security data, such as log data, IP address, browser information, cookies, and fraud signals.",
];

const purposes = [
  "Create and manage guest and host accounts.",
  "Process bookings, payments, payouts, refunds, and chargebacks.",
  "Operate listings, search, recommendations, and messaging.",
  "Detect fraud, abuse, and security incidents.",
  "Comply with tax, accounting, consumer, and other legal obligations.",
  "Provide support, dispute handling, and platform notifications.",
  "Improve product reliability, analytics, and service quality.",
];

const lawfulBases = [
  "Contract: to provide the platform, process reservations, and deliver host or guest services requested through Way Work.",
  "Legitimate interests: to maintain security, prevent fraud, improve the service, and protect our legal and commercial interests.",
  "Legal obligation: to retain and disclose information where law, tax, accounting, or regulatory duties require it.",
  "Consent: where we rely on consent for certain cookies, marketing messages, or optional features, you can withdraw that consent at any time.",
];

const rights = [
  "Access a copy of the personal data we hold about you.",
  "Correct inaccurate or incomplete data.",
  "Request deletion, restriction, or objection in the circumstances provided by law.",
  "Request portability for data processed by automated means with your consent or under contract, where applicable.",
  "Withdraw consent where processing is based on consent.",
  "Lodge a complaint with the UK Information Commissioner's Office or your local supervisory authority.",
];

export default function PrivacyPage() {
  return (
    <div className="waywork-shell py-12">
      <h1 className="text-4xl font-semibold text-[var(--ww-primary-blue)]">Privacy Policy</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--ww-text-primary)]">
        Effective date: April 14, 2026. This policy explains how Way Work collects, uses, shares, and
        protects personal data for guests, hosts, and site visitors.
      </p>

      <section className="mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
        <p>
          This policy is written to align with the UK GDPR and the Data Protection Act 2018. If you have
          a privacy request, please start with the{" "}
          <Link href="/support" className="font-semibold text-[var(--ww-primary-blue)] underline">
            support page
          </Link>{" "}
          or the account contact channel connected to your reservation or host account.
        </p>
      </section>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">1. Controller and Contact</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-text-primary)]">
          Way Work is the controller for personal data collected through the website and platform unless a
          host or external partner is clearly acting as an independent controller for its own purposes.
          For privacy requests, questions, or complaints, use the{" "}
          <Link href="/support" className="font-semibold text-[var(--ww-primary-blue)] underline">
            support page
          </Link>{" "}
          or the account contact channel linked to your reservation or host account.
        </p>
      </section>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">2. Data We Collect</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-text-primary)]">
          {dataCategories.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">3. How We Use Data</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-text-primary)]">
          {purposes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">4. Lawful Bases</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-text-primary)]">
          {lawfulBases.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">5. Sharing and Processors</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-text-primary)]">
          We share personal data only where needed to operate the service or where law requires it. This
          can include payment processors, identity or fraud vendors, cloud hosting and infrastructure
          providers, communication tools, analytics partners, channel managers, and professional
          advisers. Payment card details are handled by our payment partners and are not stored directly
          by Way Work unless a lawfully necessary payment reference is retained.
        </p>
      </section>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">6. International Transfers</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-text-primary)]">
          Some service providers may process data outside the UK or EEA. When that happens, we use
          appropriate safeguards such as the UK International Data Transfer Agreement, the UK Addendum,
          standard contractual clauses, or equivalent lawful transfer mechanisms, together with
          additional technical and organizational protections where required.
        </p>
      </section>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">7. Retention</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-text-primary)]">
          We keep personal data only as long as reasonably necessary for the purposes described in this
          policy, including contract performance, legal compliance, tax and accounting retention,
          dispute resolution, fraud prevention, and enforcement of our agreements. When data is no longer
          needed, we delete it, anonymize it, or archive it securely as permitted by law.
        </p>
      </section>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">8. Your Rights</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-text-primary)]">
          {rights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">9. Automated Checks, Security, and Children</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-text-primary)]">
          We may use automated or semi-automated checks for fraud prevention, payment risk, account
          integrity, and policy enforcement. We do not make decisions that produce solely legal or
          similarly significant effects without human review where the law requires it. We also use
          technical and organizational safeguards designed to protect personal data against unauthorized
          access, loss, misuse, or disclosure.
        </p>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-text-primary)]">
          Way Work is not intended for children under 18. We do not knowingly collect personal data from
          children, and if we learn that a child has provided personal data, we will take appropriate
          steps to remove or protect that information.
        </p>
      </section>

      <section className="mt-10 max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">10. Updates</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-text-primary)]">
          We may update this policy from time to time to reflect changes in law, our service, or our data
          practices. If changes are material, we will provide notice through the platform or by other
          reasonable means.
        </p>
      </section>
    </div>
  );
}
