-- CreateTable
CREATE TABLE "public"."Restaurant" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "openHour" INTEGER NOT NULL,
    "closeHour" INTEGER NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "googleRating" DOUBLE PRECISION,
    "averageBill" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AcceptedDiscount" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcceptedDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "public"."Restaurant"("slug");

-- CreateIndex
CREATE INDEX "Restaurant_slug_idx" ON "public"."Restaurant"("slug");

-- CreateIndex
CREATE INDEX "AcceptedDiscount_restaurantId_date_idx" ON "public"."AcceptedDiscount"("restaurantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AcceptedDiscount_restaurantId_date_time_key" ON "public"."AcceptedDiscount"("restaurantId", "date", "time");

-- AddForeignKey
ALTER TABLE "public"."AcceptedDiscount" ADD CONSTRAINT "AcceptedDiscount_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
