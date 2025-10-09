/*
  Warnings:

  - Added the required column `country` to the `cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country_iso_code` to the `cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cvv` to the `cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiry_month` to the `cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiry_year` to the `cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_card_id` to the `cards` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "bin" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT NOT NULL,
ADD COLUMN     "country_iso_code" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "cvv" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "event_id" TEXT,
ADD COLUMN     "expiry_month" INTEGER NOT NULL,
ADD COLUMN     "expiry_year" INTEGER NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_physical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_virtual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last4" TEXT,
ADD COLUMN     "masked_number" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "provider_card_id" TEXT NOT NULL,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "state_code" TEXT,
ADD COLUMN     "street" TEXT;
