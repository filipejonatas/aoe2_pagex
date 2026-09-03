FROM node:22-alpine AS build

WORKDIR /app

# Prisma needs OpenSSL both while generating the client and at runtime.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY backend ./backend
RUN npm run db:generate -w backend && npm run build -w backend

FROM node:22-alpine AS production-dependencies

WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev --workspace backend

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --from=build --chown=node:node /app/backend/package.json ./backend/package.json

USER node

EXPOSE 8080
CMD ["node", "backend/dist/main.js"]
