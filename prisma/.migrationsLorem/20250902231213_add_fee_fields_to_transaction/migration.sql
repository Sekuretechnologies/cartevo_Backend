-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "amount_with_fee" DECIMAL(15,2),
ADD COLUMN     "fee_amount" DECIMAL(15,2),
ADD COLUMN     "fee_id" TEXT,
ADD COLUMN     "net_amount" DECIMAL(15,2);
