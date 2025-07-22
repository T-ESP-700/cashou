# backend/Dockerfile
FROM oven/bun:1.0

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . .

RUN bunx dotenv -e .env -- prisma generate --schema=prisma/app/schema.prisma

EXPOSE 3000

CMD ["bun", "run", "start"]
