-- Create enum for persisted saved view surfaces.
CREATE TYPE "SavedViewSurface" AS ENUM ('COURSES', 'TIMETABLE');

-- Persisted user-scoped saved views by workspace + surface.
CREATE TABLE "SavedView" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "surface" "SavedViewSurface" NOT NULL,
  "name" TEXT NOT NULL,
  "stateJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedView_userId_workspaceId_surface_name_key"
  ON "SavedView"("userId", "workspaceId", "surface", "name");

CREATE INDEX "SavedView_userId_workspaceId_surface_updatedAt_idx"
  ON "SavedView"("userId", "workspaceId", "surface", "updatedAt");

ALTER TABLE "SavedView"
  ADD CONSTRAINT "SavedView_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedView"
  ADD CONSTRAINT "SavedView_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
