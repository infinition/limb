FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY server/ server/
COPY src/ src/
COPY public/ public/
COPY gallery/ gallery/
COPY index.html vite.config.js ./

# Install all deps for build, build, then prune
RUN npm install && npm run build && npm prune --omit=dev

# Create persistent data directories
RUN mkdir -p data backups public/uploads/icons public/uploads/wallpapers

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
