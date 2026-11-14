FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY scripts ./scripts
RUN mkdir -p data/uploads && chown -R node:node /app
USER node
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","src/server.js"]
