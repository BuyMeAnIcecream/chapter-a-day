import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.appConfig.findUnique({
    where: { key: "version" }
  });
  
  if (config) {
    console.log(`Database version: ${config.value}`);
  } else {
    console.log("No version found in database");
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
