require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const apiUrl = process.env.SECURITY_CHECK_API_URL ?? 'https://aoe2-pagex-api-73cqixx7xa-rj.a.run.app/api/v1';

async function inspect(league) {
  if (!league) return null;
  const response = await fetch(`${apiUrl}/leagues/${encodeURIComponent(league.slug)}/leaderboard`);
  const body = await response.json().catch(() => ({}));
  return {
    visibility: league.visibility,
    status: response.status,
    inviteExposed: JSON.stringify(body).includes('inviteCode'),
  };
}

async function main() {
  const [privateLeague, publicLeague] = await Promise.all([
    prisma.league.findFirst({ where: { visibility: 'PRIVATE' }, select: { slug: true, visibility: true } }),
    prisma.league.findFirst({ where: { visibility: 'PUBLIC' }, select: { slug: true, visibility: true } }),
  ]);
  const result = {
    privateLeague: await inspect(privateLeague),
    publicLeague: await inspect(publicLeague),
  };
  const privateSafe = !result.privateLeague || result.privateLeague.status === 404;
  const publicSafe = !result.publicLeague || (result.publicLeague.status === 200 && !result.publicLeague.inviteExposed);
  console.log(JSON.stringify({ ...result, safe: privateSafe && publicSafe }));
  if (!privateSafe || !publicSafe) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
