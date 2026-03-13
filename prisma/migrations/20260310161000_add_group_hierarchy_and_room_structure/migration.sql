-- Add parent/child hierarchy to academic groups.
ALTER TABLE "AcademicGroup"
  ADD COLUMN "parentGroupId" TEXT;

ALTER TABLE "AcademicGroup"
  ADD CONSTRAINT "AcademicGroup_parentGroupId_fkey"
  FOREIGN KEY ("parentGroupId") REFERENCES "AcademicGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AcademicGroup_workspaceId_parentGroupId_idx"
  ON "AcademicGroup"("workspaceId", "parentGroupId");

-- Add structured room fields.
ALTER TABLE "Room"
  ADD COLUMN "buildingCode" TEXT,
  ADD COLUMN "roomNumber" TEXT,
  ADD COLUMN "level" INTEGER;

CREATE INDEX "Room_workspaceId_buildingCode_roomNumber_idx"
  ON "Room"("workspaceId", "buildingCode", "roomNumber");
