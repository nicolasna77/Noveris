/*
  Warnings:

  - Added the required column `fromTeam` to the `help_request_message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "help_request_message" ADD COLUMN     "fromTeam" BOOLEAN NOT NULL;
