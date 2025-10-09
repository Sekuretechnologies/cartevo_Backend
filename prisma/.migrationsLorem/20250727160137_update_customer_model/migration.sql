/*
  Warnings:

  - You are about to drop the column `image` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `photo` on the `customers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "image",
DROP COLUMN "number",
DROP COLUMN "photo";
