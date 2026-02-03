import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const reps = [
  { name: "Connor", role: "rep", status: "active" },
  { name: "John", role: "rep", status: "active" },
  { name: "Nathan", role: "rep", status: "active" },
];

async function main() {
  for (const rep of reps) {
    const existing = await prisma.seat.findFirst({
      where: { name: rep.name, role: rep.role },
    });
    if (existing) continue;

    await prisma.seat.create({ data: rep });
  }
}

main()
  .catch((error) => {
    console.error("Failed to seed seats:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
