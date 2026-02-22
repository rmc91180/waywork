import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReviewForm } from "@/components/booking/review-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, alt: true },
          },
        },
      },
      review: true,
    },
  });

  if (!booking) notFound();

  // Only the guest can review
  if (booking.guestId !== session.user.id) notFound();

  // Must be completed
  if (booking.status !== "COMPLETED") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Cannot Review</h1>
        <p className="text-gray-600">
          You can only review a booking after your stay is complete.
        </p>
      </div>
    );
  }

  // Already reviewed
  if (booking.review) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Already Reviewed</h1>
        <p className="text-gray-600">
          You have already submitted a review for this booking.
        </p>
      </div>
    );
  }

  const primaryImage = booking.listing.images[0]?.url;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Leave a Review</h1>
      <p className="text-gray-600 mb-6">
        Share your experience at {booking.listing.title}
      </p>

      {/* Listing context */}
      <div className="flex items-center gap-3 p-4 border rounded-lg mb-8">
        <div className="w-16 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={booking.listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              🏢
            </div>
          )}
        </div>
        <div>
          <p className="font-medium">{booking.listing.title}</p>
          <p className="text-sm text-gray-500">
            Booking #{booking.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <ReviewForm bookingId={booking.id} />
    </div>
  );
}
