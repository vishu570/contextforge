/*
  Warnings:

  - You are about to drop the column `categoryName` on the `ItemCategory` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `ItemCategory` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT NOT NULL DEFAULT 'folder',
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ItemCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "source" TEXT NOT NULL DEFAULT 'user_assigned',
    "aiProvider" TEXT,
    "reasoning" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemCategory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ItemCategory" ("aiProvider", "approvedAt", "approvedBy", "confidence", "createdAt", "id", "isApproved", "itemId", "reasoning", "source", "userId") SELECT "aiProvider", "approvedAt", "approvedBy", "confidence", "createdAt", "id", "isApproved", "itemId", "reasoning", "source", "userId" FROM "ItemCategory";
DROP TABLE "ItemCategory";
ALTER TABLE "new_ItemCategory" RENAME TO "ItemCategory";
CREATE INDEX "ItemCategory_userId_idx" ON "ItemCategory"("userId");
CREATE INDEX "ItemCategory_itemId_idx" ON "ItemCategory"("itemId");
CREATE INDEX "ItemCategory_categoryId_idx" ON "ItemCategory"("categoryId");
CREATE INDEX "ItemCategory_confidence_idx" ON "ItemCategory"("confidence");
CREATE INDEX "ItemCategory_source_idx" ON "ItemCategory"("source");
CREATE UNIQUE INDEX "ItemCategory_itemId_categoryId_key" ON "ItemCategory"("itemId", "categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_userId_key" ON "Category"("name", "userId");
