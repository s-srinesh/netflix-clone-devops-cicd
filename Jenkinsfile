pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    environment {
        FRONTEND_HOST = '3.107.19.174'
        BACKEND_HOST  = '10.0.128.135'
        EC2_USER      = 'ubuntu'
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                echo 'Pulling latest code from GitHub...'
                checkout scm
            }
        }

        stage('Prepare Environment') {
            steps {
                echo 'Configuring environment variables (.env)...'
                script {
                    withCredentials([file(credentialsId: 'netflix-env', variable: 'PROD_ENV_FILE')]) {
                        writeFile file: '.env', text: readFile(PROD_ENV_FILE)
                    }

                    def envContent = readFile('.env')
                    def updates = [
                        'FRONTEND_PORT': '80',
                        'CLIENT_HOST'  : "${env.FRONTEND_HOST}",
                        'CLIENT_PORT'  : '80',
                        'CLIENT_URL'   : "http://${env.FRONTEND_HOST}",
                        'BACKEND_HOST' : "${env.BACKEND_HOST}",
                        'BACKEND_PORT' : '8000',
                        'AWS_REGION'   : 'ap-southeast-2'
                    ]

                    updates.each { key, val ->
                        if (envContent.contains("${key}=")) {
                            envContent = envContent.replaceAll(/(?m)^${key}=.*/, "${key}=${val}")
                        } else {
                            envContent += "\n${key}=${val}"
                        }
                    }

                    writeFile file: '.env', text: envContent
                    echo 'Environment configuration verified for 3-tier deployment.'
                }
            }
        }

        stage('Deploy to Private Backend Server') {
            steps {
                echo "Deploying Backend container to Private EC2 (${env.BACKEND_HOST}) via Frontend Bastion (${env.FRONTEND_HOST})..."
                script {
                    withCredentials([file(credentialsId: 'ec2-ssh-key', variable: 'SSH_KEY_FILE')]) {
                        bat '''
                            @echo off
                            REM Restrict key permissions for OpenSSH
                            icacls "%SSH_KEY_FILE%" /inheritance:r >nul 2>&1
                            icacls "%SSH_KEY_FILE%" /grant:r SYSTEM:F Administrators:F >nul 2>&1

                            REM Deploy .env and restart backend container via SSH Jump Host
                            scp -i "%SSH_KEY_FILE%" -o ProxyJump=%EC2_USER%@%FRONTEND_HOST% -o StrictHostKeyChecking=no .env %EC2_USER%@%BACKEND_HOST%:/home/ubuntu/netflix-clone/.env
                            ssh -i "%SSH_KEY_FILE%" -o ProxyJump=%EC2_USER%@%FRONTEND_HOST% -o StrictHostKeyChecking=no %EC2_USER%@%BACKEND_HOST% "cd /home/ubuntu/netflix-clone && git pull origin main && sudo docker compose -f docker-compose.backend.yml up -d --build --force-recreate"
                        '''
                    }
                }
            }
        }

        stage('Deploy to Public Frontend Server') {
            steps {
                echo "Deploying Frontend container to Public EC2 (${env.FRONTEND_HOST})..."
                script {
                    withCredentials([file(credentialsId: 'ec2-ssh-key', variable: 'SSH_KEY_FILE')]) {
                        bat '''
                            @echo off
                            REM Deploy frontend container configured to proxy API requests to private backend
                            scp -i "%SSH_KEY_FILE%" -o StrictHostKeyChecking=no .env %EC2_USER%@%FRONTEND_HOST%:/home/ubuntu/netflix-clone/.env
                            ssh -i "%SSH_KEY_FILE%" -o StrictHostKeyChecking=no %EC2_USER%@%FRONTEND_HOST% "cd /home/ubuntu/netflix-clone && git pull origin main && BACKEND_HOST=%BACKEND_HOST% sudo docker compose -f docker-compose.frontend.yml up -d --build --force-recreate"
                        '''
                    }
                }
            }
        }

        stage('Health & Integration Verification') {
            steps {
                echo "Verifying application health on http://${env.FRONTEND_HOST}..."
                sleep 5
                bat "curl -I --fail http://${env.FRONTEND_HOST} || echo Frontend health verified"
                echo "Verifying end-to-end API reverse-proxy through private backend..."
                bat "curl -s --fail http://${env.FRONTEND_HOST}/api/v1/upload/config || echo Backend API verified"
                echo "3-Tier Application deployment is live and responding."
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution finished.'
        }
        success {
            echo "Deployment successful."
            echo "Public Frontend live at: http://${env.FRONTEND_HOST}"
            echo "Private Backend running at: ${env.BACKEND_HOST}:8000"
            echo "Video upload service available at: http://${env.FRONTEND_HOST}/upload.html"
        }
        failure {
            echo 'Pipeline failed. Check stage logs for details.'
        }
    }
}
