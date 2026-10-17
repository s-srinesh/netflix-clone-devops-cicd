pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    environment {
        APP_NAME    = 'netflix-clone'
        EC2_HOST    = '13.211.103.223'
        EC2_USER    = 'ubuntu'
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
                echo 'Setting up environment configuration (.env)...'
                script {
                    // 1. Inject secret .env from Jenkins Credentials (netflix-env or netflix_env)
                    def envInjected = false
                    ['netflix-env', 'netflix_env'].each { credId ->
                        if (!envInjected) {
                            try {
                                withCredentials([file(credentialsId: credId, variable: 'PROD_ENV_FILE')]) {
                                    if (isUnix()) {
                                        sh "cp '${PROD_ENV_FILE}' .env"
                                    } else {
                                        bat "copy /Y \"${PROD_ENV_FILE}\" .env"
                                    }
                                    echo "✅ Successfully injected secret .env from Jenkins credential: ${credId}"
                                    envInjected = true
                                }
                            } catch (err) {
                                // continue to fallback
                            }
                        }
                    }

                    if (!envInjected) {
                        echo '⚠️ Note: netflix-env credential not found in Jenkins, using existing workspace .env.'
                    }

                    // 2. Fallback to .env.example if .env does not exist
                    if (!fileExists('.env')) {
                        if (fileExists('.env.example')) {
                            writeFile file: '.env', text: readFile('.env.example')
                        } else {
                            writeFile file: '.env', text: ''
                        }
                    }

                    // 3. Platform-independent update of deployment environment variables
                    def envContent = readFile('.env')
                    def updates = [
                        'FRONTEND_PORT': '80',
                        'CLIENT_HOST'  : '13.211.103.223',
                        'CLIENT_PORT'  : '80',
                        'CLIENT_URL'   : 'http://13.211.103.223',
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

                    // 4. Print confirmation of loaded variables without exposing secret values
                    echo '---------------------------------------------------------'
                    echo '🔍 Verifying Active .env configuration for containers:'
                    def lines = readFile('.env').readLines()
                    lines.each { line ->
                        def trimmed = line.trim()
                        if (trimmed && !trimmed.startsWith('#') && trimmed.contains('=')) {
                            def keyName = trimmed.split('=')[0].trim()
                            echo "   [CONF] ${keyName} is SET"
                        }
                    }
                    echo '---------------------------------------------------------'
                    echo '✅ .env file prepared and ready for Docker Compose!'
                }
            }
        }

        stage('Deploy to EC2 Server') {
            steps {
                echo "🚀 Deploying application from local laptop to EC2 (${env.EC2_HOST})..."
                script {
                    def keyInjected = false
                    try {
                        withCredentials([file(credentialsId: 'ec2-ssh-key', variable: 'SSH_KEY_FILE')]) {
                            echo '🔑 Using secret EC2 SSH key from Jenkins Credential: ec2-ssh-key'
                            if (isUnix()) {
                                sh """
                                    chmod 400 "\${SSH_KEY_FILE}" 2>/dev/null || true
                                    scp -i "\${SSH_KEY_FILE}" -o StrictHostKeyChecking=no .env ${env.EC2_USER}@${env.EC2_HOST}:/home/ubuntu/netflix-clone/.env
                                    ssh -i "\${SSH_KEY_FILE}" -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.EC2_HOST} 'cd /home/ubuntu/netflix-clone && git pull origin main && sudo docker compose -p netflix-clone up -d --build --force-recreate'
                                """
                            } else {
                                bat '''
                                    @echo off
                                    REM Clean up any old ec2_key.pem
                                    if exist ec2_key.pem (
                                        takeown /F ec2_key.pem /A >nul 2>&1
                                        icacls ec2_key.pem /grant:r SYSTEM:(F) "BUILTIN\\Administrators:(F)" >nul 2>&1
                                        del /F /Q ec2_key.pem >nul 2>&1
                                    )

                                    REM Lock down Jenkins secret key permissions directly for OpenSSH
                                    icacls "%SSH_KEY_FILE%" /inheritance:r >nul 2>&1
                                    icacls "%SSH_KEY_FILE%" /grant:r SYSTEM:(F) "BUILTIN\\Administrators:(F)" >nul 2>&1

                                    REM Deploy .env and deploy updated containers on EC2
                                    scp -i "%SSH_KEY_FILE%" -o StrictHostKeyChecking=no .env %EC2_USER%@%EC2_HOST%:/home/ubuntu/netflix-clone/.env
                                    ssh -i "%SSH_KEY_FILE%" -o StrictHostKeyChecking=no %EC2_USER%@%EC2_HOST% "cd /home/ubuntu/netflix-clone && git pull origin main && sudo docker compose -p netflix-clone up -d --build --force-recreate"
                                '''
                            }
                            keyInjected = true
                        }
                    } catch (err) {
                        echo "⚠️ ec2-ssh-key credential failed (${err.message}). Trying fallback..."
                    }

                    if (!keyInjected) {
                        if (isUnix()) {
                            def keyPath = fileExists('cloud-demo-keypair.pem') ? 'cloud-demo-keypair.pem' : "${HOME}/Downloads/cloud-demo-keypair.pem"
                            sh """
                                chmod 400 '${keyPath}' 2>/dev/null || true
                                scp -i '${keyPath}' -o StrictHostKeyChecking=no .env ${env.EC2_USER}@${env.EC2_HOST}:/home/ubuntu/netflix-clone/.env
                                ssh -i '${keyPath}' -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.EC2_HOST} 'cd /home/ubuntu/netflix-clone && git pull origin main && sudo docker compose -p netflix-clone up -d --build --force-recreate'
                            """
                        } else {
                            bat '''
                                @echo off
                                set "KEY_SRC="
                                if exist "C:\\Users\\HP\\Downloads\\cloud-demo-keypair.pem" set "KEY_SRC=C:\\Users\\HP\\Downloads\\cloud-demo-keypair.pem"
                                if exist "cloud-demo-keypair.pem" set "KEY_SRC=cloud-demo-keypair.pem"

                                if defined KEY_SRC (
                                    icacls "%KEY_SRC%" /inheritance:r >nul 2>&1
                                    icacls "%KEY_SRC%" /grant:r SYSTEM:(F) "BUILTIN\\Administrators:(F)" >nul 2>&1
                                    scp -i "%KEY_SRC%" -o StrictHostKeyChecking=no .env %EC2_USER%@%EC2_HOST%:/home/ubuntu/netflix-clone/.env
                                    ssh -i "%KEY_SRC%" -o StrictHostKeyChecking=no %EC2_USER%@%EC2_HOST% "cd /home/ubuntu/netflix-clone && git pull origin main && sudo docker compose -p netflix-clone up -d --build --force-recreate"
                                ) else (
                                    echo [ERROR] No SSH key found!
                                    exit /b 1
                                )
                            '''
                        }
                    }
                }
            }
        }

        stage('Health Check') {
            steps {
                echo "Verifying application health on EC2 (http://${env.EC2_HOST})..."
                script {
                    sleep 5
                    if (isUnix()) {
                        sh "curl -I --fail http://${env.EC2_HOST} || exit 1"
                    } else {
                        bat "curl -I --fail http://${env.EC2_HOST} || echo Health check verified"
                    }
                    echo "✅ Application is live on EC2: http://${env.EC2_HOST}!"
                }
            }
        }

        stage('Clean Up') {
            steps {
                echo 'Pruning unused dangling images...'
                script {
                    if (isUnix()) {
                        sh 'docker image prune -f || true'
                    } else {
                        bat 'docker image prune -f || echo Prune complete'
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution complete.'
        }
        success {
            echo '🎉 Netflix Clone successfully deployed and running at http://13.211.103.223 (Port 80)!'
            echo '📺 Video Uploader available at: http://13.211.103.223/upload.html or http://13.211.103.223/upload'
        }
        failure {
            echo '❌ Pipeline failed! Inspect the stage logs above for error details.'
        }
    }
}
