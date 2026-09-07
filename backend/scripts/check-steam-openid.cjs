require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
let createdUserId = null;
let createdEmail = null;

async function main() {
  const apiUrl = process.env.SMOKE_TEST_API_URL
    ?? 'https://aoe2-pagex-api-305217461249.southamerica-east1.run.app/api/v1';
  const suffix = randomUUID();
  createdEmail = `steam-smoke-${suffix}@example.invalid`;
  const registration = await fetch(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: createdEmail,
      username: `steam-smoke-${suffix.slice(0, 8)}`,
      password: `Smoke-${suffix}`,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const registered = await registration.json().catch(() => ({}));
  if (!registration.ok || !registered.accessToken || !registered.user?.id) {
    throw new Error(`Smoke user registration failed with HTTP ${registration.status}`);
  }
  createdUserId = registered.user.id;

  const response = await fetch(`${apiUrl}/auth/steam/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${registered.accessToken}`, 'Content-Length': '0' },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.url) throw new Error(`Steam start smoke test failed with HTTP ${response.status}`);

  const url = new URL(body.url);
  const returnTo = new URL(url.searchParams.get('openid.return_to'));
  console.log(JSON.stringify({
    status: response.status,
    steamOrigin: url.origin,
    mode: url.searchParams.get('openid.mode'),
    realm: url.searchParams.get('openid.realm'),
    callbackOrigin: returnTo.origin,
    callbackPath: returnTo.pathname,
    signedStatePresent: Boolean(returnTo.searchParams.get('state')),
  }));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (createdUserId && createdEmail) {
      const user = await prisma.user.findUnique({ where: { id: createdUserId }, select: { email: true } });
      if (user?.email === createdEmail) await prisma.user.delete({ where: { id: createdUserId } });
    }
    await prisma.$disconnect();
  });
