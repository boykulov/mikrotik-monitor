-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "heartbeatData" JSONB,
ADD COLUMN     "lastHeartbeat" TIMESTAMP(3);
