export const metadata = {
  title: "Privacy",
  description: "Way Work privacy policy overview.",
};

export default function PrivacyPage() {
  return (
    <div className="waywork-shell py-12">
      <h1 className="text-4xl font-semibold text-[var(--ww-primary-blue)]">Privacy Policy</h1>
      <div className="mt-6 max-w-3xl space-y-4 text-sm leading-7 text-[var(--ww-text-primary)]">
        <p>
          Way Work collects account, booking, and usage data required to run the platform,
          process reservations, and improve search relevance.
        </p>
        <p>
          We use trusted service providers for payments, analytics, and email delivery. Sensitive
          payment details are processed by PCI-compliant partners and are not stored directly on our
          servers.
        </p>
        <p>
          You can request account access, corrections, or deletion by contacting support through the
          in-app messaging tools or the support page.
        </p>
      </div>
    </div>
  );
}

