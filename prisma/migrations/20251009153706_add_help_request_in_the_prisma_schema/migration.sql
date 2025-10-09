/*
  Warnings:

  - The values [PENDING,FAILED] on the enum `CardStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `completed_at` on the `transactions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "helpRequestStatus" AS ENUM ('PENDING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "helpRequestState" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
BEGIN;
CREATE TYPE "CardStatus_new" AS ENUM ('ACTIVE', 'FROZEN', 'TERMINATED');
ALTER TABLE "cards" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "cards" ALTER COLUMN "status" TYPE "CardStatus_new" USING ("status"::text::"CardStatus_new");
ALTER TYPE "CardStatus" RENAME TO "CardStatus_old";
ALTER TYPE "CardStatus_new" RENAME TO "CardStatus";
DROP TYPE "CardStatus_old";
ALTER TABLE "cards" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "completed_at";

-- CreateTable
CREATE TABLE "helpRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT,
    "status" "helpRequestStatus" NOT NULL DEFAULT 'PENDING',
    "state" "helpRequestState" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "countryCode" TEXT,
    "activity" TEXT,
    "service" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "response" TEXT,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "helpRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "helpRequest" ADD CONSTRAINT "helpRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
