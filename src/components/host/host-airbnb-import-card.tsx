"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HostAirbnbImportCard() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
        Listing Bootstrap
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-[var(--ww-primary-blue)]">
        Import from Airbnb
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Paste an Airbnb URL to prefill your Way Work listing wizard and reduce onboarding time.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="https://www.airbnb.com/rooms/..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button
          type="button"
          className="bg-[var(--ww-primary-blue)] text-white hover:bg-[var(--ww-secondary-green)]"
          onClick={() => {
            const next = url.trim();
            router.push(
              next
                ? `/host/listings/new?airbnbUrl=${encodeURIComponent(next)}`
                : "/host/listings/new"
            );
          }}
        >
          Start Listing Draft
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Imported metadata is best-effort. Always verify address, amenities, and pricing before publishing.
      </p>
    </section>
  );
}
