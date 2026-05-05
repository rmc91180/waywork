"use client";

import { useState, useTransition } from "react";
import { addListingManager, removeListingManager } from "@/actions/host-team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TeamMemberView {
  userId: string;
  name: string | null;
  email: string;
  role: "OWNER" | "MANAGER";
}

interface ListingTeamView {
  listingId: string;
  title: string;
  ownerName: string | null;
  managers: TeamMemberView[];
}

interface HostTeamAccessPanelProps {
  listings: ListingTeamView[];
}

export function HostTeamAccessPanel({ listings }: HostTeamAccessPanelProps) {
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-celadon)]">
            Host Team Access
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--ww-ink)]">
            Listing Roles
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Owners have full control. Managers can update listing content and operations, but cannot
            publish or change payout settings.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {listings.length === 0 ? (
          <p className="text-sm text-slate-600">Create your first listing to assign managers.</p>
        ) : (
          listings.map((listing) => (
            <article key={listing.listingId} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{listing.title}</p>
                  <p className="text-xs text-slate-500">Owner: {listing.ownerName || "Host"}</p>
                </div>
                <Badge variant="outline">{listing.managers.length} manager(s)</Badge>
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="manager@example.com"
                  value={emails[listing.listingId] || ""}
                  onChange={(event) =>
                    setEmails((current) => ({
                      ...current,
                      [listing.listingId]: event.target.value,
                    }))
                  }
                />
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const email = (emails[listing.listingId] || "").trim();
                    if (!email) {
                      toast.error("Enter a manager email.");
                      return;
                    }

                    startTransition(async () => {
                      try {
                        await addListingManager(listing.listingId, email);
                        toast.success("Manager access granted.");
                        setEmails((current) => ({ ...current, [listing.listingId]: "" }));
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to add manager.");
                      }
                    });
                  }}
                >
                  Add Manager
                </Button>
              </div>

              {listing.managers.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {listing.managers.map((member) => (
                    <div
                      key={`${listing.listingId}-${member.userId}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {member.name || member.email}
                        </p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{member.role}</Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              try {
                                await removeListingManager(listing.listingId, member.userId);
                                toast.success("Manager removed.");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to remove manager."
                                );
                              }
                            });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">No managers assigned.</p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
