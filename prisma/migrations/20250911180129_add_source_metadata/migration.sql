-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "filePath" TEXT,
    "repoOwner" TEXT,
    "repoName" TEXT,
    "branch" TEXT,
    "pathGlob" TEXT,
    "lastImportedAt" DATETIME,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Source" ("branch", "createdAt", "filePath", "id", "lastImportedAt", "pathGlob", "repoName", "repoOwner", "type", "updatedAt", "url") SELECT "branch", "createdAt", "filePath", "id", "lastImportedAt", "pathGlob", "repoName", "repoOwner", "type", "updatedAt", "url" FROM "Source";
DROP TABLE "Source";
ALTER TABLE "new_Source" RENAME TO "Source";
CREATE INDEX "Source_type_idx" ON "Source"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
