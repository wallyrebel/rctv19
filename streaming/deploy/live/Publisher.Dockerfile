FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY lib ./lib
COPY scripts/publish-live.mjs ./scripts/publish-live.mjs
USER node
CMD ["node", "scripts/publish-live.mjs"]
