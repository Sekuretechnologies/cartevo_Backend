/*
  Warnings:

  - You are about to drop the column `provider_card_metadata` on the `cards` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cards" DROP COLUMN "provider_card_metadata";
