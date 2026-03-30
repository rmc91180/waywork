"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HostPmsProviderTabsProps {
  defaultProvider: "SITEMINDER" | "APALEO";
  activeProviderMode: string;
  children: {
    siteminder: ReactNode;
    apaleo: ReactNode;
  };
}

function formatModeLabel(activeProviderMode: string) {
  if (activeProviderMode === "APALEO") return "Live sync mode: apaleo";
  if (activeProviderMode === "SITEMINDER") return "Live sync mode: SiteMinder";
  if (activeProviderMode === "MEWS") return "Live sync mode: Mews";
  if (activeProviderMode === "NONE") return "Live sync mode: disabled";
  return "Live sync mode: SiteMinder";
}

export function HostPmsProviderTabs({
  defaultProvider,
  activeProviderMode,
  children,
}: HostPmsProviderTabsProps) {
  return (
    <Tabs defaultValue={defaultProvider} className="gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Choose your PMS</p>
            <p className="text-sm text-slate-600">
              Pick the platform you use, then enter credentials and map your live inventory.
            </p>
          </div>
          <Badge variant="outline">{formatModeLabel(activeProviderMode)}</Badge>
        </div>

        <TabsList className="mt-4 h-auto w-full rounded-2xl bg-slate-100 p-1 sm:w-auto">
          <TabsTrigger value="SITEMINDER" className="rounded-xl px-4 py-2 data-[state=active]:bg-white">
            SiteMinder
          </TabsTrigger>
          <TabsTrigger value="APALEO" className="rounded-xl px-4 py-2 data-[state=active]:bg-white">
            apaleo
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="SITEMINDER">{children.siteminder}</TabsContent>
      <TabsContent value="APALEO">{children.apaleo}</TabsContent>
    </Tabs>
  );
}
