-- CreateEnum
CREATE TYPE "CardEventType" AS ENUM ('card_view', 'contact_click', 'vcard_download');

-- CreateTable
CREATE TABLE "card_events" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "event_type" "CardEventType" NOT NULL,
    "channel" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" DATE NOT NULL,
    "visitor_hash" TEXT,

    CONSTRAINT "card_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_events_card_id_occurred_at_idx" ON "card_events"("card_id", "occurred_at");

-- CreateIndex
CREATE INDEX "card_events_card_id_day_idx" ON "card_events"("card_id", "day");

-- CreateIndex
CREATE INDEX "card_events_event_type_idx" ON "card_events"("event_type");

-- CreateIndex
CREATE INDEX "card_events_channel_idx" ON "card_events"("channel");

-- AddForeignKey
ALTER TABLE "card_events" ADD CONSTRAINT "card_events_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
