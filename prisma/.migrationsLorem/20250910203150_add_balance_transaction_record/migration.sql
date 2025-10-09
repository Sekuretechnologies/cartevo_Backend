-- CreateTable
CREATE TABLE "balance_transaction_records" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "new_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount_changed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "change_type" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_transaction_records_pkey" PRIMARY KEY ("id")
);
