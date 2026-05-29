FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm install
COPY . .
RUN npm run build:frontend

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
# SPA routing config
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://api:3001; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    location /socket.io/ { \
        proxy_pass http://api:3001; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
