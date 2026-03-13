-- CreateTable
CREATE TABLE "WorkspaceAuditEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "actionType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceAuditEntry_workspaceId_createdAt_idx" ON "WorkspaceAuditEntry"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WorkspaceAuditEntry_workspaceId_entityType_entityId_createdAt_idx" ON "WorkspaceAuditEntry"("workspaceId", "entityType", "entityId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "WorkspaceAuditEntry" ADD CONSTRAINT "WorkspaceAuditEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
