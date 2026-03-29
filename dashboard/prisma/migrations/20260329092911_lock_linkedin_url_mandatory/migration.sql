/*
  Warnings:

  - Made the column `linkedin_url` on table `Lead` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "company" TEXT,
    "location" TEXT,
    "city" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin_url" TEXT NOT NULL,
    "profile_image" TEXT,
    "bio" TEXT,
    "connectionCount" TEXT,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "saved_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'NEW'
);
INSERT INTO "new_Lead" ("bio", "city", "company", "connectionCount", "designation", "email", "id", "linkedin_url", "location", "name", "notes", "phone", "profile_image", "saved_at", "skills", "status", "tags") SELECT "bio", "city", "company", "connectionCount", "designation", "email", "id", "linkedin_url", "location", "name", "notes", "phone", "profile_image", "saved_at", "skills", "status", "tags" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_linkedin_url_key" ON "Lead"("linkedin_url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
