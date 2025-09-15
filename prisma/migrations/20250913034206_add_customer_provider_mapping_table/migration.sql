-- CreateTable
CREATE TABLE "customer_provider_mappings" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "provider_customer_id" TEXT NOT NULL,
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_provider_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_provider_mappings_customer_id_provider_name_key" ON "customer_provider_mappings"("customer_id", "provider_name");

-- AddForeignKey
ALTER TABLE "customer_provider_mappings" ADD CONSTRAINT "customer_provider_mappings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
