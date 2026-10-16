# Multi-stage or Lean Node.js 20 Alpine for Netflix Clone Backend
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Set default production environment
ENV NODE_ENV=production
ENV PORT=8000

# Expose backend port
EXPOSE 8000

# Start server
CMD ["node", "index.js"]
