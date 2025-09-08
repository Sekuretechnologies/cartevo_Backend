-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_customer_id_fkey";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "access_level" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "customer_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UserLogs" (
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

    CONSTRAINT "UserLogs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
