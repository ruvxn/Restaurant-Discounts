-- AlterEnum
ALTER TYPE "public"."BookingStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable
ALTER TABLE "public"."MenuItem"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "isVegetarian" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isVegan" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isGlutenFree" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."BookingItem"
  ADD COLUMN "notes" TEXT;

ALTER TABLE "public"."Booking"
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT;

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_category_idx" ON "public"."MenuItem"("restaurantId", "category");

CREATE INDEX "BookingItem_bookingId_menuItemId_idx" ON "public"."BookingItem"("bookingId", "menuItemId");

CREATE INDEX "Booking_restaurantId_status_startsAt_idx" ON "public"."Booking"("restaurantId", "status", "startsAt");

CREATE INDEX "Booking_customerId_status_startsAt_idx" ON "public"."Booking"("customerId", "status", "startsAt");

CREATE INDEX "AcceptedDiscount_restaurantId_time_idx" ON "public"."AcceptedDiscount"("restaurantId", "time");
