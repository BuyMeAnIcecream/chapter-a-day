-- Add username column (nullable first)
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Migrate existing email values to username (use email as username for existing users)
UPDATE "User" SET "username" = "email" WHERE "username" IS NULL;

-- Make username required and unique
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Drop email column
ALTER TABLE "User" DROP COLUMN "email";
