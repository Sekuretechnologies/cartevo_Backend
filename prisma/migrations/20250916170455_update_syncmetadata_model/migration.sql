/*
  Warnings:

  - You are about to drop the column `key` on the `syncmetadata` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `syncmetadata` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[company_id,provider_name,sync_type]` on the table `syncmetadata` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `provider_name` to the `syncmetadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sync_type` to the `syncmetadata` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "syncmetadata" DROP CONSTRAINT "syncmetadata_customer_id_fkey";

-- AlterTable
ALTER TABLE "syncmetadata" DROP COLUMN "key",
DROP COLUMN "value",
ADD COLUMN     "last_sync_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "provider_name" TEXT NOT NULL,
ADD COLUMN     "sync_type" TEXT NOT NULL,
ALTER COLUMN "customer_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "syncmetadata_company_id_provider_name_sync_type_key" ON "syncmetadata"("company_id", "provider_name", "sync_type");

-- AddForeignKey
ALTER TABLE "syncmetadata" ADD CONSTRAINT "syncmetadata_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
