# ==============================================================================
# PolyCompile - Production Multi-Stage Dockerfile
# Lightweight, secure container for deploying PolyCompile to Cloud / Kubernetes
# ==============================================================================

FROM node:20-alpine AS base

# Install security updates
RUN apk --no-cache add curl

WORKDIR /app

# Install production dependencies first (caching layer)
COPY package*.json ./
RUN npm ci --omit=dev || npm install --production

# Copy application source code
COPY . .

# Expose HTTP service port
EXPOSE 3000

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start PolyCompile server
CMD ["node", "server.js"]
