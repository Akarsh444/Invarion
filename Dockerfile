# Stage 1: build the React frontend
FROM node:22-slim AS frontend
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build
# Produces static files in /client/dist

# Stage 2: install backend deps + generate Prisma client
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY . .

# Stage 3: runtime image
FROM node:22-slim AS runtime
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home appuser
COPY --from=builder --chown=appuser:appuser /app ./
# Copy the built frontend into a folder Express will serve
COPY --from=frontend --chown=appuser:appuser /client/dist ./public
USER appuser
EXPOSE 3000
CMD ["sh", "-c", "DATABASE_URL=\"${DIRECT_DATABASE_URL:-$DATABASE_URL}\" npx prisma migrate deploy && node src/index.js"]