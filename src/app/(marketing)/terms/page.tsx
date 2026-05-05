import Link from "next/link";

export const metadata = {
  title: "Terms",
  description: "Way Work terms for guests, hosts, and platform use.",
};

const guestTerms = [
  "A guest booking is a contract between the guest and the host, with Way Work acting as the platform and payment facilitator unless a listing expressly states otherwise.",
  "The booking page, listing page, cancellation policy, house rules, fees, and booking confirmation are incorporated into the guest contract by reference.",
  "Guests must review the listing carefully before booking, including location, check-in terms, occupancy limits, work criteria, cancellation terms, and any minimum stay or deposit requirements.",
  "Guests must not use a listing for unlawful, fraudulent, disruptive, unsafe, or commercial subletting purposes, and must comply with local law, building rules, and the host's house rules.",
  "Guests are responsible for the accuracy of their booking details, for any damage caused by them or their invitees, and for any fees or charges properly disclosed before booking.",
  "Where consumer law applies, these terms do not remove mandatory rights that cannot be excluded under applicable law.",
];

const hostTerms = [
  "The host relationship with Way Work is governed by these host terms, the listing onboarding flow, the host dashboard, any platform schedules or addenda, and any written commercial terms agreed by Way Work.",
  "Hosts appoint Way Work to market the listing, collect payment from guests, facilitate reservations, and coordinate payment split flows as configured on the platform.",
  "Hosts are solely responsible for the truth, completeness, and legal compliance of their listings, including permissions, title, insurance, licensing, safety, VAT or other taxes, and local regulatory obligations.",
  "Hosts must maintain the property, availability, pricing, photos, work-specific criteria, amenities, and cancellation settings so that the listing remains accurate and bookable.",
  "Hosts are responsible for guest experience, property condition, cleaning, check-in arrangements, emergency response, and any services promised in the listing or otherwise made available to guests.",
  "Hosts must promptly notify Way Work of any safety issue, dispute, chargeback risk, legal claim, or reservation problem that could affect performance of the listing or the platform.",
  "Hosts indemnify Way Work against losses, claims, penalties, damages, costs, and liabilities arising from the host's listing, property, services, breach of law, negligence, or breach of these terms.",
  "Hosts acknowledge that Way Work may withhold, set off, or delay payouts where required for refunds, chargebacks, disputes, fraud prevention, compliance, or legal process.",
  "The standard commission for Way Work is 15% of the booking subtotal or other agreed commission base, plus any taxes applicable to Way Work's supply of services, unless a separate signed commercial arrangement states otherwise.",
  "Hosts are responsible for all taxes, duties, assessments, and compliance filings arising from their property income, except taxes imposed directly on Way Work by law.",
];

const platformTerms = [
  "Way Work may suspend, remove, or refuse a listing or account where required for safety, fraud prevention, legal compliance, payment risk, or platform integrity.",
  "Way Work provides the platform, payment flows, and support layers on an as-is and as-available basis to the maximum extent permitted by law.",
  "Neither party may rely on statements outside the written listing, booking confirmation, host dashboard terms, or platform notices that have been expressly accepted or published by Way Work.",
  "To the extent permitted by law, Way Work excludes implied warranties not expressly stated here and limits liability for indirect, incidental, or consequential loss.",
  "Nothing in these terms limits liability for fraud, death, or personal injury caused by negligence, or any liability that cannot lawfully be limited or excluded.",
];

export default function TermsPage() {
  return (
    <div className="waywork-shell py-12">
      <h1 className="text-4xl font-semibold text-[var(--ww-ink)]">Terms and Conditions</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--ww-celadon)]">
        Effective date: April 14, 2026. These terms are drafted for Way Work&apos;s guest and host platform
        flows. They are intended as a strong operational baseline, but they should be reviewed and
        finalized by UK-qualified counsel before launch.
      </p>

      <section className="mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
        <p>
          If you need to raise a legal or contractual question, start with the{" "}
          <Link href="/support" className="font-semibold text-[var(--ww-ink)] underline">
            support page
          </Link>{" "}
          or the account contact channel associated with your booking or host profile.
        </p>
      </section>

      <section id="guest-terms" className="mt-10 max-w-4xl scroll-mt-24">
        <h2 className="text-2xl font-semibold text-[var(--ww-ink)]">1. Guest Terms</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-celadon)]">
          These terms apply when a guest searches, books, pays for, or stays in a listing on Way Work.
          The guest contract is primarily between the guest and the host, with Way Work operating the
          platform, communications layer, and payment flow unless a booking says otherwise.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-celadon)]">
          {guestTerms.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
          <p className="font-semibold text-[var(--ww-ink)]">Guest booking rules</p>
          <p className="mt-2">
            A guest only completes a booking when checkout is accepted and payment is authorized or
            captured through the applicable payment flow. Cancellation, refund, and no-show rights are
            governed by the listing terms and booking confirmation, subject always to any mandatory
            consumer protections that apply.
          </p>
        </div>
      </section>

      <section id="host-terms" className="mt-10 max-w-4xl scroll-mt-24">
        <h2 className="text-2xl font-semibold text-[var(--ww-ink)]">2. Host Terms</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-celadon)]">
          These terms apply when a host creates, publishes, manages, or receives bookings for a listing
          on Way Work. The host is the merchant of record for the accommodation or stay services unless
          a separate written arrangement states otherwise.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-celadon)]">
          {hostTerms.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
          <p className="font-semibold text-[var(--ww-ink)]">Commission and payout</p>
          <p className="mt-2">
            Unless a signed commercial agreement says otherwise, Way Work deducts its 15% commission,
            plus any applicable processing or tax adjustments disclosed at checkout or in the payout
            summary, before releasing the host&apos;s net payout. Hosts authorize Way Work and its payment
            partners to route guest payments, apply refunds and chargebacks, and pay out the host share
            through the configured payment account.
          </p>
        </div>
      </section>

      <section id="platform-terms" className="mt-10 max-w-4xl scroll-mt-24">
        <h2 className="text-2xl font-semibold text-[var(--ww-ink)]">3. Platform Terms</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--ww-celadon)]">
          {platformTerms.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="disputes" className="mt-10 max-w-4xl scroll-mt-24">
        <h2 className="text-2xl font-semibold text-[var(--ww-ink)]">4. Priority, Governing Law, and Disputes</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-celadon)]">
          For hosts, these terms, together with any signed schedule or commercial addendum, govern the
          contractual relationship with Way Work. For guests, these terms apply together with the
          relevant listing and booking confirmation. If there is any conflict, the more specific
          booking, listing, or addendum terms prevail over these general terms to the extent of the
          conflict.
        </p>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-celadon)]">
          These terms are governed by the laws of England and Wales. Subject to any mandatory consumer
          rights that cannot be contracted out of, the courts of London shall have exclusive jurisdiction
          for disputes arising from the host relationship and, where permitted by law, disputes relating
          to platform use.
        </p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          <p className="font-semibold text-[var(--ww-ink)]">Consumer note</p>
          <p className="mt-2">
            Nothing in these terms is intended to reduce statutory consumer rights. If a guest is
            classified as a consumer under applicable law, mandatory rights and remedies remain available
            to the extent required by law.
          </p>
        </div>
      </section>

      <section id="review" className="mt-10 max-w-4xl scroll-mt-24">
        <h2 className="text-2xl font-semibold text-[var(--ww-ink)]">5. Final Review</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ww-celadon)]">
          This draft is designed to be practical, platform-friendly, and commercially robust, but it is
          not a substitute for bespoke legal review. We should have UK counsel confirm the final version,
          especially the commission mechanics, liability allocation, adjudication wording, and any
          consumer-facing booking language before these terms go live.
        </p>
      </section>
    </div>
  );
}
