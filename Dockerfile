# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json package-lock.json* ./
RUN yarn install
COPY src/ src/
COPY public/ public/
COPY index.html vite.config.js ./
RUN yarn vite build

# ---- Production stage ----
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN corepack enable && yarn install --production
COPY --from=build /app/dist ./dist
COPY server/ server/
COPY public/ public/
COPY gallery/ gallery/
RUN mkdir -p data backups public/uploads/icons public/uploads/wallpapers
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
