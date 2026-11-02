FROM node:20-alpine
RUN apk add --no-cache docker-cli
WORKDIR /srv
COPY interactive-runner/package*.json ./
RUN npm install --omit=dev
COPY interactive-runner/gateway.js ./gateway.js
COPY interactive-runner/session-runner.js ./session-runner.js
COPY runner/languages.json ./languages.json
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "gateway.js"]
