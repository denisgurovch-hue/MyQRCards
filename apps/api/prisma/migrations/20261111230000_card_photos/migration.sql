-- CreateTable
CREATE TABLE "card_photos" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_photos_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "cards" ADD COLUMN "photo_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "card_photos_storage_key_key" ON "card_photos"("storage_key");

-- CreateIndex
CREATE INDEX "card_photos_card_id_idx" ON "card_photos"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "cards_photo_id_key" ON "cards"("photo_id");

-- AddForeignKey
ALTER TABLE "card_photos" ADD CONSTRAINT "card_photos_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "card_photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
