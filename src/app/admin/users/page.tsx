import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { AdminUserRoleSelect } from "@/components/admin/user-role-select";

const roleColors: Record<string, string> = {
  GUEST: "bg-gray-100 text-gray-800",
  HOST: "bg-blue-100 text-blue-800",
  ADMIN: "bg-purple-100 text-purple-800",
};

interface Props {
  searchParams: Promise<{ search?: string; role?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const search = params.search || "";
  const roleFilter = params.role || "";
  const page = parseInt(params.page || "1", 10);
  const perPage = 20;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (roleFilter) {
    where.role = roleFilter;
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where: where as any,
      include: {
        _count: {
          select: { listings: true, bookings: true, reviewsWritten: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.user.count({ where: where as any }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Link href="/admin/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Search
              </label>
              <input
                name="search"
                type="text"
                defaultValue={search}
                placeholder="Search by name or email..."
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Role
              </label>
              <select
                name="role"
                defaultValue={roleFilter}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Roles</option>
                <option value="GUEST">Guest</option>
                <option value="HOST">Host</option>
                <option value="ADMIN">Admin</option>
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

      {/* Results */}
      <p className="text-sm text-gray-500 mb-3">
        {total} user{total !== 1 ? "s" : ""} found
      </p>

      <div className="space-y-2">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.image || undefined} />
                  <AvatarFallback>
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {user.name || "Unnamed"}
                    </p>
                    <Badge className={roleColors[user.role] || ""}>
                      {user.role}
                    </Badge>
                    {user.emailVerified && (
                      <span className="text-xs text-green-600">Verified</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>

                <div className="flex gap-6 text-center text-xs text-gray-500 shrink-0">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {user._count.listings}
                    </p>
                    <p>Listings</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {user._count.bookings}
                    </p>
                    <p>Bookings</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {user._count.reviewsWritten}
                    </p>
                    <p>Reviews</p>
                  </div>
                </div>

                <div className="text-xs text-gray-400 shrink-0">
                  Joined {format(user.createdAt, "MMM yyyy")}
                </div>

                <AdminUserRoleSelect
                  userId={user.id}
                  currentRole={user.role}
                  isCurrentUser={user.id === session.user.id}
                />
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
              href={`/admin/users?search=${search}&role=${roleFilter}&page=${p}`}
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
