import { prisma } from '@cashou/db-app';

async function seed() {
  console.log('Seeding levels...');
  
  // Create default level
  const level1 = await prisma.level.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      title: 'Level 1 - Beginner',
      number: 1,
      duration: 30,
      speed: 1,
      startBalance: 10000,
      pointsRequired: 0,
      description: 'Start your journey in financial trading',
    },
  });
  
  console.log('Created level:', level1);
  
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});