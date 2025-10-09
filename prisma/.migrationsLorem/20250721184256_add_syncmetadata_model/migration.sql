-- CreateTable
CREATE TABLE "syncmetadata" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syncmetadata_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "syncmetadata" ADD CONSTRAINT "syncmetadata_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncmetadata" ADD CONSTRAINT "syncmetadata_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
