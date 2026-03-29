CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "listingId" TEXT,
  "bookingId" TEXT,
  "sessionId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "path" TEXT,
  "search" TEXT,
  "userAgent" TEXT,
  "referrer" TEXT,
  "properties" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_event_createdAt_idx"
  ON "AnalyticsEvent"("event", "createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_createdAt_idx"
  ON "AnalyticsEvent"("sessionId", "createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_listingId_createdAt_idx"
  ON "AnalyticsEvent"("listingId", "createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_bookingId_createdAt_idx"
  ON "AnalyticsEvent"("bookingId", "createdAt");

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_userId_createdAt_idx"
  ON "AnalyticsEvent"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_userId_fkey'
  ) THEN
    ALTER TABLE "AnalyticsEvent"
      ADD CONSTRAINT "AnalyticsEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_listingId_fkey'
  ) THEN
    ALTER TABLE "AnalyticsEvent"
      ADD CONSTRAINT "AnalyticsEvent_listingId_fkey"
      FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_bookingId_fkey'
  ) THEN
    ALTER TABLE "AnalyticsEvent"
      ADD CONSTRAINT "AnalyticsEvent_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
