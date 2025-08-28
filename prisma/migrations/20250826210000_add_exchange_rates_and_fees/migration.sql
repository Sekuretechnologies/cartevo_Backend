-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "from_currency" TEXT NOT NULL,
    "to_currency" TEXT NOT NULL,
    "rate" DECIMAL(15,8) NOT NULL,
    "source" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_fees" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "transaction_category" TEXT NOT NULL,
    "country_iso_code" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "fee_percentage" DECIMAL(5,4),
    "fee_fixed" DECIMAL(15,2),
    "type" "FeeType" NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_company_id_from_currency_to_currency_key" ON "exchange_rates"("company_id", "from_currency", "to_currency");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_fees_company_id_transaction_type_transaction_ca_key" ON "transaction_fees"("company_id", "transaction_type", "transaction_category", "country_iso_code", "currency");

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_fees" ADD CONSTRAINT "transaction_fees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
