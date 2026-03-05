-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'HOST', 'ADMIN');

-- CreateEnum
CREATE TYPE "HostTeamRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('PRIVATE_OFFICE', 'STUDIO', 'MEETING_ROOM', 'HOME_OFFICE', 'HYBRID_SPACE');

-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT');

-- CreateEnum
CREATE TYPE "BedSize" AS ENUM ('TWIN', 'DOUBLE', 'QUEEN', 'KING');

-- CreateEnum
CREATE TYPE "PmsProvider" AS ENUM ('MEWS');

-- CreateEnum
CREATE TYPE "PmsSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "PmsSyncDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "DailyRateSource" AS ENUM ('MANUAL', 'PMS');

-- CreateEnum
CREATE TYPE "AmenityCategory" AS ENUM ('DESK', 'MONITOR', 'MEETING', 'CONNECTIVITY', 'ERGONOMICS', 'QUIET', 'AV', 'KITCHEN', 'BATHROOM', 'PARKING', 'OTHER');

-- CreateEnum
CREATE TYPE "NetworkType" AS ENUM ('WIFI', 'WIRED', 'BOTH');

-- CreateEnum
CREATE TYPE "BlockedDateSource" AS ENUM ('MANUAL', 'ICAL', 'BOOKING', 'PMS');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED_BY_GUEST', 'CANCELLED_BY_HOST', 'COMPLETED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PmsSyncJobType" AS ENUM ('BOOKING_UPSERT', 'BOOKING_CANCEL', 'REQUEST_ARI_UPDATE');

-- CreateEnum
CREATE TYPE "PmsSyncJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'FAILED', 'DEAD_LETTER', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('INVITED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ReviewTargetType" AS ENUM ('LISTING', 'GUEST');

-- CreateEnum
CREATE TYPE "ThreadType" AS ENUM ('INQUIRY', 'BOOKING');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "bio" TEXT,
    "linkedinUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'GUEST',
    "stripeCustomerId" TEXT,
    "stripeConnectAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "workspaceType" "WorkspaceType" NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "postalCode" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "maxGuests" INTEGER NOT NULL DEFAULT 1,
    "bedroomCount" INTEGER NOT NULL DEFAULT 1,
    "bedSize" "BedSize" NOT NULL DEFAULT 'QUEEN',
    "propertySizeSqm" INTEGER,
    "pricePerDay" INTEGER NOT NULL,
    "cleaningFee" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "hasJacuzzi" BOOLEAN NOT NULL DEFAULT false,
    "hasSwimmingPool" BOOLEAN NOT NULL DEFAULT false,
    "hasBackyard" BOOLEAN NOT NULL DEFAULT false,
    "hasPingPongTable" BOOLEAN NOT NULL DEFAULT false,
    "hasPoolTable" BOOLEAN NOT NULL DEFAULT false,
    "cancellationPolicy" "CancellationPolicy" NOT NULL DEFAULT 'FLEXIBLE',
    "workScore" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "icalUrl" TEXT,
    "icalLastSyncAt" TIMESTAMP(3),
    "pmsConnectionId" TEXT,
    "pmsExternalListingId" TEXT,
    "pmsExternalRatePlanId" TEXT,
    "pmsLastSyncedAt" TIMESTAMP(3),
    "pmsSyncStatus" "PmsSyncStatus" NOT NULL DEFAULT 'PENDING',
    "pmsSyncError" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingTeamMember" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "HostTeamRole" NOT NULL DEFAULT 'MANAGER',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingActivity" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER,
    "distanceKm" DOUBLE PRECISION,
    "indoor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ListingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingImage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingAmenity" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "category" "AmenityCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ListingAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectivityProfile" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "declaredDownloadMbps" DOUBLE PRECISION NOT NULL,
    "declaredUploadMbps" DOUBLE PRECISION NOT NULL,
    "networkType" "NetworkType" NOT NULL DEFAULT 'WIFI',
    "speedTestScreenshotUrl" TEXT,
    "speedTestDate" TIMESTAMP(3),
    "hasBackupConnection" BOOLEAN NOT NULL DEFAULT false,
    "backupType" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConnectivityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedDate" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "source" "BlockedDateSource" NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "numberOfDays" INTEGER NOT NULL,
    "numberOfGuests" INTEGER NOT NULL DEFAULT 1,
    "subtotal" INTEGER NOT NULL,
    "cleaningFee" INTEGER NOT NULL DEFAULT 0,
    "serviceFee" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "hostPayout" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "pmsExternalReservationId" TEXT,
    "pmsLastSyncedAt" TIMESTAMP(3),
    "pmsSyncStatus" "PmsSyncStatus" NOT NULL DEFAULT 'PENDING',
    "pmsSyncError" TEXT,
    "specialRequests" TEXT,
    "calendarEventSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmsConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PmsProvider" NOT NULL DEFAULT 'MEWS',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mewsApiBaseUrl" TEXT NOT NULL DEFAULT 'https://api.mews.com',
    "mewsClientToken" TEXT,
    "mewsConnectionToken" TEXT,
    "mewsAccessToken" TEXT,
    "mewsEnterpriseId" TEXT,
    "mewsClientName" TEXT NOT NULL DEFAULT 'WayWork PMS Sync/1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmsConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingDailyRate" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "pricePerDay" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" "DailyRateSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingDailyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmsSyncEvent" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "listingId" TEXT,
    "bookingId" TEXT,
    "direction" "PmsSyncDirection" NOT NULL,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "messageId" TEXT,
    "error" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PmsSyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmsSyncJob" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "listingId" TEXT,
    "bookingId" TEXT,
    "type" "PmsSyncJobType" NOT NULL,
    "status" "PmsSyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmsSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAttendee" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" "AttendeeStatus" NOT NULL DEFAULT 'INVITED',

    CONSTRAINT "BookingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "listingId" TEXT,
    "targetType" "ReviewTargetType" NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "wifiAccuracy" INTEGER,
    "quietness" INTEGER,
    "deskSetup" INTEGER,
    "cleanliness" INTEGER,
    "comment" TEXT,
    "hostResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "bookingId" TEXT,
    "guestId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "type" "ThreadType" NOT NULL DEFAULT 'INQUIRY',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeConnectAccountId_key" ON "User"("stripeConnectAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_city_idx" ON "Listing"("city");

-- CreateIndex
CREATE INDEX "Listing_country_idx" ON "Listing"("country");

-- CreateIndex
CREATE INDEX "Listing_workspaceType_idx" ON "Listing"("workspaceType");

-- CreateIndex
CREATE INDEX "Listing_workScore_idx" ON "Listing"("workScore");

-- CreateIndex
CREATE INDEX "Listing_pricePerDay_idx" ON "Listing"("pricePerDay");

-- CreateIndex
CREATE INDEX "Listing_lat_lng_idx" ON "Listing"("lat", "lng");

-- CreateIndex
CREATE INDEX "Listing_pmsConnectionId_idx" ON "Listing"("pmsConnectionId");

-- CreateIndex
CREATE INDEX "Listing_pmsExternalListingId_idx" ON "Listing"("pmsExternalListingId");

-- CreateIndex
CREATE INDEX "ListingTeamMember_userId_idx" ON "ListingTeamMember"("userId");

-- CreateIndex
CREATE INDEX "ListingTeamMember_listingId_idx" ON "ListingTeamMember"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingTeamMember_listingId_userId_key" ON "ListingTeamMember"("listingId", "userId");

-- CreateIndex
CREATE INDEX "ListingActivity_listingId_idx" ON "ListingActivity"("listingId");

-- CreateIndex
CREATE INDEX "ListingActivity_category_idx" ON "ListingActivity"("category");

-- CreateIndex
CREATE INDEX "ListingImage_listingId_idx" ON "ListingImage"("listingId");

-- CreateIndex
CREATE INDEX "ListingAmenity_listingId_idx" ON "ListingAmenity"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectivityProfile_listingId_key" ON "ConnectivityProfile"("listingId");

-- CreateIndex
CREATE INDEX "AvailabilityRule_listingId_idx" ON "AvailabilityRule"("listingId");

-- CreateIndex
CREATE INDEX "BlockedDate_listingId_idx" ON "BlockedDate"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_listingId_date_key" ON "BlockedDate"("listingId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_stripePaymentIntentId_key" ON "Booking"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_pmsExternalReservationId_key" ON "Booking"("pmsExternalReservationId");

-- CreateIndex
CREATE INDEX "Booking_guestId_idx" ON "Booking"("guestId");

-- CreateIndex
CREATE INDEX "Booking_listingId_idx" ON "Booking"("listingId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_checkIn_idx" ON "Booking"("checkIn");

-- CreateIndex
CREATE INDEX "PmsConnection_provider_enabled_idx" ON "PmsConnection"("provider", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "PmsConnection_userId_provider_key" ON "PmsConnection"("userId", "provider");

-- CreateIndex
CREATE INDEX "ListingDailyRate_listingId_date_idx" ON "ListingDailyRate"("listingId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ListingDailyRate_listingId_date_key" ON "ListingDailyRate"("listingId", "date");

-- CreateIndex
CREATE INDEX "PmsSyncEvent_connectionId_createdAt_idx" ON "PmsSyncEvent"("connectionId", "createdAt");

-- CreateIndex
CREATE INDEX "PmsSyncEvent_listingId_createdAt_idx" ON "PmsSyncEvent"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "PmsSyncEvent_bookingId_createdAt_idx" ON "PmsSyncEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "PmsSyncJob_status_nextAttemptAt_idx" ON "PmsSyncJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "PmsSyncJob_connectionId_status_idx" ON "PmsSyncJob"("connectionId", "status");

-- CreateIndex
CREATE INDEX "PmsSyncJob_listingId_status_idx" ON "PmsSyncJob"("listingId", "status");

-- CreateIndex
CREATE INDEX "PmsSyncJob_bookingId_status_idx" ON "PmsSyncJob"("bookingId", "status");

-- CreateIndex
CREATE INDEX "BookingAttendee_bookingId_idx" ON "BookingAttendee"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingAttendee_bookingId_email_key" ON "BookingAttendee"("bookingId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_listingId_idx" ON "Review"("listingId");

-- CreateIndex
CREATE INDEX "Review_authorId_idx" ON "Review"("authorId");

-- CreateIndex
CREATE INDEX "MessageThread_guestId_idx" ON "MessageThread"("guestId");

-- CreateIndex
CREATE INDEX "MessageThread_hostId_idx" ON "MessageThread"("hostId");

-- CreateIndex
CREATE INDEX "MessageThread_listingId_idx" ON "MessageThread"("listingId");

-- CreateIndex
CREATE INDEX "Message_threadId_idx" ON "Message"("threadId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_listingId_idx" ON "Favorite"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_listingId_key" ON "Favorite"("userId", "listingId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_pmsConnectionId_fkey" FOREIGN KEY ("pmsConnectionId") REFERENCES "PmsConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingTeamMember" ADD CONSTRAINT "ListingTeamMember_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingTeamMember" ADD CONSTRAINT "ListingTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingTeamMember" ADD CONSTRAINT "ListingTeamMember_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingActivity" ADD CONSTRAINT "ListingActivity_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAmenity" ADD CONSTRAINT "ListingAmenity_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectivityProfile" ADD CONSTRAINT "ConnectivityProfile_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedDate" ADD CONSTRAINT "BlockedDate_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmsConnection" ADD CONSTRAINT "PmsConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingDailyRate" ADD CONSTRAINT "ListingDailyRate_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmsSyncEvent" ADD CONSTRAINT "PmsSyncEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PmsConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmsSyncEvent" ADD CONSTRAINT "PmsSyncEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmsSyncEvent" ADD CONSTRAINT "PmsSyncEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmsSyncJob" ADD CONSTRAINT "PmsSyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PmsConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmsSyncJob" ADD CONSTRAINT "PmsSyncJob_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmsSyncJob" ADD CONSTRAINT "PmsSyncJob_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAttendee" ADD CONSTRAINT "BookingAttendee_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

