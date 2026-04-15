import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getConnectStatus, getPayoutSettings } from "@/actions/stripe-connect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectActions } from "@/components/host/connect-actions";
import { HostPageHeader } from "@/components/host/host-page-header";
import { PayoutSettingsForm } from "@/components/host/payout-settings-form";

export const metadata = {
  title: "Payouts",
};

interface Props {
  searchParams: Promise<{ onboarding?: string }>;
}

export default async function PayoutsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fhost");

  if (session.user.id === "demo-host") {
    return (
      <div className="waywork-shell max-w-5xl py-8 md:py-10">
        <HostPageHeader
          eyebrow="Host workspace"
          title="Payouts"
          description="Demo payout settings stay visible even when the connected account is not live."
        />
        <Card className="mt-6 mb-6 border-slate-200/80 bg-white/95">
          <CardHeader>
            <CardTitle>Stripe Connect</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Demo host payout setup is available for smoke testing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const params = await searchParams;
  const status = await getConnectStatus();
  const payoutSettings = await getPayoutSettings();

  const showOnboardingComplete = params.onboarding === "complete";
  const showOnboardingRefresh = params.onboarding === "refresh";

  return (
    <div className="waywork-shell max-w-5xl py-8 md:py-10">
      <HostPageHeader
        eyebrow="Host workspace"
        title="Payouts"
        description="Connect Stripe once, set your default split, and keep payouts moving."
      />

      {/* Status Banner */}
      {showOnboardingComplete && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-green-800 font-medium">
            Stripe onboarding complete! Your account is being verified.
          </p>
        </div>
      )}

      {showOnboardingRefresh && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-yellow-800 font-medium">
            Your onboarding session expired. Please try again.
          </p>
        </div>
      )}

      <Card className="mt-6 mb-6 border-slate-200/80 bg-white/95">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stripe Connect</CardTitle>
            {status.isOnboarded ? (
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            ) : status.hasAccount ? (
              <Badge className="bg-yellow-100 text-yellow-800">
                Pending Verification
              </Badge>
            ) : (
              <Badge variant="outline">Not Connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {status.isOnboarded ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Your Stripe account is active and ready to receive payouts.
                Earnings from bookings will be automatically transferred to your
                connected bank account.
              </p>
              <ConnectActions hasAccount={true} isOnboarded={true} />
            </div>
          ) : status.hasAccount ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Your Stripe account has been created but onboarding is not yet
                complete. Please finish setting up your account to start
                receiving payouts.
              </p>
              <ConnectActions hasAccount={true} isOnboarded={false} />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                To receive payouts from your bookings, you need to connect a
                Stripe account. This allows us to securely transfer earnings
                directly to your bank account.
              </p>
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-gray-600">
                Bank account, ID verification, and tax information are typically required.
              </div>
              <ConnectActions hasAccount={false} isOnboarded={false} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 border-slate-200/80 bg-white/95">
        <CardHeader>
          <CardTitle>Default Payout Split</CardTitle>
        </CardHeader>
        <CardContent>
          <PayoutSettingsForm
            defaultBookingCommissionPercent={payoutSettings.defaultBookingCommissionPercent}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/95">
        <CardHeader>
          <CardTitle>How Payouts Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm text-gray-600 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Guest books your space</p>
                <p>Payment is collected and held securely by Stripe.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Booking is completed</p>
                <p>After the guest checks out, the payout is initiated.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Funds arrive</p>
                <p>
                  Payouts typically arrive in your bank account within 2-7
                  business days, depending on your country.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
