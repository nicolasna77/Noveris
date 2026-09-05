-- AlterTable
ALTER TABLE "user" ADD COLUMN     "notificationPreferences" JSONB NOT NULL DEFAULT '{}';
