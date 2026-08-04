# Stage 1: install deps + generate Prisma client
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY . .

# Stage 2: runtime image
FROM node:22-slim AS runtime
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home appuser
COPY --from=builder --chown=appuser:appuser /app ./
USER appuser
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]