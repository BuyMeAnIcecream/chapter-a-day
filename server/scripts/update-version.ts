import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const latestVersion = "1.1.0";
  
  const existingVersion = await prisma.appConfig.findUnique({
    where: { key: "version" }
  });
  
  if (!existingVersion) {
    await prisma.appConfig.create({
      data: {
        key: "version",
        value: latestVersion
      }
    });
    console.log(`Created version: ${latestVersion}`);
  } else {
    await prisma.appConfig.update({
      where: { key: "version" },
      data: { value: latestVersion }
    });
    console.log(`Updated version from ${existingVersion.value} to ${latestVersion}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
