-- CreateTable
CREATE TABLE "GrainMeetingMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hubspotMeetingId" TEXT NOT NULL,
    "grainMeetingId" TEXT NOT NULL,
    "grainShareUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MagicFormulaTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "teamId" TEXT,
    "ownerId" TEXT,
    "meetingsTarget" INTEGER NOT NULL,
    "qualOppsTarget" INTEGER NOT NULL,
    "conversionsTarget" INTEGER NOT NULL,
    "mrrPerConversion" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GrainMeetingMapping_hubspotMeetingId_key" ON "GrainMeetingMapping"("hubspotMeetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicFormulaTarget_scope_teamId_ownerId_key" ON "MagicFormulaTarget"("scope", "teamId", "ownerId");
