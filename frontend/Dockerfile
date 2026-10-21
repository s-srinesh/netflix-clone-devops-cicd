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

# Copy custom Nginx configuration and template for dynamic backend host injection
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default backend address (overridden by docker compose environment variable)
ENV BACKEND_HOST=10.0.128.135
ENV BACKEND_PORT=8000

# Expose HTTP port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
