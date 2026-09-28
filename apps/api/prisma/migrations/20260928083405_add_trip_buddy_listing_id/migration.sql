/*
  Warnings:

  - Added the required column `buddyListingId` to the `Trip` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "openToBuddies" BOOLEAN NOT NULL DEFAULT false,
    "buddyNote" TEXT,
    "buddyListingId" TEXT NOT NULL,
    "attachedAccommodationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trip_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trip_attachedAccommodationId_fkey" FOREIGN KEY ("attachedAccommodationId") REFERENCES "AccommodationListing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("attachedAccommodationId", "buddyNote", "createdAt", "destinationId", "endDate", "id", "name", "openToBuddies", "startDate", "updatedAt") SELECT "attachedAccommodationId", "buddyNote", "createdAt", "destinationId", "endDate", "id", "name", "openToBuddies", "startDate", "updatedAt" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE UNIQUE INDEX "Trip_buddyListingId_key" ON "Trip"("buddyListingId");
CREATE INDEX "Trip_destinationId_idx" ON "Trip"("destinationId");
CREATE INDEX "Trip_attachedAccommodationId_idx" ON "Trip"("attachedAccommodationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
