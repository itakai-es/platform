FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy package files (incluye el lockfile para builds reproducibles)
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client. `prisma generate` no se conecta a la base, pero
# prisma.config.ts exige DATABASE_URL y los .env no entran en la imagen
# (.dockerignore): basta un valor de relleno para este paso. La conexión real
# llega al arrancar, por env_file.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm db:generate

# Set production environment
ENV NODE_ENV=production

EXPOSE 3001

# Use tsx to run TypeScript directly (avoids ESM issues with Prisma)
CMD ["pnpm", "tsx", "src/index.ts"]
