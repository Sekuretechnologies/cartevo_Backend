-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_card_id_fkey";

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "card_balance_after" DROP NOT NULL,
ALTER COLUMN "card_balance_before" DROP NOT NULL,
ALTER COLUMN "wallet_balance_after" DROP NOT NULL,
ALTER COLUMN "wallet_balance_before" DROP NOT NULL,
ALTER COLUMN "card_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
