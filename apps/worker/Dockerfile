FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm install
COPY . .
RUN npm run build:worker

FROM node:24-alpine AS runner
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm install --omit=dev

COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
ENV NODE_ENV=production
CMD ["node", "apps/worker/dist/main.js"]
