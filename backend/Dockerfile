FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
# Install FFmpeg (libx264 + aac) — adds ~70 MB to the runtime image
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src/db/migrations ./src/db/migrations
# Copy watermark asset for FFmpeg filtergraph
COPY --from=builder /app/assets ./assets
EXPOSE 3000
CMD ["node", "dist/index.js"]
