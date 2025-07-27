/*
  Warnings:

  - The values [PURCHASE,REFUND] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `card_number` on the `cards` table. All the data in the column will be lost.
  - You are about to drop the column `card_type` on the `cards` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `cards` table. All the data in the column will be lost.
  - You are about to drop the column `cvv` on the `cards` table. All the data in the column will be lost.
  - You are about to drop the column `expiry_date` on the `cards` table. All the data in the column will be lost.
  - You are about to drop the column `external_id` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `balance_after` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `balance_before` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `card_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `reference_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[number]` on the table `cards` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invitation_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `number` to the `cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date_of_birth` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `identification_number` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `number` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone_country_code` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone_number` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postal_code` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `street` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `card_balance_after` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `card_balance_before` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_card` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wallet_balance_after` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wallet_balance_before` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "IdentificationType" AS ENUM ('NIN', 'PASSPORT', 'VOTERS_CARD', 'DRIVERS_LICENSE');

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('CREATE', 'FUND', 'WITHDRAW', 'FREEZE', 'TERMINATE');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_card_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_company_id_fkey";

-- DropIndex
DROP INDEX "cards_card_number_key";

-- DropIndex
DROP INDEX "transactions_reference_id_key";

-- AlterTable
ALTER TABLE "cards" DROP COLUMN "card_number",
DROP COLUMN "card_type",
DROP COLUMN "currency",
DROP COLUMN "cvv",
DROP COLUMN "expiry_date",
ADD COLUMN     "number" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "card_fund_rate" DECIMAL(5,4) NOT NULL DEFAULT 1.02,
ADD COLUMN     "card_price" DECIMAL(10,2) NOT NULL DEFAULT 5.00;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "external_id",
DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "country" TEXT NOT NULL,
ADD COLUMN     "date_of_birth" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "identification_number" TEXT NOT NULL,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "number" TEXT NOT NULL,
ADD COLUMN     "phone_country_code" TEXT NOT NULL,
ADD COLUMN     "phone_number" TEXT NOT NULL,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "postal_code" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "street" TEXT NOT NULL,
ADD COLUMN     "type" "IdentificationType" NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "balance_after",
DROP COLUMN "balance_before",
DROP COLUMN "card_id",
DROP COLUMN "company_id",
DROP COLUMN "description",
DROP COLUMN "reference_id",
DROP COLUMN "status",
DROP COLUMN "updated_at",
ADD COLUMN     "card_balance_after" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "card_balance_before" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "id_card" TEXT NOT NULL,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "wallet_balance_after" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "wallet_balance_before" DECIMAL(15,2) NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_active",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "invitation_code" TEXT,
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otp_expires" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "step" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "full_name" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- DropEnum
DROP TYPE "CardType";

-- DropEnum
DROP TYPE "TransactionStatus";

-- CreateIndex
CREATE UNIQUE INDEX "cards_number_key" ON "cards"("number");

-- CreateIndex
CREATE UNIQUE INDEX "users_invitation_code_key" ON "users"("invitation_code");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_id_card_fkey" FOREIGN KEY ("id_card") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
