/*
  Warnings:

  - You are about to drop the column `id_card` on the `transactions` table. All the data in the column will be lost.
  - Added the required column `card_id` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_id_card_fkey";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "id_card",
ADD COLUMN     "card_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
