# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:24-alpine AS build
WORKDIR /app

# Install deps with reproducible lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Inject browser keys at build time (never commit real .env to git).
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_FIREBASE_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY

# Build static site into /app/dist
COPY . .
RUN npm run build

# ---- Serve stage ----
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
