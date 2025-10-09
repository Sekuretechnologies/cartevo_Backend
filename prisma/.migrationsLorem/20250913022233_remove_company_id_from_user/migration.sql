/*
  Warnings:

  - You are about to alter the column `old_balance` on the `balance_transaction_records` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `new_balance` on the `balance_transaction_records` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `amount_changed` on the `balance_transaction_records` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to drop the column `company_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_company_id_fkey";

-- DropIndex
DROP INDEX "users_company_id_email_key";

-- AlterTable
ALTER TABLE "balance_transaction_records" ALTER COLUMN "old_balance" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "new_balance" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "amount_changed" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "company_id";

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "balance_transaction_records" ADD CONSTRAINT "balance_transaction_records_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
