-- AlterEnum
ALTER TYPE "FeeType" ADD VALUE 'RANGE';

-- AlterTable
ALTER TABLE "transaction_fees" ADD COLUMN     "range_max" DECIMAL(15,2),
ADD COLUMN     "range_min" DECIMAL(15,2);
