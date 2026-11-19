-- AlterTable
ALTER TABLE "cards" ADD COLUMN "last_name" TEXT;
ALTER TABLE "cards" ADD COLUMN "first_name" TEXT;
ALTER TABLE "cards" ADD COLUMN "patronymic" TEXT;
ALTER TABLE "cards" ADD COLUMN "show_patronymic" BOOLEAN NOT NULL DEFAULT false;
