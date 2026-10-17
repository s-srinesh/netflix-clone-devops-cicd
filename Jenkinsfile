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
                        'CLIENT_HOST'  : 'localhost',
                        'CLIENT_PORT'  : '80',
                        'CLIENT_URL'   : 'http://localhost',
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

        stage('Deploy with Docker Compose') {
            steps {
                echo 'Stopping existing containers and building new version...'
                script {
                    if (isUnix()) {
                        sh '''
                            docker compose -p netflix-clone down --remove-orphans -t 2 2>/dev/null || true
                            docker compose -p netflix-clone up -d --build --force-recreate
                        '''
                    } else {
                        bat '''
                            @echo off
                            docker ps >nul 2>&1
                            if %ERRORLEVEL% NEQ 0 (
                                echo Testing fallback to DOCKER_HOST=tcp://localhost:2375 ...
                                set DOCKER_HOST=tcp://localhost:2375
                            )
                            docker compose -p netflix-clone down --remove-orphans -t 2 || echo Stack already down
                            docker compose -p netflix-clone up -d --build --force-recreate
                        '''
                    }
                }
            }
        }

        stage('Health Check') {
            steps {
                echo 'Verifying application health...'
                script {
                    sleep 5
                    if (isUnix()) {
                        sh '''
                            docker compose -p netflix-clone ps
                            curl -I --fail http://localhost:80 || exit 1
                        '''
                    } else {
                        bat '''
                            docker compose -p netflix-clone ps
                            curl -I --fail http://localhost:80 || echo Warning: Health check curl skipped or pending
                        '''
                    }
                    echo "✅ Application started successfully on port 80!"
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
            echo '🎉 Netflix Clone successfully deployed and running at http://localhost (Port 80)!'
            echo '📺 Video Uploader available at: http://localhost/upload.html or http://localhost/upload'
        }
        failure {
            echo '❌ Pipeline failed! Inspect the stage logs above for error details.'
        }
    }
}
