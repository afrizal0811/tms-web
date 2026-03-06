-- CreateTable
CREATE TABLE `ManualTask` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `driverName` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `soNumber` VARCHAR(191) NOT NULL,
    `flow` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
