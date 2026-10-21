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
                echo 'Pulling latest code from GitHub repository...'
                checkout scm
            }
        }

        stage('Prepare Environment') {
            steps {
                echo 'Configuring deployment environment variables (.env)...'
                script {
                    def envInjected = false
                    ['netflix-env', 'netflix_env'].each { credId ->
                        if (!envInjected) {
                            try {
                                withCredentials([file(credentialsId: credId, variable: 'PROD_ENV_FILE')]) {
                                    if (isUnix()) {
                                        sh "cp -f '${PROD_ENV_FILE}' .env"
                                    } else {
                                        bat "copy /Y \"${PROD_ENV_FILE}\" .env"
                                    }
                                    echo "Successfully injected .env from Jenkins credential: ${credId}"
                                    envInjected = true
                                }
                            } catch (err) {
                                // Continue to next credential or workspace fallback
                            }
                        }
                    }

                    if (!envInjected) {
                        if (fileExists('.env')) {
                            echo 'Using existing workspace .env configuration.'
                        } else if (fileExists('.env.example')) {
                            writeFile file: '.env', text: readFile('.env.example')
                            echo 'Created .env from .env.example template.'
                        }
                    }

                    // Enforce active 3-tier VPC parameters
                    def envContent = readFile('.env')
                    def updates = [
                        'FRONTEND_PORT': '80',
                        'CLIENT_HOST'  : "${env.FRONTEND_HOST}",
                        'CLIENT_PORT'  : '80',
                        'CLIENT_URL'   : "http://${env.FRONTEND_HOST}",
                        'BACKEND_HOST' : "${env.BACKEND_HOST}",
                        'BACKEND_PORT' : '8000',
                        'DB_HOST'      : 'database-2.cpcgg0esko34.ap-southeast-2.rds.amazonaws.com',
                        'DB_PORT'      : '5432',
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
                    def deployed = false
                    ['ec2-ssh-key', 'cloud-demo-keypair', 'ec2_key'].each { credId ->
                        if (!deployed) {
                            try {
                                withCredentials([file(credentialsId: credId, variable: 'SSH_KEY_FILE')]) {
                                    echo "Using SSH key from Jenkins credential: ${credId}"
                                    bat """
                                        @echo off
                                        icacls "%SSH_KEY_FILE%" /inheritance:r >nul 2>&1
                                        icacls "%SSH_KEY_FILE%" /grant:r SYSTEM:F Administrators:F >nul 2>&1
                                        scp -i "%SSH_KEY_FILE%" -o "ProxyCommand=ssh -i \\"%SSH_KEY_FILE%\\" -o StrictHostKeyChecking=no -W %%h:%%p ${env.EC2_USER}@${env.FRONTEND_HOST}" -o StrictHostKeyChecking=no .env ${env.EC2_USER}@${env.BACKEND_HOST}:/home/ubuntu/netflix-clone/.env
                                        ssh -i "%SSH_KEY_FILE%" -o "ProxyCommand=ssh -i \\"%SSH_KEY_FILE%\\" -o StrictHostKeyChecking=no -W %%h:%%p ${env.EC2_USER}@${env.FRONTEND_HOST}" -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.BACKEND_HOST} "cd /home/ubuntu/netflix-clone && git fetch origin main && git reset --hard origin/main && sudo docker compose -f docker-compose.backend.yml up -d --build --force-recreate"
                                    """
                                    deployed = true
                                }
                            } catch (err) {
                                // Fall through to next credential or workspace key
                            }
                        }
                    }

                    if (!deployed) {
                        def localKey = fileExists('cloud-demo-keypair.pem') ? 'cloud-demo-keypair.pem' : 'ec2_key.pem'
                        echo "Using workspace key file: ${localKey}"
                        bat """
                            @echo off
                            icacls "${localKey}" /inheritance:r >nul 2>&1
                            icacls "${localKey}" /grant:r SYSTEM:F Administrators:F >nul 2>&1
                            scp -i "${localKey}" -o "ProxyCommand=ssh -i \\"${localKey}\\" -o StrictHostKeyChecking=no -W %%h:%%p ${env.EC2_USER}@${env.FRONTEND_HOST}" -o StrictHostKeyChecking=no .env ${env.EC2_USER}@${env.BACKEND_HOST}:/home/ubuntu/netflix-clone/.env
                            ssh -i "${localKey}" -o "ProxyCommand=ssh -i \\"${localKey}\\" -o StrictHostKeyChecking=no -W %%h:%%p ${env.EC2_USER}@${env.FRONTEND_HOST}" -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.BACKEND_HOST} "cd /home/ubuntu/netflix-clone && git fetch origin main && git reset --hard origin/main && sudo docker compose -f docker-compose.backend.yml up -d --build --force-recreate"
                        """
                    }
                }
            }
        }

        stage('Deploy to Public Frontend Server') {
            steps {
                echo "Deploying Frontend container to Public EC2 (${env.FRONTEND_HOST})..."
                script {
                    def deployed = false
                    ['ec2-ssh-key', 'cloud-demo-keypair', 'ec2_key'].each { credId ->
                        if (!deployed) {
                            try {
                                withCredentials([file(credentialsId: credId, variable: 'SSH_KEY_FILE')]) {
                                    echo "Using SSH key from Jenkins credential: ${credId}"
                                    bat """
                                        @echo off
                                        icacls "%SSH_KEY_FILE%" /inheritance:r >nul 2>&1
                                        icacls "%SSH_KEY_FILE%" /grant:r SYSTEM:F Administrators:F >nul 2>&1
                                        scp -i "%SSH_KEY_FILE%" -o StrictHostKeyChecking=no .env ${env.EC2_USER}@${env.FRONTEND_HOST}:/home/ubuntu/netflix-clone/.env
                                        ssh -i "%SSH_KEY_FILE%" -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.FRONTEND_HOST} "cd /home/ubuntu/netflix-clone && git fetch origin main && git reset --hard origin/main && BACKEND_HOST=${env.BACKEND_HOST} sudo docker compose -f docker-compose.frontend.yml up -d --build --force-recreate"
                                    """
                                    deployed = true
                                }
                            } catch (err) {
                                // Fall through to next credential or workspace key
                            }
                        }
                    }

                    if (!deployed) {
                        def localKey = fileExists('cloud-demo-keypair.pem') ? 'cloud-demo-keypair.pem' : 'ec2_key.pem'
                        echo "Using workspace key file: ${localKey}"
                        bat """
                            @echo off
                            icacls "${localKey}" /inheritance:r >nul 2>&1
                            icacls "${localKey}" /grant:r SYSTEM:F Administrators:F >nul 2>&1
                            scp -i "${localKey}" -o StrictHostKeyChecking=no .env ${env.EC2_USER}@${env.FRONTEND_HOST}:/home/ubuntu/netflix-clone/.env
                            ssh -i "${localKey}" -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.FRONTEND_HOST} "cd /home/ubuntu/netflix-clone && git fetch origin main && git reset --hard origin/main && BACKEND_HOST=${env.BACKEND_HOST} sudo docker compose -f docker-compose.frontend.yml up -d --build --force-recreate"
                        """
                    }
                }
            }
        }

        stage('Health & Integration Verification') {
            steps {
                echo "Verifying application health and integration across 3 tiers..."
                sleep 5
                bat "node scripts/verify-deployment.js"
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution finished.'
        }
        success {
            echo "=========================================================="
            echo "🎉 Deployment successful!"
            echo "Public Frontend live at: http://${env.FRONTEND_HOST}"
            echo "Private Backend running at: ${env.BACKEND_HOST}:8000"
            echo "Video upload service available at: http://${env.FRONTEND_HOST}/upload.html"
            echo "=========================================================="
        }
        failure {
            echo '❌ Pipeline failed. Check stage logs for details.'
        }
    }
}
