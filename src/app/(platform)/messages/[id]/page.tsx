import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { MessageInput } from "@/components/messaging/message-input";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ThreadPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const userId = session.user.id;

  const thread = await db.messageThread.findUnique({
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
      guest: {
        select: { id: true, name: true, image: true },
      },
      host: {
        select: { id: true, name: true, image: true },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderId: true,
          content: true,
          readAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!thread) notFound();

  // Auth check
  if (thread.guestId !== userId && thread.hostId !== userId) notFound();

  // Mark unread messages as read
  await db.message.updateMany({
    where: {
      threadId: id,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const isGuest = thread.guestId === userId;
  const otherParty = isGuest ? thread.host : thread.guest;
  const listingImage = thread.listing.images[0]?.url;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/messages"
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Back
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherParty.image || undefined} />
            <AvatarFallback>{otherParty.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">
              {otherParty.name || "Unknown"}
            </h1>
            <Link
              href={`/spaces/${thread.listing.id}`}
              className="text-sm text-gray-500 hover:underline truncate block"
            >
              {thread.listing.title}
            </Link>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {thread.type === "BOOKING" ? "Booking" : "Inquiry"}
        </Badge>
      </div>

      {/* Listing context card */}
      <Link href={`/spaces/${thread.listing.id}`}>
        <Card className="p-3 mb-6 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-16 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
              {listingImage ? (
                <img
                  src={listingImage}
                  alt={thread.listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  🏢
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {thread.listing.title}
              </p>
              <p className="text-xs text-gray-500">View listing →</p>
            </div>
          </div>
        </Card>
      </Link>

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {thread.messages.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          thread.messages.map((message, i) => {
            const isMine = message.senderId === userId;
            const sender = isMine
              ? null
              : otherParty;

            // Show date separator
            const showDate =
              i === 0 ||
              format(message.createdAt, "yyyy-MM-dd") !==
                format(thread.messages[i - 1].createdAt, "yyyy-MM-dd");

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">
                      {format(message.createdAt, "EEEE, MMMM d")}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}

                <div
                  className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                >
                  {!isMine && (
                    <Avatar className="h-8 w-8 shrink-0 mt-1">
                      <AvatarImage src={sender?.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {sender?.name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[75%] ${
                      isMine ? "order-first" : ""
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-gray-100 text-gray-900 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <p
                      className={`text-[10px] mt-1 ${
                        isMine ? "text-right" : "text-left"
                      } text-gray-400`}
                    >
                      {format(message.createdAt, "h:mm a")}
                      {isMine && message.readAt && " · Read"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Input */}
      <MessageInput threadId={thread.id} />
    </div>
  );
}
