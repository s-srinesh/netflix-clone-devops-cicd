# ==========================================
# Stage 1: Build React SPA with Vite
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ==========================================
# Stage 2: Serve with Nginx Reverse Proxy
# ==========================================
FROM nginx:alpine

# Copy built static files to Nginx web root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
