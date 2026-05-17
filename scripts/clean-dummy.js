const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up old dummy data without a user ID...");
  
  const emailsDeleted = await prisma.email.deleteMany({
    where: { userId: null }
  });
  console.log(`Deleted ${emailsDeleted.count} legacy emails.`);

  const batchesDeleted = await prisma.importBatch.deleteMany({
    where: { userId: null }
  });
  console.log(`Deleted ${batchesDeleted.count} legacy import batches.`);

  const jobsDeleted = await prisma.scrapeJob.deleteMany({
    where: { userId: null }
  });
  console.log(`Deleted ${jobsDeleted.count} legacy scrape jobs.`);

  console.log("Cleanup complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
