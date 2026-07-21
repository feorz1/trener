FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY admin ./admin
COPY tsconfig.json ./
ARG VITE_ADMIN_API_BASE_URL=http://localhost:3000
ENV VITE_ADMIN_API_BASE_URL=$VITE_ADMIN_API_BASE_URL
RUN npm run admin:build

FROM nginx:1.27-bookworm

COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin/dist /usr/share/nginx/html/admin
