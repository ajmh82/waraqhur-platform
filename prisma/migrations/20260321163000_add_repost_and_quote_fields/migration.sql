-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "quotedPostId" TEXT,
ADD COLUMN     "repostOfPostId" TEXT;

-- CreateIndex
CREATE INDEX "Post_repostOfPostId_idx" ON "Post"("repostOfPostId");

-- CreateIndex
CREATE INDEX "Post_quotedPostId_idx" ON "Post"("quotedPostId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_repostOfPostId_fkey" FOREIGN KEY ("repostOfPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_quotedPostId_fkey" FOREIGN KEY ("quotedPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

