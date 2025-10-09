-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "transaction_id" TEXT,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
