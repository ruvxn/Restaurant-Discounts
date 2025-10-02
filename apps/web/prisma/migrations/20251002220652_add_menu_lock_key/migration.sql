-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "menuLockKey" TEXT;

-- CreateIndex
CREATE INDEX "Booking_restaurantId_startsAt_menuLockKey_idx" ON "public"."Booking"("restaurantId", "startsAt", "menuLockKey");
