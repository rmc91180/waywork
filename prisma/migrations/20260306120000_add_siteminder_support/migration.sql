DO $$
BEGIN
  ALTER TYPE "PmsProvider" ADD VALUE IF NOT EXISTS 'SITEMINDER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PmsConnection"
  ADD COLUMN IF NOT EXISTS "siteminderApiBaseUrl" TEXT NOT NULL DEFAULT 'https://api.siteminder.com',
  ADD COLUMN IF NOT EXISTS "siteminderClientId" TEXT,
  ADD COLUMN IF NOT EXISTS "siteminderClientSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "siteminderPropertyId" TEXT,
  ADD COLUMN IF NOT EXISTS "siteminderWebhookSecret" TEXT;
