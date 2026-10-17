#!/bin/bash
# ==============================================================================
# Netflix Clone - EC2 Deployment Script
# ==============================================================================

set -e

echo "Starting Netflix Clone deployment..."

# 1. Install Docker and Docker Compose plugin if missing
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "Docker installed successfully."
fi

# 2. Validate environment configuration (.env)
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo "Configure your AWS RDS PostgreSQL and S3 credentials in .env before starting."
        exit 1
    else
        echo "Error: Neither .env nor .env.example found."
        exit 1
    fi
fi

# 3. Build and launch application containers
echo "Deploying application containers..."
sudo docker compose down --remove-orphans || true
sudo docker compose up -d --build

# 4. Remove dangling Docker images
sudo docker image prune -f

echo "Deployment completed successfully."
echo "Application URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo 'localhost')"
