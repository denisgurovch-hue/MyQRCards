-- AlterTable
ALTER TABLE "cards" ADD COLUMN "cover_color" TEXT;
ALTER TABLE "cards" ADD COLUMN "cover_image_url" TEXT;
ALTER TABLE "cards" ADD COLUMN "cover_photo_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "cards_cover_photo_id_key" ON "cards"("cover_photo_id");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_cover_photo_id_fkey" FOREIGN KEY ("cover_photo_id") REFERENCES "card_photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
