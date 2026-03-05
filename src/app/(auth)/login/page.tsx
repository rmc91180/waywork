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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("/search");

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const providers = await getProviders();
        if (!mounted) return;
        const ids = providers ? Object.keys(providers) : [];
        setProviderIds(ids);
      } catch {
        if (!mounted) return;
        setProviderError("Unable to load sign-in methods right now.");
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
    if (raw && raw.startsWith("/")) {
      setCallbackUrl(raw);
    }
  }, []);

  const { hasGoogleOAuth, hasMagicLink, hasCredentials, hasAnyEmailMethod, isDemoMode } =
    useMemo(() => {
      const hasGoogle = providerIds.includes("google");
      const hasResend = providerIds.includes("resend");
      const hasCreds = providerIds.includes("credentials");
      const hasEmailMethod = hasResend || hasCreds;
      return {
        hasGoogleOAuth: hasGoogle,
        hasMagicLink: hasResend,
        hasCredentials: hasCreds,
        hasAnyEmailMethod: hasEmailMethod,
        isDemoMode: hasCreds && !hasResend && !hasGoogle,
      };
    }, [providerIds]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      if (hasMagicLink) {
        await signIn("resend", { email, callbackUrl });
      } else if (hasCredentials) {
        await signIn("credentials", { email, callbackUrl });
      } else {
        toast.error("No email sign-in method is enabled.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    if (!hasCredentials) return;
    setLoading(true);
    try {
      await signIn("credentials", {
        email: "demo@waywork.com",
        callbackUrl,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-slate-200 bg-white/95 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-[var(--ww-primary-blue)]">Welcome back</CardTitle>
        <CardDescription className="text-[var(--ww-text-primary)]">
          Sign in to continue your next work wonder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {providerError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {providerError}
          </div>
        )}

        {hasGoogleOAuth && (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => signIn("google", { callbackUrl })}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-500">
                or
              </span>
            </div>
          </>
        )}

        {isDemoMode && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="mb-3 text-sm font-medium text-emerald-900">
              Preview Mode — Try WayWork with a demo account
            </p>
            <Button
              className="w-full bg-[var(--ww-primary-blue)] text-white hover:bg-[var(--ww-secondary-green)]"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in as Demo User"}
            </Button>
          </div>
        )}

        {!providersLoaded ? (
          <p className="text-sm text-slate-600">Loading sign-in methods...</p>
        ) : hasAnyEmailMethod ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              variant={hasGoogleOAuth ? "default" : "outline"}
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : hasMagicLink
                  ? "Send Magic Link"
                  : "Sign in with Email"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-slate-600">
            Email sign-in is currently unavailable. Contact support to enable an auth provider.
          </p>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-[var(--ww-primary-blue)] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
