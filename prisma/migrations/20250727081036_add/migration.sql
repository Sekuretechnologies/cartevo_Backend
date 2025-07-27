-- CreateTable
CREATE TABLE "CustomerLogs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "log_json" JSONB,
    "log_txt" TEXT,
    "action" TEXT,
    "company_id" TEXT,
    "customer_id" TEXT,
    "transaction_id" TEXT,
    "status" TEXT,
    "customer_phone_number" TEXT,

    CONSTRAINT "CustomerLogs_pkey" PRIMARY KEY ("id")
);
