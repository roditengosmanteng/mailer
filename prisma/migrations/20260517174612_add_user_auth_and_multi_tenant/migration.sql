-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "organization" TEXT,
    "domain" TEXT,
    "syntaxValid" BOOLEAN NOT NULL DEFAULT false,
    "mxValid" BOOLEAN,
    "smtpValid" BOOLEAN,
    "aiVerified" BOOLEAN,
    "aiScore" REAL,
    "aiSearchResult" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'import',
    "batchId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Email_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Email" ("address", "aiScore", "aiSearchResult", "aiVerified", "batchId", "createdAt", "domain", "id", "mxValid", "name", "organization", "smtpValid", "source", "status", "syntaxValid", "updatedAt") SELECT "address", "aiScore", "aiSearchResult", "aiVerified", "batchId", "createdAt", "domain", "id", "mxValid", "name", "organization", "smtpValid", "source", "status", "syntaxValid", "updatedAt" FROM "Email";
DROP TABLE "Email";
ALTER TABLE "new_Email" RENAME TO "Email";
CREATE UNIQUE INDEX "Email_address_batchId_key" ON "Email"("address", "batchId");
CREATE TABLE "new_ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fileName" TEXT,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "validCount" INTEGER NOT NULL DEFAULT 0,
    "invalidCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ImportBatch" ("createdAt", "fileName", "id", "invalidCount", "name", "pendingCount", "status", "totalCount", "updatedAt", "validCount") SELECT "createdAt", "fileName", "id", "invalidCount", "name", "pendingCount", "status", "totalCount", "updatedAt", "validCount" FROM "ImportBatch";
DROP TABLE "ImportBatch";
ALTER TABLE "new_ImportBatch" RENAME TO "ImportBatch";
CREATE TABLE "new_ScrapeJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetOrg" TEXT NOT NULL,
    "targetUrl" TEXT,
    "aiProviderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "emailsFound" INTEGER NOT NULL DEFAULT 0,
    "results" TEXT,
    "error" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScrapeJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScrapeJob" ("aiProviderId", "createdAt", "emailsFound", "error", "id", "results", "status", "targetOrg", "targetUrl", "updatedAt") SELECT "aiProviderId", "createdAt", "emailsFound", "error", "id", "results", "status", "targetOrg", "targetUrl", "updatedAt" FROM "ScrapeJob";
DROP TABLE "ScrapeJob";
ALTER TABLE "new_ScrapeJob" RENAME TO "ScrapeJob";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
