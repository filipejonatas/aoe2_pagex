require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

Promise.all([
  prisma.aoEPlayer.count(),
  prisma.playerRating.count(),
  prisma.ratingSnapshot.count(),
])
  .then(([players, ratings, snapshots]) => {
    console.log(JSON.stringify({ connected: true, players, ratings, snapshots }));
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
