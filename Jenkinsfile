pipeline {
    agent any

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
                '''
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                echo 'Stopping existing containers and building new version...'
                sh '''
                    # Stop previous containers if running
                    docker compose down --remove-orphans || true

                    # Build and start frontend and backend in detached mode
                    docker compose up -d --build
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
                    docker compose ps

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
            echo '🎉 Netflix Clone successfully deployed to this EC2 server!'
        }
        failure {
            echo '❌ Pipeline failed! Inspect the stage logs above for error details.'
        }
    }
}
