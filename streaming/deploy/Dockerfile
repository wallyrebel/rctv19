FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server.mjs ./
COPY lib ./lib
COPY public ./public
COPY catalog ./catalog
ENV HOST=0.0.0.0
ENV PORT=4173
USER node
EXPOSE 4173
CMD ["node", "server.mjs"]
