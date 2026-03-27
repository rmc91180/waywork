DO $$
BEGIN
  ALTER TYPE "PmsProvider" ADD VALUE IF NOT EXISTS 'APALEO';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS "pmsExternalPropertyId" TEXT,
  ADD COLUMN IF NOT EXISTS "pmsExternalUnitGroupId" TEXT;

CREATE INDEX IF NOT EXISTS "Listing_pmsExternalPropertyId_idx" ON "Listing"("pmsExternalPropertyId");
CREATE INDEX IF NOT EXISTS "Listing_pmsExternalUnitGroupId_idx" ON "Listing"("pmsExternalUnitGroupId");

ALTER TABLE "PmsConnection"
  ADD COLUMN IF NOT EXISTS "apaleoApiBaseUrl" TEXT NOT NULL DEFAULT 'https://api.apaleo.com',
  ADD COLUMN IF NOT EXISTS "apaleoIdentityBaseUrl" TEXT NOT NULL DEFAULT 'https://identity.apaleo.com',
  ADD COLUMN IF NOT EXISTS "apaleoClientId" TEXT,
  ADD COLUMN IF NOT EXISTS "apaleoClientSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "apaleoAccountCode" TEXT,
  ADD COLUMN IF NOT EXISTS "apaleoRefreshToken" TEXT,
  ADD COLUMN IF NOT EXISTS "apaleoAccessTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "apaleoConnectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "apaleoLastTokenRefreshAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "apaleoWebhookSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "apaleoWebhookSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "apaleoAriSubscriptionId" TEXT;
