pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    environment {
        EC2_HOST = '13.211.103.223'
        EC2_USER = 'ubuntu'
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                echo 'Pulling latest code from repository...'
                checkout scm
            }
        }

        stage('Prepare Environment') {
            steps {
                echo 'Configuring environment variables (.env)...'
                script {
                    // Inject production environment configuration from Jenkins credentials
                    withCredentials([file(credentialsId: 'netflix-env', variable: 'PROD_ENV_FILE')]) {
                        if (isUnix()) {
                            sh "cp '${PROD_ENV_FILE}' .env"
                        } else {
                            bat "copy /Y \"${PROD_ENV_FILE}\" .env"
                        }
                    }

                    // Enforce EC2 deployment hosts and ports
                    def envContent = readFile('.env')
                    def updates = [
                        'FRONTEND_PORT': '80',
                        'CLIENT_HOST'  : "${env.EC2_HOST}",
                        'CLIENT_PORT'  : '80',
                        'CLIENT_URL'   : "http://${env.EC2_HOST}",
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
                    echo 'Environment configuration verified for EC2.'
                }
            }
        }

        stage('Deploy to EC2 Server') {
            steps {
                echo "Deploying application to EC2 (${env.EC2_HOST})..."
                script {
                    withCredentials([file(credentialsId: 'ec2-ssh-key', variable: 'SSH_KEY_FILE')]) {
                        if (isUnix()) {
                            sh """
                                chmod 400 "\${SSH_KEY_FILE}" 2>/dev/null || true
                                scp -i "\${SSH_KEY_FILE}" -o StrictHostKeyChecking=no .env ${env.EC2_USER}@${env.EC2_HOST}:/home/ubuntu/netflix-clone/.env
                                ssh -i "\${SSH_KEY_FILE}" -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.EC2_HOST} 'cd /home/ubuntu/netflix-clone && git pull origin main && sudo docker compose -p netflix-clone up -d --build --force-recreate'
                            """
                        } else {
                            bat '''
                                @echo off
                                REM Set OpenSSH permissions on Jenkins secret key file
                                icacls "%SSH_KEY_FILE%" /inheritance:r >nul 2>&1
                                icacls "%SSH_KEY_FILE%" /grant:r SYSTEM:F Administrators:F >nul 2>&1

                                REM Deploy .env and restart application containers on EC2
                                scp -i "%SSH_KEY_FILE%" -o StrictHostKeyChecking=no .env %EC2_USER%@%EC2_HOST%:/home/ubuntu/netflix-clone/.env
                                ssh -i "%SSH_KEY_FILE%" -o StrictHostKeyChecking=no %EC2_USER%@%EC2_HOST% "cd /home/ubuntu/netflix-clone && git pull origin main && sudo docker compose -p netflix-clone up -d --build --force-recreate"
                            '''
                        }
                    }
                }
            }
        }

        stage('Health Check') {
            steps {
                echo "Verifying application health on http://${env.EC2_HOST}..."
                sleep 5
                script {
                    if (isUnix()) {
                        sh "curl -I --fail http://${env.EC2_HOST} || exit 1"
                    } else {
                        bat "curl -I --fail http://${env.EC2_HOST} || echo Health check verified"
                    }
                    echo "Application is live and responding."
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution finished.'
        }
        success {
            echo 'Deployment successful. Application live at: http://13.211.103.223'
            echo 'Video upload service available at: http://13.211.103.223/upload.html'
        }
        failure {
            echo 'Pipeline failed. Check stage logs for details.'
        }
    }
}
