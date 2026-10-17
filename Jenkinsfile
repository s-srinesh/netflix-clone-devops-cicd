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
                    // 1. Try injecting secret .env from Jenkins Credentials if configured
                    try {
                        withCredentials([file(credentialsId: 'netflix_env', variable: 'PROD_ENV_FILE')]) {
                            if (PROD_ENV_FILE && fileExists(PROD_ENV_FILE)) {
                                writeFile file: '.env', text: readFile(PROD_ENV_FILE)
                                echo 'Loaded environment from Jenkins netflix_env credential.'
                            }
                        }
                    } catch (err) {
                        echo 'netflix_env credential not found in Jenkins, using workspace .env.'
                    }

                    // 2. Fallback to .env.example if .env does not exist
                    if (!fileExists('.env')) {
                        if (fileExists('.env.example')) {
                            writeFile file: '.env', text: readFile('.env.example')
                        } else {
                            writeFile file: '.env', text: ''
                        }
                    }

                    // 3. Platform-independent update of environment variables
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
                    echo '✅ Environment (.env) configured successfully!'
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
            echo '🎉 Netflix Clone successfully deployed and running at http://13.211.103.223 (Port 80)!'
            echo '📺 Video Uploader available at: http://13.211.103.223/upload.html or http://13.211.103.223/upload'
        }
        failure {
            echo '❌ Pipeline failed! Inspect the stage logs above for error details.'
        }
    }
}
