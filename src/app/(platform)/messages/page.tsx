import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { MessageCircleMore } from "lucide-react";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const threads = await db.messageThread.findMany({
    where: {
      OR: [{ guestId: userId }, { hostId: userId }],
    },
    include: {
      listing: {
        select: { id: true, title: true, slug: true },
      },
      guest: {
        select: { id: true, name: true, image: true },
      },
      host: {
        select: { id: true, name: true, image: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
          readAt: true,
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  // Compute unread counts
  const threadsWithMeta = await Promise.all(
    threads.map(async (thread) => {
      const unreadCount = await db.message.count({
        where: {
          threadId: thread.id,
          senderId: { not: userId },
          readAt: null,
        },
      });

      const isGuest = thread.guestId === userId;
      const otherParty = isGuest ? thread.host : thread.guest;
      const lastMessage = thread.messages[0] ?? null;

      return {
        id: thread.id,
        type: thread.type,
        listing: thread.listing,
        otherParty,
        lastMessage,
        unreadCount,
        lastMessageAt: thread.lastMessageAt,
      };
    })
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {threadsWithMeta.length === 0 ? (
        <div className="waywork-section py-16 text-center">
          <MessageCircleMore className="mx-auto mb-4 size-10 text-[var(--ww-celadon)]" />
          <p className="mb-2 text-slate-600">No messages yet</p>
          <p className="text-sm text-slate-500">
            When you message a host or receive an inquiry, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threadsWithMeta.map((thread) => (
            <Link key={thread.id} href={`/messages/${thread.id}`}>
              <Card
                className={`hover:shadow-md transition-shadow ${
                  thread.unreadCount > 0 ? "border-blue-200 bg-blue-50/30" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={thread.otherParty.image || undefined}
                        />
                        <AvatarFallback>
                          {thread.otherParty.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {thread.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`font-medium truncate ${
                            thread.unreadCount > 0 ? "font-semibold" : ""
                          }`}
                        >
                          {thread.otherParty.name || "Unknown"}
                        </h3>
                        <span className="text-xs text-gray-500 shrink-0">
                          {formatDistanceToNow(thread.lastMessageAt, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {thread.listing.title}
                      </p>
                      {thread.lastMessage && (
                        <p
                          className={`text-sm mt-1 truncate ${
                            thread.unreadCount > 0
                              ? "text-gray-900 font-medium"
                              : "text-gray-500"
                          }`}
                        >
                          {thread.lastMessage.senderId === userId && (
                            <span className="text-gray-400">You: </span>
                          )}
                          {thread.lastMessage.content}
                        </p>
                      )}
                    </div>

                    <Badge variant="outline" className="text-xs shrink-0">
                      {thread.type === "BOOKING" ? "Booking" : "Inquiry"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
