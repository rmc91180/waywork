"use client";

import { useEffect, useMemo, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

const steps = ["Email", "Preferences", "Access"] as const;

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState<"WORKATION" | "TEAM_OFFSITE">("WORKATION");
  const [loading, setLoading] = useState(false);
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("/search?welcome=true");

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const providers = await getProviders();
        if (!mounted) return;
        setProviderIds(providers ? Object.keys(providers) : []);
      } catch {
        if (!mounted) return;
        setProviderError("Unable to load sign-up methods right now.");
      } finally {
        if (mounted) setProvidersLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("callbackUrl");
    if (!raw) return;

    try {
      const parsed = raw.startsWith("/")
        ? new URL(raw, window.location.origin)
        : new URL(raw);
      const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      if (normalized.startsWith("/")) {
        setCallbackUrl(normalized);
      }
    } catch {
      if (raw.startsWith("/")) {
        setCallbackUrl(raw);
      }
    }
  }, []);

  const { hasGoogleOAuth, hasMagicLink, hasCredentials } = useMemo(
    () => ({
      hasGoogleOAuth: providerIds.includes("google"),
      hasMagicLink: providerIds.includes("resend"),
      hasCredentials: providerIds.includes("credentials"),
    }),
    [providerIds]
  );
  const isHostOnboarding = callbackUrl.startsWith("/host");
  const progressSteps = isHostOnboarding ? ["Email", "Access"] : [...steps];
  const progressStepIndex = isHostOnboarding && step === 2 ? 1 : step;

  async function handleCompleteSignup() {
    if (!email) return;

    setLoading(true);
    window.localStorage.setItem("ww-signup-intent", intent);
    trackEvent({
      event: "signup_completed",
      properties: {
        method: hasMagicLink ? "magic_link" : hasCredentials ? "credentials_demo" : "unknown",
        intent,
      },
    });

    try {
      if (hasMagicLink) {
        await signIn("resend", { email, callbackUrl });
        return;
      }
      if (hasCredentials) {
        await signIn("credentials", { email, callbackUrl });
        return;
      }
      toast.error("No signup provider is currently available.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg border-slate-200 bg-white/95 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-[var(--ww-primary-blue)]">Sign up free</CardTitle>
        <CardDescription className="text-[var(--ww-text-primary)]">
          Build your account in {isHostOnboarding ? "2" : "3"} quick steps and unlock a $20 welcome credit.
        </CardDescription>
        <div
          className={`mt-4 grid gap-2 ${isHostOnboarding ? "grid-cols-2" : "grid-cols-3"}`}
          role="list"
          aria-label="Signup progress"
        >
          {progressSteps.map((label, index) => (
            <div
              key={label}
              role="listitem"
              aria-current={progressStepIndex === index ? "step" : undefined}
              className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                progressStepIndex === index
                  ? "border-[var(--ww-secondary-green)] bg-emerald-50 text-[var(--ww-secondary-green)]"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              {index + 1}. {label}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!providersLoaded && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Loading sign-up methods...
          </div>
        )}

        {providerError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {providerError}
          </div>
        )}

        {hasGoogleOAuth && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              trackEvent({ event: "signup_oauth_clicked", properties: { provider: "google" } });
              void signIn("google", { callbackUrl });
            }}
          >
            Continue with Google
          </Button>
        )}

        {step === 0 ? (
          <div className="space-y-3">
            <Label htmlFor="email">Work Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Button
              className="w-full bg-[var(--ww-primary-blue)] text-white hover:bg-[var(--ww-secondary-green)]"
              onClick={() => {
                const nextStep = isHostOnboarding ? 2 : 1;
                setStep(nextStep);
                trackEvent({
                  event: "signup_step_advanced",
                  properties: {
                    from: 1,
                    to: isHostOnboarding ? 3 : 2,
                    mode: isHostOnboarding ? "host" : "guest",
                  },
                });
              }}
              disabled={!email}
            >
              Continue
            </Button>
          </div>
        ) : null}

        {!isHostOnboarding && step === 1 ? (
          <div className="space-y-3">
            <Label>What best describes your next trip?</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-xl border p-3 text-left text-sm ${
                  intent === "WORKATION"
                    ? "border-[var(--ww-secondary-green)] bg-emerald-50"
                    : "border-slate-200"
                }`}
                onClick={() => {
                  setIntent("WORKATION");
                  trackEvent({ event: "signup_intent_selected", properties: { intent: "WORKATION" } });
                }}
              >
                Workation
              </button>
              <button
                type="button"
                className={`rounded-xl border p-3 text-left text-sm ${
                  intent === "TEAM_OFFSITE"
                    ? "border-[var(--ww-secondary-green)] bg-emerald-50"
                    : "border-slate-200"
                }`}
                onClick={() => {
                  setIntent("TEAM_OFFSITE");
                  trackEvent({ event: "signup_intent_selected", properties: { intent: "TEAM_OFFSITE" } });
                }}
              >
                Team Offsite
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                className="bg-[var(--ww-primary-blue)] text-white hover:bg-[var(--ww-secondary-green)]"
                onClick={() => {
                  setStep(2);
                  trackEvent({ event: "signup_step_advanced", properties: { from: 2, to: 3, intent } });
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {hasMagicLink
                ? "We will send a secure magic link to complete signup."
                : hasCredentials
                  ? "Demo mode is enabled. You will be signed in immediately."
                  : "No signup method is configured yet."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStep(isHostOnboarding ? 0 : 1)}>
                Back
              </Button>
              <Button
                className="bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] hover:brightness-95"
                onClick={handleCompleteSignup}
                disabled={loading || !providersLoaded}
              >
                {loading ? "Sending link..." : "Create Account"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-[var(--ww-primary-blue)] hover:underline"
          >
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
