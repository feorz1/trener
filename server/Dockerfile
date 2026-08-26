FROM node:20.19.4-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY server ./server
COPY src ./src
COPY tsconfig.json ./

RUN npm run api:prisma:generate

EXPOSE 3000

CMD ["npx", "tsx", "server/src/index.ts"]
