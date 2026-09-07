-- CreateTable
CREATE TABLE "help_request_message" (
    "id" TEXT NOT NULL,
    "helpRequestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "help_request_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "help_request_message_helpRequestId_createdAt_idx" ON "help_request_message"("helpRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "help_request_message" ADD CONSTRAINT "help_request_message_helpRequestId_fkey" FOREIGN KEY ("helpRequestId") REFERENCES "help_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_request_message" ADD CONSTRAINT "help_request_message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
