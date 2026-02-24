"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SeedDemoDataButton() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    if (!confirm("This will refresh all demo listings, images, and amenities. Continue?")) {
      return;
    }

    setSeeding(true);
    try {
      const response = await fetch("/api/admin/seed-demo-data", {
        method: "POST",
      });

      const payload = (await response.json()) as
        | { error: string }
        | {
            users: number;
            listingsCreated: number;
            listingsUpdated: number;
          };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Failed to seed demo data");
      }

      if ("listingsCreated" in payload) {
        toast.success(
          `Demo data ready: ${payload.listingsCreated} created, ${payload.listingsUpdated} updated`
        );
      }

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to seed demo data");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="w-full justify-start"
      onClick={handleSeed}
      disabled={seeding}
    >
      {seeding ? "Seeding demo data..." : "Seed Demo Data"}
    </Button>
  );
}
