"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
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

const steps = ["Email", "Preferences", "Access"] as const;

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState<"WORKATION" | "TEAM_OFFSITE">("WORKATION");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const hasGoogleOAuth = process.env.NEXT_PUBLIC_HAS_GOOGLE_AUTH === "true";

  async function handleCompleteSignup() {
    if (!email) return;

    setLoading(true);
    window.localStorage.setItem("ww-signup-intent", intent);
    trackEvent({
      event: "signup_completed",
      properties: { method: "magic_link", intent, hasPasswordInput: password.length > 0 },
    });
    await signIn("resend", { email, callbackUrl: "/search?welcome=true" });
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-lg border-slate-200 bg-white/95 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-[var(--ww-primary-blue)]">Sign up free</CardTitle>
        <CardDescription className="text-[var(--ww-text-primary)]">
          Build your account in 3 quick steps and unlock a $20 welcome credit.
        </CardDescription>
        <div className="mt-4 grid grid-cols-3 gap-2" role="list" aria-label="Signup progress">
          {steps.map((label, index) => (
            <div
              key={label}
              role="listitem"
              aria-current={step === index ? "step" : undefined}
              className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                step === index
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
        {hasGoogleOAuth && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              trackEvent({ event: "signup_oauth_clicked", properties: { provider: "google" } });
              void signIn("google", { callbackUrl: "/search?welcome=true" });
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
                setStep(1);
                trackEvent({ event: "signup_step_advanced", properties: { from: 1, to: 2 } });
              }}
              disabled={!email}
            >
              Continue
            </Button>
          </div>
        ) : null}

        {step === 1 ? (
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
            <p className="text-xs text-slate-500">
              We currently send a secure magic link to complete signup.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] hover:brightness-95"
                onClick={handleCompleteSignup}
                disabled={loading}
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
          <Link href="/login" className="text-[var(--ww-primary-blue)] hover:underline">
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
