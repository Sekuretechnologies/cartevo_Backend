/*
  Warnings:

  - You are about to drop the column `country_of_operation` on the `companies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "companies" DROP COLUMN "country_of_operation",
ADD COLUMN     "country_currency" TEXT,
ADD COLUMN     "country_iso_code" TEXT,
ADD COLUMN     "country_phone_code" TEXT,
ALTER COLUMN "country" DROP NOT NULL;
