/*
  Warnings:

  - A unique constraint covering the columns `[licenseKey]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "licenseKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_licenseKey_key" ON "organizations"("licenseKey");
