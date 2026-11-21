FROM node:20-alpine AS builder

WORKDIR /usr/src/app

ARG DATABASE_URL

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --ignore-scripts

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/prisma.config.ts ./

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts

EXPOSE 3000

CMD ["npm", "start"]
