-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('citizen', 'kiosk_operator', 'admin', 'super_admin');

-- AlterTable
ALTER TABLE "Kiosk" ALTER COLUMN "geolocation" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'citizen';
