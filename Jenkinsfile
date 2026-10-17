pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    environment {
        APP_NAME    = 'netflix-clone'
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
                echo 'Setting up environment configuration for local laptop deployment...'
                script {
                    try {
                        withCredentials([file(credentialsId: 'netflix_env', variable: 'PROD_ENV_FILE')]) {
                            sh '''
                                set +x
                                if [ -n "$PROD_ENV_FILE" ] && [ -f "$PROD_ENV_FILE" ]; then
                                    cp "$PROD_ENV_FILE" .env
                                fi
                            '''
                        }
                    } catch (err) {
                        echo 'netflix_env credential not found in Jenkins, using workspace .env.'
                    }

                    sh '''
                        # Hide command tracing from Jenkins console output
                        set +x

                        # Ensure .env file exists
                        if [ ! -f .env ]; then
                            if [ -f .env.example ]; then
                                cp .env.example .env
                            else
                                touch .env
                            fi
                        fi

                        # Configure frontend port to 80
                        if grep -q "FRONTEND_PORT=" .env; then
                            sed -i 's/^FRONTEND_PORT=.*/FRONTEND_PORT=80/' .env
                        else
                            echo "FRONTEND_PORT=80" >> .env
                        fi

                        # Configure client host and URL for local machine deployment
                        if grep -q "CLIENT_HOST=" .env; then
                            sed -i 's/^CLIENT_HOST=.*/CLIENT_HOST=localhost/' .env
                        else
                            echo "CLIENT_HOST=localhost" >> .env
                        fi

                        if grep -q "CLIENT_PORT=" .env; then
                            sed -i 's/^CLIENT_PORT=.*/CLIENT_PORT=80/' .env
                        else
                            echo "CLIENT_PORT=80" >> .env
                        fi

                        if grep -q "CLIENT_URL=" .env; then
                            sed -i 's|^CLIENT_URL=.*|CLIENT_URL=http://localhost|' .env
                        else
                            echo "CLIENT_URL=http://localhost" >> .env
                        fi
                    '''
                }
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

                    # Safely detect frontend port without exposing other secrets
                    TARGET_PORT=$(grep '^FRONTEND_PORT=' .env 2>/dev/null | cut -d'=' -f2)
                    TARGET_PORT=${TARGET_PORT:-80}
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
            echo '🎉 Netflix Clone successfully deployed and running at http://localhost (Port 80)!'
            echo '📺 Video Uploader available at: http://localhost/upload.html or http://localhost/upload'
        }
        failure {
            echo '❌ Pipeline failed! Inspect the stage logs above for error details.'
        }
    }
}
