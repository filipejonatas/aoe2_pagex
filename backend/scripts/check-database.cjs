require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

Promise.all([
  prisma.aoEPlayer.count(),
  prisma.playerRating.count(),
  prisma.playerRating.count({ where: { leaderboardId: 4 } }),
  prisma.playerLadderSync.count({ where: { leaderboardId: 4 } }),
  prisma.ratingSnapshot.count(),
  prisma.$queryRaw`
    select key, next_start as "nextStart", completed_at as "completedAt"
    from public.aoe_sync_state
    where key in ('ranked_1v1_directory', 'ranked_team_directory')
    order by key
  `,
])
  .then(([players, ratings, teamRatings, teamChecks, snapshots, backfills]) => {
    console.log(JSON.stringify({ connected: true, players, ratings, teamRatings, teamChecks, snapshots, backfills }));
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
