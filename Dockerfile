# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY src/ src/
COPY public/ public/
COPY index.html vite.config.js ./
RUN ./node_modules/.bin/vite build

# ---- Production stage ----
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY server/ server/
COPY public/ public/
COPY gallery/ gallery/
RUN mkdir -p data backups public/uploads/icons public/uploads/wallpapers
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
