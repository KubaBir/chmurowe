FROM node:20-slim

ENV NODE_ENV=production \
    PORT=8080 \
    DATA_ROOT=/app

WORKDIR /app

COPY backend/package*.json ./

RUN npm ci --omit=dev

COPY backend/ ./
COPY db ./db
COPY archive ./archive

EXPOSE 8080

CMD ["node", "src/index.js"]
