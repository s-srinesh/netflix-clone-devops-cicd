pipeline {
    agent any

    environment {
        // Docker Hub / Registry Configurations
        DOCKER_HUB_CREDENTIALS_ID = 'docker-hub-credentials' // Configure in Jenkins Credentials
        DOCKER_HUB_USERNAME       = 'srinesh'                // Your Docker Hub username or registry namespace
        BACKEND_IMAGE             = "${DOCKER_HUB_USERNAME}/netflix-backend"
        FRONTEND_IMAGE            = "${DOCKER_HUB_USERNAME}/netflix-frontend"
        IMAGE_TAG                 = "${env.BUILD_NUMBER}"

        // AWS EC2 Deployment Configurations
        EC2_CREDENTIALS_ID        = 'ec2-ssh-key'            // Jenkins SSH Username with private key credential ID
        EC2_USER                  = 'ubuntu'                 // Default user for Ubuntu EC2 instances
        EC2_HOST                  = 'your-ec2-public-ip'     // Replace with your EC2 public IP or domain
        DEPLOY_DIR                = '/home/ubuntu/netflix-app'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out source code from Git repository...'
                checkout scm
            }
        }

        stage('Build Docker Images') {
            steps {
                echo "Building Docker images with tag: ${IMAGE_TAG} and latest..."
                sh """
                    # Build Backend Image
                    docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest ./backend

                    # Build Frontend Image
                    docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest ./frontend
                """
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo 'Logging in to Docker Registry and pushing images...'
                withCredentials([usernamePassword(credentialsId: "${DOCKER_HUB_CREDENTIALS_ID}", passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                    sh """
                        echo "\$DOCKER_PASSWORD" | docker login -u "\$DOCKER_USERNAME" --password-stdin
                        
                        # Push Backend
                        docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                        docker push ${BACKEND_IMAGE}:latest

                        # Push Frontend
                        docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                        docker push ${FRONTEND_IMAGE}:latest
                    """
                }
            }
        }

        stage('Deploy to AWS EC2') {
            steps {
                echo "Deploying application to AWS EC2 server (${EC2_HOST})..."
                sshagent(["${EC2_CREDENTIALS_ID}"]) {
                    sh """
                        # Create deploy directory on EC2 if it does not exist
                        ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} "mkdir -p ${DEPLOY_DIR}"

                        # Copy docker-compose.yml to EC2 instance
                        scp -o StrictHostKeyChecking=no docker-compose.yml ${EC2_USER}@${EC2_HOST}:${DEPLOY_DIR}/docker-compose.yml

                        # SSH into EC2 and update containers
                        ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} '
                            cd ${DEPLOY_DIR}

                            # Verify Docker & Docker Compose are installed
                            if ! command -v docker &> /dev/null; then
                                echo "Installing Docker..."
                                sudo apt-get update
                                sudo apt-get install -y ca-certificates curl gnupg
                                sudo install -m 0755 -d /etc/apt/keyrings
                                curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
                                sudo chmod a+r /etc/apt/keyrings/docker.gpg
                                echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
                                sudo apt-get update
                                sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
                                sudo usermod -aG docker \$USER
                            fi

                            # Pull latest images or trigger docker compose
                            sudo docker compose pull || true
                            sudo docker compose down --remove-orphans || true
                            sudo docker compose up -d --build
                            
                            # Clean up unused dangling images
                            sudo docker image prune -f
                        '
                    """
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution complete.'
            cleanWs()
        }
        success {
            echo '🎉 Netflix Clone successfully built, pushed, and deployed to AWS EC2!'
        }
        failure {
            echo '❌ Pipeline failed! Please inspect logs above.'
        }
    }
}
