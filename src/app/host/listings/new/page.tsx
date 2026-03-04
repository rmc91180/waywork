import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ListingWizard } from "@/components/host/listing-wizard";

export const metadata = {
  title: "Create Listing",
};

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fhost");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create a New Listing</h1>
        <p className="mt-1 text-gray-600">
          List your workspace on WayWork and reach remote professionals.
        </p>
      </div>
      <ListingWizard mode="create" />
    </div>
  );
}
