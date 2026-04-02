-- CreateTable
CREATE TABLE "Hub" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plat" TEXT,
    "type" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "startBreakTime" TEXT,
    "endBreakTime" TEXT,
    "multiday" INTEGER,
    "speed" DOUBLE PRECISION,
    "costFactor" DOUBLE PRECISION,
    "tags" TEXT,
    "oddEven" TEXT,
    "minWeight" DOUBLE PRECISION,
    "maxWeight" DOUBLE PRECISION,
    "minVolume" DOUBLE PRECISION,
    "maxVolume" DOUBLE PRECISION,
    "storage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_type" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_mappings" (
    "id" SERIAL NOT NULL,
    "plat" TEXT NOT NULL,
    "mappedType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_usages" (
    "id" SERIAL NOT NULL,
    "hubId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "storageType" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "truck_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DriverToHub" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DriverToHub_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_type_name_key" ON "vehicle_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_mappings_plat_key" ON "vehicle_mappings"("plat");

-- CreateIndex
CREATE UNIQUE INDEX "truck_usages_hubId_date_storageType_vehicleType_key" ON "truck_usages"("hubId", "date", "storageType", "vehicleType");

-- CreateIndex
CREATE INDEX "_DriverToHub_B_index" ON "_DriverToHub"("B");

-- AddForeignKey
ALTER TABLE "_DriverToHub" ADD CONSTRAINT "_DriverToHub_A_fkey" FOREIGN KEY ("A") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DriverToHub" ADD CONSTRAINT "_DriverToHub_B_fkey" FOREIGN KEY ("B") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;
