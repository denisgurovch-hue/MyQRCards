-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "job_title" TEXT,
    "company_name" TEXT,
    "summary" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "show_email" BOOLEAN NOT NULL DEFAULT false,
    "website_url" TEXT,
    "photo_url" TEXT,
    "slug" TEXT NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'draft',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_links" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "type" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cards_slug_key" ON "cards"("slug");

-- CreateIndex
CREATE INDEX "cards_user_id_idx" ON "cards"("user_id");

-- CreateIndex
CREATE INDEX "cards_user_id_deleted_at_idx" ON "cards"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "card_links_card_id_idx" ON "card_links"("card_id");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_links" ADD CONSTRAINT "card_links_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
