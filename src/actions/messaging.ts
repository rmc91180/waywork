"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { createThreadSchema, sendMessageSchema } from "@/lib/validators";
import { z } from "zod";

// ============================================================================
// CREATE THREAD
// ============================================================================

export async function createThread(
  data: z.infer<typeof createThreadSchema>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = createThreadSchema.parse(data);

  return withDbRetry(async (client) => {
    await client.user.upsert({
      where: { id: session.user.id },
      update: {
        email: session.user.email || `${session.user.id}@waywork.local`,
        name: session.user.name || "Way Work User",
        role: (session.user.role as "GUEST" | "HOST" | "ADMIN") || "GUEST",
      },
      create: {
        id: session.user.id,
        email: session.user.email || `${session.user.id}@waywork.local`,
        name: session.user.name || "Way Work User",
        role: (session.user.role as "GUEST" | "HOST" | "ADMIN") || "GUEST",
      },
    });

    // Find the listing to get the host
    const listing = await client.listing.findFirst({
      where: {
        OR: [{ id: parsed.listingId }, { slug: parsed.listingId }],
      },
      select: { id: true, hostId: true },
    });

    if (!listing) {
      throw new Error("Listing not found");
    }

    // Prevent host from messaging themselves
    if (listing.hostId === session.user.id) {
      throw new Error("You cannot send an inquiry to your own listing");
    }

    // Check if an existing thread already exists between this guest and host for this listing
    const existingThread = await client.messageThread.findFirst({
      where: {
        listingId: listing.id,
        guestId: session.user.id,
        hostId: listing.hostId,
      },
    });

    if (existingThread) {
      // Reuse existing thread: add the message to it
      await client.message.create({
        data: {
          threadId: existingThread.id,
          senderId: session.user.id,
          content: parsed.message,
        },
      });

      await client.messageThread.update({
        where: { id: existingThread.id },
        data: { lastMessageAt: new Date() },
      });

      revalidatePath("/messages");
      return { threadId: existingThread.id };
    }

    // Create a new thread with the first message
    const thread = await client.messageThread.create({
      data: {
        listingId: listing.id,
        guestId: session.user.id,
        hostId: listing.hostId,
        type: "INQUIRY",
        lastMessageAt: new Date(),
        messages: {
          create: {
            senderId: session.user.id,
            content: parsed.message,
          },
        },
      },
    });

    revalidatePath("/messages");
    return { threadId: thread.id };
  });
}

// ============================================================================
// SEND MESSAGE
// ============================================================================

export async function sendMessage(
  data: z.infer<typeof sendMessageSchema>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = sendMessageSchema.parse(data);

  // Verify thread exists and user is a participant
  const thread = await db.messageThread.findUnique({
    where: { id: parsed.threadId },
    select: { id: true, guestId: true, hostId: true },
  });

  if (!thread) {
    throw new Error("Thread not found");
  }

  if (thread.guestId !== session.user.id && thread.hostId !== session.user.id) {
    throw new Error("Unauthorized: you are not a participant in this thread");
  }

  // Create the message and update thread's lastMessageAt
  const message = await db.message.create({
    data: {
      threadId: parsed.threadId,
      senderId: session.user.id,
      content: parsed.content,
    },
  });

  await db.messageThread.update({
    where: { id: parsed.threadId },
    data: { lastMessageAt: new Date() },
  });

  revalidatePath("/messages");
  revalidatePath(`/messages/${parsed.threadId}`);

  return message;
}

// ============================================================================
// GET THREADS (inbox)
// ============================================================================

export async function getThreads() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

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

  // Compute unread counts per thread and shape the response
  const threadsWithMeta = await Promise.all(
    threads.map(async (thread) => {
      const unreadCount = await db.message.count({
        where: {
          threadId: thread.id,
          senderId: { not: userId },
          readAt: null,
        },
      });

      // Determine the other party
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
        createdAt: thread.createdAt,
      };
    })
  );

  return threadsWithMeta;
}

// ============================================================================
// GET THREAD (single thread with all messages)
// ============================================================================

export async function getThread(threadId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
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

  if (!thread) {
    throw new Error("Thread not found");
  }

  // Auth check: only participants can view the thread
  if (thread.guestId !== userId && thread.hostId !== userId) {
    throw new Error("Unauthorized: you are not a participant in this thread");
  }

  // Mark all messages from the other party as read
  await db.message.updateMany({
    where: {
      threadId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  // Determine the other party
  const isGuest = thread.guestId === userId;
  const otherParty = isGuest ? thread.host : thread.guest;

  return {
    id: thread.id,
    type: thread.type,
    listing: thread.listing,
    otherParty,
    currentUserId: userId,
    messages: thread.messages,
    createdAt: thread.createdAt,
  };
}

// ============================================================================
// GET UNREAD COUNT
// ============================================================================

export async function getUnreadCount() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Count all unread messages across threads where the user is a participant,
  // but only messages sent by the OTHER party (not by the user themselves)
  const count = await db.message.count({
    where: {
      readAt: null,
      senderId: { not: userId },
      thread: {
        OR: [{ guestId: userId }, { hostId: userId }],
      },
    },
  });

  return count;
}

// ============================================================================
// MARK THREAD READ
// ============================================================================

export async function markThreadRead(threadId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Verify thread exists and user is a participant
  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    select: { id: true, guestId: true, hostId: true },
  });

  if (!thread) {
    throw new Error("Thread not found");
  }

  if (thread.guestId !== userId && thread.hostId !== userId) {
    throw new Error("Unauthorized: you are not a participant in this thread");
  }

  // Mark all messages from the other party as read
  await db.message.updateMany({
    where: {
      threadId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/messages");
  revalidatePath(`/messages/${threadId}`);
}
