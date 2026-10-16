#!/bin/bash
# ==============================================================================
# AWS EC2 Quick Deployment Script for Netflix Clone (DevOps CI/CD)
# ==============================================================================

set -e

echo "🚀 Starting Netflix Clone deployment on EC2..."

# 1. Update and install Docker & Docker Compose if not already present
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker and Docker Compose..."
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "✅ Docker installed successfully."
fi

# 2. Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "⚠️ .env file not found. Copying from .env.example..."
        cp .env.example .env
        echo "❗ Please edit .env with your AWS RDS MySQL endpoint and credentials before starting the app."
        exit 1
    else
        echo "❌ No .env or .env.example file found."
        exit 1
    fi
fi

# 3. Pull / Build & Run Docker Containers
echo "🐳 Building and starting containers..."
sudo docker compose down --remove-orphans || true
sudo docker compose up -d --build

# 4. Cleanup old images
sudo docker image prune -f

echo "=========================================================="
echo "🎉 Netflix Clone is up and running!"
echo "🌐 Access your app at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo 'localhost')"
echo "=========================================================="
