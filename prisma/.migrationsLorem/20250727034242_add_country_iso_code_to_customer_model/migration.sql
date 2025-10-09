/*
  Warnings:

  - You are about to drop the column `phone_country_code` on the `customers` table. All the data in the column will be lost.
  - Added the required column `country_iso_code` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country_phone_code` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "phone_country_code",
ADD COLUMN     "country_iso_code" TEXT NOT NULL,
ADD COLUMN     "country_phone_code" TEXT NOT NULL;
