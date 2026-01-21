pipeline {
    agent any
    
    environment {
        // AWS Configuration
        AWS_REGION = 'us-east-1'
        AWS_ACCOUNT_ID = credentials('aws-account-id')
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        
        // ECR Repository Names
        BACKEND_REPO = 'ibpipeline-backend'
        FRONTEND_REPO = 'ibpipeline-frontend'
        
        // Image Tags
        IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'latest'}"
        LATEST_TAG = 'latest'
        
        // ECS Configuration
        ECS_CLUSTER = 'ibpipeline-cluster'
        ECS_SERVICE = 'ibpipeline-complete-stack'
        TASK_FAMILY = 'ibpipeline-complete-stack'
        
        // Credentials
        AWS_CREDENTIALS = credentials('aws-credentials')
        DOCKER_CONFIG = credentials('docker-config')
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Validate') {
            parallel {
                stage('Validate Backend') {
                    steps {
                        dir('IBPipeline') {
                            sh '''
                                echo "Validating Backend POM..."
                                mvn validate
                            '''
                        }
                    }
                }
                stage('Validate Frontend') {
                    steps {
                        dir('frontend') {
                            sh '''
                                echo "Validating Frontend package.json..."
                                npm --version
                                node --version
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Test') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        dir('IBPipeline') {
                            sh '''
                                echo "Running Backend Tests..."
                                mvn clean test
                            '''
                        }
                    }
                    post {
                        always {
                            junit 'IBPipeline/target/surefire-reports/**/*.xml'
                        }
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            sh '''
                                echo "Running Frontend Tests..."
                                npm ci --legacy-peer-deps
                                npm run test -- --watch=false --browsers=ChromeHeadless --coverage
                            '''
                        }
                    }
                    post {
                        always {
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'frontend/coverage/frontend',
                                reportFiles: 'index.html',
                                reportName: 'Frontend Coverage Report'
                            ])
                        }
                    }
                }
            }
        }
        
        stage('Build Docker Images') {
            parallel {
                stage('Build Backend Image') {
                    steps {
                        script {
                            dir('IBPipeline') {
                                sh """
                                    echo "Building Backend Docker Image..."
                                    docker build -t ${BACKEND_REPO}:${IMAGE_TAG} .
                                    docker tag ${BACKEND_REPO}:${IMAGE_TAG} ${BACKEND_REPO}:${LATEST_TAG}
                                """
                            }
                        }
                    }
                }
                stage('Build Frontend Image') {
                    steps {
                        script {
                            dir('frontend') {
                                sh """
                                    echo "Building Frontend Docker Image..."
                                    docker build -t ${FRONTEND_REPO}:${IMAGE_TAG} .
                                    docker tag ${FRONTEND_REPO}:${IMAGE_TAG} ${FRONTEND_REPO}:${LATEST_TAG}
                                """
                            }
                        }
                    }
                }
            }
        }
        
        stage('Security Scan') {
            parallel {
                stage('Scan Backend Image') {
                    steps {
                        script {
                            sh """
                                echo "Scanning Backend Image for vulnerabilities..."
                                docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
                                    aquasec/trivy image --severity HIGH,CRITICAL \\
                                    ${BACKEND_REPO}:${IMAGE_TAG} || true
                            """
                        }
                    }
                }
                stage('Scan Frontend Image') {
                    steps {
                        script {
                            sh """
                                echo "Scanning Frontend Image for vulnerabilities..."
                                docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
                                    aquasec/trivy image --severity HIGH,CRITICAL \\
                                    ${FRONTEND_REPO}:${IMAGE_TAG} || true
                            """
                        }
                    }
                }
            }
        }
        
        stage('Push to ECR') {
            steps {
                script {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', 
                                    credentialsId: 'aws-credentials']]) {
                        sh """
                            echo "Logging into AWS ECR..."
                            aws ecr get-login-password --region ${AWS_REGION} | \\
                                docker login --username AWS --password-stdin ${ECR_REGISTRY}
                            
                            echo "Pushing Backend Image to ECR..."
                            docker tag ${BACKEND_REPO}:${IMAGE_TAG} ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}
                            docker tag ${BACKEND_REPO}:${LATEST_TAG} ${ECR_REGISTRY}/${BACKEND_REPO}:${LATEST_TAG}
                            docker push ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}
                            docker push ${ECR_REGISTRY}/${BACKEND_REPO}:${LATEST_TAG}
                            
                            echo "Pushing Frontend Image to ECR..."
                            docker tag ${FRONTEND_REPO}:${IMAGE_TAG} ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}
                            docker tag ${FRONTEND_REPO}:${LATEST_TAG} ${ECR_REGISTRY}/${FRONTEND_REPO}:${LATEST_TAG}
                            docker push ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}
                            docker push ${ECR_REGISTRY}/${FRONTEND_REPO}:${LATEST_TAG}
                        """
                    }
                }
            }
        }
        
        stage('Deploy to ECS') {
            when {
                branch 'main'
            }
            steps {
                script {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', 
                                    credentialsId: 'aws-credentials']]) {
                        sh """
                            echo "Deploying complete containerized stack to ECS..."
                            
                            # Get AWS Account ID
                            AWS_ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)
                            
                            # Get EFS ID
                            EFS_ID=\$(aws efs describe-file-systems \
                                --query "FileSystems[?Tags[?Key=='Name' && Value=='ibpipeline-efs']].FileSystemId" \
                                --output text --region ${AWS_REGION} | head -1)
                            
                            # Update task definition with actual values
                            sed -i "s/\\\${AWS_ACCOUNT_ID}/\${AWS_ACCOUNT_ID}/g" aws/complete-stack-task-definition.json
                            sed -i "s/\\\${AWS_REGION}/${AWS_REGION}/g" aws/complete-stack-task-definition.json
                            sed -i "s/\\\${EFS_ID}/\${EFS_ID}/g" aws/complete-stack-task-definition.json
                            
                            # Register new task definition
                            TASK_DEFINITION_ARN=\$(aws ecs register-task-definition \
                                --cli-input-json file://aws/complete-stack-task-definition.json \
                                --region ${AWS_REGION} \
                                --query 'taskDefinition.taskDefinitionArn' --output text)
                            
                            echo "Registered task definition: \${TASK_DEFINITION_ARN}"
                            
                            # Update ECS Service with new task definition
                            aws ecs update-service \
                                --cluster ${ECS_CLUSTER} \
                                --service ${ECS_SERVICE} \
                                --task-definition \${TASK_DEFINITION_ARN} \
                                --force-new-deployment \
                                --region ${AWS_REGION}
                            
                            echo "Waiting for service to stabilize (this may take several minutes)..."
                            aws ecs wait services-stable \
                                --cluster ${ECS_CLUSTER} \
                                --services ${ECS_SERVICE} \
                                --region ${AWS_REGION}
                                
                            echo "✓ Deployment complete!"
                        """
                    }
                }
            }
        }
        
        stage('Health Check') {
            when {
                branch 'main'
            }
            steps {
                script {
                    sh """
                        echo "Performing health checks..."
                        # Add your health check endpoints here
                        # curl -f https://your-frontend-url/health || exit 1
                        # curl -f https://your-backend-url/actuator/health || exit 1
                    """
                }
            }
        }
    }
    
    post {
        always {
            script {
                sh """
                    echo "Cleaning up Docker images..."
                    docker rmi ${BACKEND_REPO}:${IMAGE_TAG} || true
                    docker rmi ${BACKEND_REPO}:${LATEST_TAG} || true
                    docker rmi ${FRONTEND_REPO}:${IMAGE_TAG} || true
                    docker rmi ${FRONTEND_REPO}:${LATEST_TAG} || true
                    docker rmi ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG} || true
                    docker rmi ${ECR_REGISTRY}/${BACKEND_REPO}:${LATEST_TAG} || true
                    docker rmi ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG} || true
                    docker rmi ${ECR_REGISTRY}/${FRONTEND_REPO}:${LATEST_TAG} || true
                """
            }
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
            // Add notification (Slack, Email, etc.)
        }
        failure {
            echo 'Pipeline failed!'
            // Add notification (Slack, Email, etc.)
        }
    }
}
