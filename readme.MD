# AoE League

Community leaderboards for Age of Empires II: Definitive Edition, powered by official player ratings.

## Stack

- `frontend`: Next.js, React, TypeScript and CSS design tokens
- `backend`: NestJS, Prisma, PostgreSQL and JWT
- npm workspaces for local development

## Local setup

```bash
npm install
docker compose up -d
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run db:push -w backend
npm run dev
```

The web app runs at `http://localhost:3000` and the API at `http://localhost:3333/api/v1`.

For a frontend-only visual preview, set `NEXT_PUBLIC_DEMO_MODE=true`. Demo data is strictly opt-in and is never used when an API response is available.

## Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

See [the product and technical specification](docs/aoe2-community-leaderboard-tech-spec.md) for domain rules and roadmap.
