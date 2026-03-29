-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "company" TEXT,
    "location" TEXT,
    "city" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin_url" TEXT,
    "profile_image" TEXT,
    "bio" TEXT,
    "connectionCount" TEXT,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "saved_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'NEW'
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_linkedin_url_key" ON "Lead"("linkedin_url");
