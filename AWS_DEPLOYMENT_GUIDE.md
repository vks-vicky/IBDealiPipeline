# AWS Deployment Guide - Complete Containerized Stack

This guide covers deploying the IBPipeline application to AWS ECS with MongoDB, Kafka, and Zookeeper running as containers.

## Architecture Overview

**All services run in a single ECS Task (Fargate):**
- Frontend (Angular/Nginx) - Port 80
- Backend (Spring Boot) - Port 8080
- MongoDB - Port 27017
- Zookeeper - Port 2181
- Kafka - Port 9092

**AWS Services Used:**
- **ECS Fargate**: Container orchestration
- **EFS**: Persistent storage for MongoDB, Kafka, Zookeeper
- **ALB**: Application Load Balancer for external access
- **ECR**: Docker image registry
- **Secrets Manager**: Secure storage for passwords/secrets
- **CloudWatch**: Logging and monitoring
- **VPC**: Network isolation

## Prerequisites

1. **AWS CLI** installed and configured with credentials
   ```bash
   aws configure
   ```

2. **Docker** installed for building images

3. **Jenkins** (optional) for CI/CD, or deploy manually

4. **AWS Account** with permissions for:
   - ECS, ECR, EFS, ALB, VPC, Secrets Manager, CloudWatch, IAM

## Step 1: Setup AWS Infrastructure

Run the infrastructure setup script:

```bash
cd aws
chmod +x setup-aws-infrastructure.sh
./setup-aws-infrastructure.sh
```

This script creates:
- ✅ VPC with 2 subnets across 2 availability zones
- ✅ Internet Gateway and Route Tables
- ✅ Security Groups (allows HTTP 80, NFS 2049 for EFS)
- ✅ ECS Cluster (`ibpipeline-cluster`)
- ✅ ECR Repositories for frontend and backend
- ✅ EFS File System with mount targets
- ✅ Application Load Balancer
- ✅ Target Group for frontend traffic
- ✅ IAM Roles (ecsTaskExecutionRole, ecsTaskRole)
- ✅ Secrets in Secrets Manager (MongoDB password, JWT secret)
- ✅ CloudWatch Log Groups

**Note:** The script will output important values like EFS ID, ALB DNS name, etc. Save these!

## Step 2: Build and Push Docker Images

### Option A: Using Jenkins Pipeline

1. Configure Jenkins credentials:
   - `aws-credentials`: AWS Access Key ID and Secret Access Key
   - `aws-account-id`: Your AWS Account ID (12 digits)

2. Create Jenkins pipeline job pointing to your repository

3. Run the pipeline - it will:
   - Validate code
   - Run tests
   - Build Docker images
   - Scan for vulnerabilities
   - Push to ECR
   - Deploy to ECS

### Option B: Manual Build and Push

```bash
# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build and push backend
cd IBPipeline
docker build -t ibpipeline-backend:latest .
docker tag ibpipeline-backend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ibpipeline-backend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ibpipeline-backend:latest

# Build and push frontend
cd ../frontend
docker build -t ibpipeline-frontend:latest .
docker tag ibpipeline-frontend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ibpipeline-frontend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ibpipeline-frontend:latest
```

## Step 3: Update Task Definition

Update `aws/complete-stack-task-definition.json` with actual values:

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"
EFS_ID=$(aws efs describe-file-systems --query "FileSystems[?Tags[?Key=='Name' && Value=='ibpipeline-efs']].FileSystemId" --output text --region ${AWS_REGION} | head -1)

# Replace placeholders
sed -i "s/\${AWS_ACCOUNT_ID}/${AWS_ACCOUNT_ID}/g" complete-stack-task-definition.json
sed -i "s/\${AWS_REGION}/${AWS_REGION}/g" complete-stack-task-definition.json
sed -i "s/\${EFS_ID}/${EFS_ID}/g" complete-stack-task-definition.json
```

## Step 4: Register Task Definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://complete-stack-task-definition.json \
  --region us-east-1
```

## Step 5: Create ECS Service

Get the required values:

```bash
CLUSTER_NAME="ibpipeline-cluster"
SERVICE_NAME="ibpipeline-complete-stack"
TASK_FAMILY="ibpipeline-complete-stack"

# Get subnet IDs
SUBNET_1=$(aws ec2 describe-subnets --filters "Name=cidr-block,Values=10.0.1.0/24" --query 'Subnets[0].SubnetId' --output text --region us-east-1)
SUBNET_2=$(aws ec2 describe-subnets --filters "Name=cidr-block,Values=10.0.2.0/24" --query 'Subnets[0].SubnetId' --output text --region us-east-1)

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=ibpipeline-sg" --query 'SecurityGroups[0].GroupId' --output text --region us-east-1)

# Get target group ARN
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups --names ibpipeline-frontend-tg --query 'TargetGroups[0].TargetGroupArn' --output text --region us-east-1)
```

Create the service:

```bash
aws ecs create-service \
  --cluster ${CLUSTER_NAME} \
  --service-name ${SERVICE_NAME} \
  --task-definition ${TASK_FAMILY} \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_1},${SUBNET_2}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=${TARGET_GROUP_ARN},containerName=frontend,containerPort=80" \
  --region us-east-1
```

## Step 6: Monitor Deployment

Watch the service deployment:

```bash
aws ecs describe-services \
  --cluster ibpipeline-cluster \
  --services ibpipeline-complete-stack \
  --region us-east-1
```

Check CloudWatch logs for each container:

```bash
# Backend logs
aws logs tail /ecs/ibpipeline-backend --follow --region us-east-1

# MongoDB logs
aws logs tail /ecs/ibpipeline-mongodb --follow --region us-east-1

# Kafka logs
aws logs tail /ecs/ibpipeline-kafka --follow --region us-east-1
```

## Step 7: Access the Application

Get the ALB DNS name:

```bash
ALB_DNS=$(aws elbv2 describe-load-balancers --names ibpipeline-alb --query 'LoadBalancers[0].DNSName' --output text --region us-east-1)
echo "Application URL: http://${ALB_DNS}"
```

Open in browser: `http://<ALB-DNS-NAME>`

Default login: `admin` / `admin123`

## Troubleshooting

### Container Startup Issues

Check task status:
```bash
aws ecs describe-tasks \
  --cluster ibpipeline-cluster \
  --tasks $(aws ecs list-tasks --cluster ibpipeline-cluster --service-name ibpipeline-complete-stack --query 'taskArns[0]' --output text --region us-east-1) \
  --region us-east-1
```

### Health Check Failures

Containers have health checks configured:
- **MongoDB**: `mongosh --eval 'db.adminCommand("ping")'`
- **Zookeeper**: `nc -z localhost 2181`
- **Kafka**: `kafka-broker-api-versions --bootstrap-server localhost:9092`
- **Backend**: `wget http://localhost:8080/actuator/health`
- **Frontend**: `wget http://localhost:80`

If a container is unhealthy, check its logs in CloudWatch.

### EFS Mount Issues

Verify EFS mount targets are available:
```bash
aws efs describe-mount-targets --file-system-id ${EFS_ID} --region us-east-1
```

Ensure security group allows NFS (port 2049).

### Kafka Connection Issues

Kafka uses `localhost:9092` for internal communication (same task). All containers share the same network namespace in awsvpc mode.

## Cost Optimization

**Current Configuration:**
- 1 Fargate task: 2 vCPU, 4GB RAM (~$35-40/month if running 24/7)
- EFS: Pay-per-use (~$5-10/month for typical usage)
- ALB: ~$20-25/month
- **Total: ~$60-75/month**

**To reduce costs:**
1. Use Fargate Spot for non-production (~70% cheaper)
2. Stop/start tasks on schedule (e.g., only business hours)
3. Use smaller task size if performance allows
4. Consider EC2 for ECS if running multiple tasks

## Security Best Practices

1. **Update Secrets**: Change default passwords in Secrets Manager
2. **Enable HTTPS**: Add SSL certificate to ALB
3. **Restrict Security Groups**: Limit access to specific IPs
4. **Enable VPC Flow Logs**: Monitor network traffic
5. **Use IAM Roles**: Never hardcode credentials
6. **Encrypt EFS**: Already enabled with transit encryption
7. **Scan Images**: Use Trivy or ECR image scanning

## Scaling

Scale the service:
```bash
aws ecs update-service \
  --cluster ibpipeline-cluster \
  --service ibpipeline-complete-stack \
  --desired-count 2 \
  --region us-east-1
```

**Note**: Scaling beyond 1 task requires:
- Kafka replication factor > 1
- MongoDB replica set configuration
- Shared EFS storage coordination

## Updating the Application

### Via Jenkins:
1. Push code changes to repository
2. Jenkins automatically builds, tests, and deploys

### Manually:
1. Build and push new images to ECR
2. Update service to force new deployment:
```bash
aws ecs update-service \
  --cluster ibpipeline-cluster \
  --service ibpipeline-complete-stack \
  --force-new-deployment \
  --region us-east-1
```

## Cleanup

To delete all resources:

```bash
# Delete ECS service
aws ecs delete-service --cluster ibpipeline-cluster --service ibpipeline-complete-stack --force --region us-east-1

# Delete ECS cluster
aws ecs delete-cluster --cluster ibpipeline-cluster --region us-east-1

# Delete ALB
aws elbv2 delete-load-balancer --load-balancer-arn <ALB-ARN> --region us-east-1

# Delete Target Group
aws elbv2 delete-target-group --target-group-arn <TG-ARN> --region us-east-1

# Delete EFS mount targets, then file system
# (First delete mount targets, wait, then delete file system)

# Delete ECR repositories
aws ecr delete-repository --repository-name ibpipeline-backend --force --region us-east-1
aws ecr delete-repository --repository-name ibpipeline-frontend --force --region us-east-1

# Delete VPC, subnets, security groups, etc. via AWS Console
```

## Support

For issues:
1. Check CloudWatch logs
2. Verify ECS task health and status
3. Review security group rules
4. Validate EFS mount targets
5. Check IAM role permissions
