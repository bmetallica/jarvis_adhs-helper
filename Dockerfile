# ADHS-Helper — Container-Build (Alternative zum systemd-Setup, siehe DEPLOY.md)
# Stage 1: PWA bauen
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: schlanker Runtime-Container (zero-dependency-Server, kein npm install nötig)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8090 \
    DATA_DIR=/data
COPY --from=build /app/dist ./dist
COPY server ./server
VOLUME /data
EXPOSE 8090
USER node
CMD ["node", "server/serve.js"]
