import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getFavorites } from "@/actions/favorite";
import { ListingCard } from "@/components/listings/listing-card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export const metadata = {
  title: "Saved Spaces",
};

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const listings = await getFavorites();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Saved Spaces</h1>
        <p className="text-gray-600 mt-1">
          {listings.length} space{listings.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="waywork-section py-16 text-center">
          <Heart className="mx-auto mb-4 size-10 text-[var(--ww-terra)]" />
          <h3 className="text-lg font-semibold text-slate-900">No saved spaces yet</h3>
          <p className="mt-2 mb-4 text-slate-500">
            When you find a workspace you love, save it here for easy access.
          </p>
          <Button asChild>
            <Link href="/search">Browse Spaces</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
