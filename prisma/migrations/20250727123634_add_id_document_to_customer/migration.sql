/*
  Warnings:

  - You are about to drop the column `type` on the `customers` table. All the data in the column will be lost.
  - Added the required column `id_document_front` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_document_type` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "type",
ADD COLUMN     "id_document_back" TEXT,
ADD COLUMN     "id_document_front" TEXT NOT NULL,
ADD COLUMN     "id_document_type" TEXT NOT NULL;
