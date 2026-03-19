-- AlterEnum
ALTER TYPE "InviteStatus" ADD VALUE 'SENT';

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Invite_issuerUserId_status_idx" ON "Invite"("issuerUserId", "status");
