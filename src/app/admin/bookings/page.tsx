import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import type { Prisma } from "@/generated/prisma";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED_BY_GUEST: "bg-red-100 text-red-800",
  CANCELLED_BY_HOST: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AdminBookingsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const statusFilter = params.status || "";
  const page = parseInt(params.page || "1", 10);
  const perPage = 20;

  const where: Prisma.BookingWhereInput = {};
  if (statusFilter) {
    where.status = statusFilter as Prisma.EnumBookingStatusFilter;
  }

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        listing: {
          select: { id: true, title: true, slug: true },
        },
        guest: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.booking.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Bookings</h1>
        <Link href="/admin/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form className="flex gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Status
              </label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED_BY_GUEST">Cancelled (Guest)</option>
                <option value="CANCELLED_BY_HOST">Cancelled (Host)</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-gray-500 mb-3">
        {total} booking{total !== 1 ? "s" : ""}
      </p>

      {/* Bookings list */}
      <div className="space-y-2">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={booking.guest.image || undefined} />
                  <AvatarFallback>
                    {booking.guest.name?.[0] || "G"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="font-medium hover:underline truncate"
                    >
                      {booking.listing.title}
                    </Link>
                    <Badge className={statusColors[booking.status] || ""}>
                      {booking.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {booking.guest.name || booking.guest.email} ·{" "}
                    {format(new Date(booking.checkIn), "MMM d")} —{" "}
                    {format(new Date(booking.checkOut), "MMM d, yyyy")} ·{" "}
                    {booking.numberOfDays} day{booking.numberOfDays > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-semibold">
                    {formatCurrency(booking.totalPrice)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Host: {formatCurrency(booking.hostPayout)}
                  </p>
                </div>

                <div className="text-xs text-gray-400 shrink-0">
                  {format(booking.createdAt, "MMM d")}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/bookings?status=${statusFilter}&page=${p}`}
              className={`px-3 py-1 rounded text-sm ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
