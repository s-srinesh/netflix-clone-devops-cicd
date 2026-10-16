pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    environment {
        APP_NAME    = 'netflix-clone'
        ENV_FILE    = '/var/www/netflix/.env'
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                echo 'Pulling latest code from GitHub...'
                checkout scm
            }
        }

        stage('Prepare Environment (.env)') {
            steps {
                echo 'Checking for production .env configuration...'
                sh '''
                    if [ -f "$ENV_FILE" ]; then
                        echo "Loading production .env from $ENV_FILE..."
                        cp "$ENV_FILE" .env
                    elif [ -f ".env" ]; then
                        echo "Using existing .env from workspace..."
                    else
                        echo "Warning: No .env found. Falling back to .env.example..."
                        cp .env.example .env
                    fi

                    # Configure frontend port to 80
                    if grep -q "FRONTEND_PORT=" .env; then
                        sed -i 's/^FRONTEND_PORT=.*/FRONTEND_PORT=80/' .env
                    else
                        echo "FRONTEND_PORT=80" >> .env
                    fi

                    # Configure client host and URL to EC2 IP 3.25.124.113
                    if grep -q "CLIENT_HOST=" .env; then
                        sed -i 's/^CLIENT_HOST=.*/CLIENT_HOST=3.25.124.113/' .env
                    else
                        echo "CLIENT_HOST=3.25.124.113" >> .env
                    fi

                    if grep -q "CLIENT_PORT=" .env; then
                        sed -i 's/^CLIENT_PORT=.*/CLIENT_PORT=80/' .env
                    else
                        echo "CLIENT_PORT=80" >> .env
                    fi

                    if grep -q "CLIENT_URL=" .env; then
                        sed -i 's|^CLIENT_URL=.*|CLIENT_URL=http://3.25.124.113|' .env
                    else
                        echo "CLIENT_URL=http://3.25.124.113" >> .env
                    fi
                '''
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                echo 'Stopping existing containers and building new version...'
                sh '''
                    # Stop compose stack and force remove any existing netflix containers
                    docker compose -p netflix-clone down --remove-orphans -t 2 2>/dev/null || true
                    docker rm -f netflix-frontend netflix-backend 2>/dev/null || true
                    docker ps -aq --filter "name=netflix-" | xargs -r docker rm -f 2>/dev/null || true

                    # Build and start frontend and backend with explicit project name and force recreation
                    docker compose -p netflix-clone up -d --build --force-recreate
                '''
            }
        }

        stage('Health Check') {
            steps {
                echo 'Verifying application health...'
                sh '''
                    # Wait 5 seconds for containers to initialize
                    sleep 5

                    # Check running containers
                    docker compose -p netflix-clone ps

                    # Source .env if present for port detection
                    if [ -f .env ]; then
                        export $(grep -v '^#' .env | xargs) || true
                    fi
                    TARGET_PORT=${FRONTEND_PORT:-80}
                    curl -I --fail http://localhost:${TARGET_PORT} || exit 1
                    echo "✅ Frontend is healthy and responding on port ${TARGET_PORT}!"
                '''
            }
        }

        stage('Clean Up') {
            steps {
                echo 'Pruning unused dangling images...'
                sh 'docker image prune -f'
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution complete.'
        }
        success {
            echo '🎉 Netflix Clone successfully deployed and running at http://3.25.124.113 (Port 80)!'
        }
        failure {
            echo '❌ Pipeline failed! Inspect the stage logs above for error details.'
        }
    }
}
