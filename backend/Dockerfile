FROM node:20-alpine AS builder

WORKDIR /usr/src/app

ARG DATABASE_URL

COPY backend/package*.json ./
COPY backend/prisma ./prisma

RUN npm ci --ignore-scripts --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY backend/ .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/prisma.config.ts ./

COPY backend/package*.json ./

RUN npm ci --omit=dev --ignore-scripts --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

EXPOSE 3000

CMD ["npm", "start"]
