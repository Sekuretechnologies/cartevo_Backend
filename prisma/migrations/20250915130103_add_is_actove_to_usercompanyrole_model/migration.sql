/*
  Warnings:

  - You are about to drop the column `sudo_customer_id` on the `customers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "sudo_customer_id";

-- AlterTable
ALTER TABLE "user_company_roles" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
