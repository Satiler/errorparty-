# Node.js Backend Dockerfile
FROM node:20-alpine

# Install only essential dependencies
RUN apk update && apk add --no-cache curl postgresql-client

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use modular architecture entry point
# Legacy: CMD ["node", "src/server.js"]
CMD ["node", "src/index.js"]

# Use entrypoint script for migrations
ENTRYPOINT ["docker-entrypoint.sh"]
