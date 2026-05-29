FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm install
COPY . .
RUN npm run build:api

FROM node:24-alpine AS runner
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm install --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
ENV NODE_ENV=production
ENV API_PORT=3001
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
