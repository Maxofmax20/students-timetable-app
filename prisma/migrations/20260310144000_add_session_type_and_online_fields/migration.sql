-- Add explicit session typing + online metadata so one course can own many sessions safely.
CREATE TYPE "SessionType" AS ENUM ('LECTURE', 'SECTION', 'LAB', 'ONLINE', 'HYBRID');

ALTER TABLE "SessionEntry"
  ADD COLUMN "type" "SessionType" NOT NULL DEFAULT 'LECTURE',
  ADD COLUMN "onlinePlatform" TEXT,
  ADD COLUMN "onlineLink" TEXT;
