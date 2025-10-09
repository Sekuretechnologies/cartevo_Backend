-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KybStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "kyb_status" "KybStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "kyc_status" "KycStatus" NOT NULL DEFAULT 'NONE';
