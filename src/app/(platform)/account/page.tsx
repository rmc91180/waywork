import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileForm } from "@/components/account/profile-form";
import { SignOutButton } from "@/components/account/sign-out-button";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) redirect("/login");

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const roleBadgeVariant =
    user.role === "ADMIN"
      ? "destructive"
      : user.role === "HOST"
        ? "default"
        : "secondary";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={user.image || undefined}
                  alt={user.name || "User"}
                />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">
                  {user.name || "No name set"}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <Separator className="mb-6" />

            <ProfileForm
              user={{
                id: user.id,
                name: user.name,
                bio: user.bio,
                phone: user.phone,
                linkedinUrl: user.linkedinUrl,
                image: user.image,
              }}
            />
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm">{user.email}</p>
                </div>
                {user.emailVerified ? (
                  <Badge className="bg-green-100 text-green-800">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                    Unverified
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="text-sm capitalize">{user.role.toLowerCase()}</p>
                </div>
                <Badge variant={roleBadgeVariant}>{user.role}</Badge>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-gray-500">
                  Member Since
                </p>
                <p className="text-sm">
                  {format(new Date(user.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sign Out</p>
                <p className="text-sm text-gray-500">
                  Sign out of your account on this device
                </p>
              </div>
              <SignOutButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
