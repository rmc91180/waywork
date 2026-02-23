import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getConnectStatus } from "@/actions/stripe-connect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectActions } from "@/components/host/connect-actions";

export const metadata = {
  title: "Payouts",
};

interface Props {
  searchParams: Promise<{ onboarding?: string }>;
}

export default async function PayoutsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const status = await getConnectStatus();

  const showOnboardingComplete = params.onboarding === "complete";
  const showOnboardingRefresh = params.onboarding === "refresh";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Payouts</h1>

      {/* Status Banner */}
      {showOnboardingComplete && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            Stripe onboarding complete! Your account is being verified.
          </p>
        </div>
      )}

      {showOnboardingRefresh && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium">
            Your onboarding session expired. Please try again.
          </p>
        </div>
      )}

      {/* Connect Status Card */}
      <Card className="mb-6">
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
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">What you&apos;ll need:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Bank account or debit card for payouts</li>
                  <li>Government-issued ID for verification</li>
                  <li>Tax information (SSN or EIN)</li>
                </ul>
              </div>
              <ConnectActions hasAccount={false} isOnboarded={false} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* How Payouts Work */}
      <Card>
        <CardHeader>
          <CardTitle>How Payouts Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Guest books your space</p>
                <p>Payment is collected and held securely by Stripe.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Booking is completed</p>
                <p>After the guest checks out, the payout is initiated.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
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
