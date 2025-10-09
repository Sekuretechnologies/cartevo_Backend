/*
  Warnings:

  - You are about to drop the column `card_fund_rate` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `card_price` on the `companies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "companies" DROP COLUMN "card_fund_rate",
DROP COLUMN "card_price",
ADD COLUMN     "webhook_url" TEXT;
