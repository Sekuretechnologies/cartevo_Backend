-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "country_phone_code" TEXT;

-- CreateTable
CREATE TABLE "wallet_phone_numbers" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "country_iso_code" TEXT NOT NULL,
    "country_phone_code" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_phone_operators" (
    "id" TEXT NOT NULL,
    "country_iso_code" TEXT NOT NULL,
    "country_phone_code" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "operator_code" TEXT NOT NULL,
    "operator_name" TEXT NOT NULL,
    "otp_required" BOOLEAN NOT NULL DEFAULT false,
    "ussd_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_phone_operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_phone_numbers_wallet_id_phone_number_key" ON "wallet_phone_numbers"("wallet_id", "phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_phone_operators_country_iso_code_currency_operator_c_key" ON "wallet_phone_operators"("country_iso_code", "currency", "operator_code");

-- AddForeignKey
ALTER TABLE "wallet_phone_numbers" ADD CONSTRAINT "wallet_phone_numbers_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
