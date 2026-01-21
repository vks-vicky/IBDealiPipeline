#!/bin/bash

# AWS ECS Deployment Script for IBPipeline - Fully Containerized Stack
# This script sets up the complete AWS infrastructure with MongoDB, Kafka, and Zookeeper in containers

set -e

# Configuration
AWS_REGION="us-east-1"
CLUSTER_NAME="ibpipeline-cluster"
SERVICE_NAME="ibpipeline-complete-stack"
TASK_FAMILY="ibpipeline-complete-stack"
BACKEND_REPO="ibpipeline-backend"
FRONTEND_REPO="ibpipeline-frontend"

echo "========================================="
echo "IBPipeline AWS ECS Deployment Script"
echo "Fully Containerized Stack with MongoDB & Kafka"
echo "========================================="

# 1. Create ECR Repositories
echo "Creating ECR repositories..."
aws ecr describe-repositories --repository-names ${BACKEND_REPO} --region ${AWS_REGION} 2>/dev/null || \
  aws ecr create-repository --repository-name ${BACKEND_REPO} --region ${AWS_REGION}

aws ecr describe-repositories --repository-names ${FRONTEND_REPO} --region ${AWS_REGION} 2>/dev/null || \
  aws ecr create-repository --repository-name ${FRONTEND_REPO} --region ${AWS_REGION}

echo "✓ ECR repositories created"

# 2. Create ECS Cluster
echo "Creating ECS cluster..."
aws ecs describe-clusters --clusters ${CLUSTER_NAME} --region ${AWS_REGION} 2>/dev/null || \
  aws ecs create-cluster --cluster-name ${CLUSTER_NAME} --region ${AWS_REGION}

echo "✓ ECS cluster created"

# 3. Create CloudWatch Log Groups
echo "Creating CloudWatch log groups..."
aws logs create-log-group --log-group-name /ecs/ibpipeline-backend --region ${AWS_REGION} 2>/dev/null || true
aws logs create-log-group --log-group-name /ecs/ibpipeline-frontend --region ${AWS_REGION} 2>/dev/null || true

echo "✓ CloudWatch log groups created"

# 4. Create VPC and Subnets (if not exists)
echo "Checking VPC configuration..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=ibpipeline-vpc" --query 'Vpcs[0].VpcId' --output text --region ${AWS_REGION})

if [ "$VPC_ID" == "None" ] || [ -z "$VPC_ID" ]; then
  echo "Creating VPC..."
  VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region ${AWS_REGION} --query 'Vpc.VpcId' --output text)
  aws ec2 create-tags --resources ${VPC_ID} --tags Key=Name,Value=ibpipeline-vpc --region ${AWS_REGION}
  
  # Enable DNS hostnames
  aws ec2 modify-vpc-attribute --vpc-id ${VPC_ID} --enable-dns-hostnames --region ${AWS_REGION}
fi

echo "✓ VPC ID: ${VPC_ID}"

# 5. Create Internet Gateway
echo "Creating Internet Gateway..."
IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=ibpipeline-igw" --query 'InternetGateways[0].InternetGatewayId' --output text --region ${AWS_REGION})

if [ "$IGW_ID" == "None" ] || [ -z "$IGW_ID" ]; then
  IGW_ID=$(aws ec2 create-internet-gateway --region ${AWS_REGION} --query 'InternetGateway.InternetGatewayId' --output text)
  aws ec2 create-tags --resources ${IGW_ID} --tags Key=Name,Value=ibpipeline-igw --region ${AWS_REGION}
  aws ec2 attach-internet-gateway --vpc-id ${VPC_ID} --internet-gateway-id ${IGW_ID} --region ${AWS_REGION}
fi

echo "✓ Internet Gateway ID: ${IGW_ID}"

# 6. Create Subnets
echo "Creating subnets..."
SUBNET_1=$(aws ec2 create-subnet --vpc-id ${VPC_ID} --cidr-block 10.0.1.0/24 --availability-zone ${AWS_REGION}a --region ${AWS_REGION} --query 'Subnet.SubnetId' --output text 2>/dev/null || \
  aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" "Name=cidr-block,Values=10.0.1.0/24" --query 'Subnets[0].SubnetId' --output text --region ${AWS_REGION})

SUBNET_2=$(aws ec2 create-subnet --vpc-id ${VPC_ID} --cidr-block 10.0.2.0/24 --availability-zone ${AWS_REGION}b --region ${AWS_REGION} --query 'Subnet.SubnetId' --output text 2>/dev/null || \
  aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" "Name=cidr-block,Values=10.0.2.0/24" --query 'Subnets[0].SubnetId' --output text --region ${AWS_REGION})

echo "✓ Subnets created: ${SUBNET_1}, ${SUBNET_2}"

# 7. Create Route Table
echo "Creating route table..."
ROUTE_TABLE=$(aws ec2 create-route-table --vpc-id ${VPC_ID} --region ${AWS_REGION} --query 'RouteTable.RouteTableId' --output text 2>/dev/null || \
  aws ec2 describe-route-tables --filters "Name=vpc-id,Values=${VPC_ID}" --query 'RouteTables[0].RouteTableId' --output text --region ${AWS_REGION})

aws ec2 create-route --route-table-id ${ROUTE_TABLE} --destination-cidr-block 0.0.0.0/0 --gateway-id ${IGW_ID} --region ${AWS_REGION} 2>/dev/null || true

echo "✓ Route table created: ${ROUTE_TABLE}"

# 8. Create Security Group
echo "Creating security group..."
SG_ID=$(aws ec2 create-security-group \
  --group-name ibpipeline-sg \
  --description "Security group for IBPipeline" \
  --vpc-id ${VPC_ID} \
  --region ${AWS_REGION} \
  --query 'GroupId' --output text 2>/dev/null || \
  aws ec2 describe-security-groups --filters "Name=group-name,Values=ibpipeline-sg" --query 'SecurityGroups[0].GroupId' --output text --region ${AWS_REGION})

echo "✓ Security group created: ${SG_ID}"

# 9. Create EFS (Elastic File System) for persistent storage
echo "Creating EFS for persistent data storage..."
EFS_ID=$(aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=ibpipeline-efs \
  --region ${AWS_REGION} \
  --query 'FileSystemId' --output text 2>/dev/null || \
  aws efs describe-file-systems --query "FileSystems[?Tags[?Key=='Name' && Value=='ibpipeline-efs']].FileSystemId" --output text --region ${AWS_REGION} | head -1)

echo "✓ EFS created: ${EFS_ID}"

# Wait for EFS to be available
echo "Waiting for EFS to be available..."
aws efs describe-file-systems --file-system-id ${EFS_ID} --region ${AWS_REGION} --query 'FileSystems[0].LifeCycleState' --output text
sleep 10

# Create EFS Mount Targets in both subnets
echo "Creating EFS mount targets..."
aws efs create-mount-target \
  --file-system-id ${EFS_ID} \
  --subnet-id ${SUBNET_1} \
  --security-groups ${SG_ID} \
  --region ${AWS_REGION} 2>/dev/null || true

aws efs create-mount-target \
  --file-system-id ${EFS_ID} \
  --subnet-id ${SUBNET_2} \
  --security-groups ${SG_ID} \
  --region ${AWS_REGION} 2>/dev/null || true

echo "✓ EFS mount targets created"

# Add NFS port to security group for EFS
aws ec2 authorize-security-group-ingress \
  --group-id ${SG_ID} \
  --protocol tcp \
  --port 2049 \
  --source-group ${SG_ID} \
  --region ${AWS_REGION} 2>/dev/null || true

# 10. Create Application Load Balancer
echo "Creating Application Load Balancer..."

ALB_ARN=$(aws elbv2 create-load-balancer \
  --name ibpipeline-alb \
  --subnets ${SUBNET_1} ${SUBNET_2} \
  --security-groups ${SG_ID} \
  --region ${AWS_REGION} \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || \
  aws elbv2 describe-load-balancers --names ibpipeline-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text --region ${AWS_REGION})

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns ${ALB_ARN} \
  --query 'LoadBalancers[0].DNSName' --output text --region ${AWS_REGION})

echo "✓ Application Load Balancer created: ${ALB_DNS}"

# Create Target Group for Frontend (port 80)
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
  --name ibpipeline-frontend-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id ${VPC_ID} \
  --target-type ip \
  --health-check-enabled \
  --health-check-path / \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region ${AWS_REGION} \
  --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || \
  aws elbv2 describe-target-groups --names ibpipeline-frontend-tg --query 'TargetGroups[0].TargetGroupArn' --output text --region ${AWS_REGION})

echo "✓ Target Group created"

# Create ALB Listener (HTTP port 80)
aws elbv2 create-listener \
  --load-balancer-arn ${ALB_ARN} \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=${TARGET_GROUP_ARN} \
  --region ${AWS_REGION} 2>/dev/null || true

echo "✓ ALB Listener created"

# 11. Create IAM Roles
echo "Creating IAM roles..."

# ECS Task Execution Role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' 2>/dev/null || true

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true

# ECS Task Role (for application permissions)
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' 2>/dev/null || true

echo "✓ IAM roles created"

# 12. Create Secrets in AWS Secrets Manager
echo "Creating secrets in Secrets Manager..."

# MongoDB Password
aws secretsmanager create-secret \
  --name ibpipeline/mongodb/password \
  --secret-string "admin123" \
  --region ${AWS_REGION} 2>/dev/null || \
  aws secretsmanager update-secret \
  --secret-id ibpipeline/mongodb/password \
  --secret-string "admin123" \
  --region ${AWS_REGION}

# JWT Secret
aws secretsmanager create-secret \
  --name ibpipeline/jwt/secret \
  --secret-string "MySecureJWTSecretKeyForProductionUseMinimum32CharactersLong123456789" \
  --region ${AWS_REGION} 2>/dev/null || \
  aws secretsmanager update-secret \
  --secret-id ibpipeline/jwt/secret \
  --secret-string "MySecureJWTSecretKeyForProductionUseMinimum32CharactersLong123456789" \
  --region ${AWS_REGION}

echo "✓ Secrets created in Secrets Manager"

# 13. Create CloudWatch Log Groups
echo "Creating CloudWatch log groups..."
for service in mongodb zookeeper kafka backend frontend; do
  aws logs create-log-group --log-group-name /ecs/ibpipeline-${service} --region ${AWS_REGION} 2>/dev/null || true
done

echo "✓ CloudWatch log groups created"

echo "========================================="
echo "AWS Infrastructure Setup Complete!"
echo "========================================="
echo "VPC ID: ${VPC_ID}"
echo "Subnets: ${SUBNET_1}, ${SUBNET_2}"
echo "Security Group: ${SG_ID}"
echo "EFS ID: ${EFS_ID}"
echo "ALB DNS: ${ALB_DNS}"
echo "Target Group ARN: ${TARGET_GROUP_ARN}"
echo ""
echo "Next steps:"
echo "1. Update aws/complete-stack-task-definition.json with actual values:"
echo "   - Replace \${AWS_ACCOUNT_ID} with your AWS account ID"
echo "   - Replace \${AWS_REGION} with ${AWS_REGION}"
echo "   - Replace \${EFS_ID} with ${EFS_ID}"
echo ""
echo "2. Register the task definition:"
echo "   aws ecs register-task-definition --cli-input-json file://aws/complete-stack-task-definition.json --region ${AWS_REGION}"
echo ""
echo "3. Create ECS service:"
echo "   aws ecs create-service \\"
echo "     --cluster ${CLUSTER_NAME} \\"
echo "     --service-name ${SERVICE_NAME} \\"
echo "     --task-definition ${TASK_FAMILY} \\"
echo "     --desired-count 1 \\"
echo "     --launch-type FARGATE \\"
echo "     --network-configuration \"awsvpcConfiguration={subnets=[${SUBNET_1},${SUBNET_2}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}\" \\"
echo "     --load-balancers \"targetGroupArn=${TARGET_GROUP_ARN},containerName=frontend,containerPort=80\" \\"
echo "     --region ${AWS_REGION}"
echo ""
echo "4. Access your application at: http://${ALB_DNS}"

