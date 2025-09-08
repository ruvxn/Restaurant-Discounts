-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('BOOKED', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."Booking" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "tableId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "partySize" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_restaurantId_startsAt_idx" ON "public"."Booking"("restaurantId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_tableId_startsAt_idx" ON "public"."Booking"("tableId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_customerId_startsAt_idx" ON "public"."Booking"("customerId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_customerId_tableId_startsAt_key" ON "public"."Booking"("customerId", "tableId", "startsAt");

-- CreateIndex
CREATE INDEX "BookingItem_bookingId_idx" ON "public"."BookingItem"("bookingId");

-- AddForeignKey
ALTER TABLE "public"."BookingItem" ADD CONSTRAINT "BookingItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
