-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'PAYIN_TO_PAYOUT';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'PAYOUT_TO_PAYIN';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'WALLET_TO_WALLET';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'EXTERNAL_WITHDRAW';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CROSS_CURRENCY_TRANSFER';

-- CreateTable
CREATE TABLE "transfer_requests" (
    "id" TEXT NOT NULL,
    "from_wallet_id" TEXT NOT NULL,
    "to_wallet_id" TEXT NOT NULL,
    "from_currency" TEXT NOT NULL,
    "to_currency" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "exchange_rate" DECIMAL(15,6),
    "converted_amount" DECIMAL(15,2),
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_withdrawals" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "fee_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "phone_number" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_FUNDS',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "error_message" TEXT,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "transaction_id" TEXT,

    CONSTRAINT "pending_withdrawals_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "payin_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "payin_balance" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "payout_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "payout_balance" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_from_wallet_id_fkey" FOREIGN KEY ("from_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pending_withdrawals" ADD CONSTRAINT "pending_withdrawals_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pending_withdrawals" ADD CONSTRAINT "pending_withdrawals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
