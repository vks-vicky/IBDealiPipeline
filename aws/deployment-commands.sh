#!/bin/bash

# Quick deployment commands for IBPipeline AWS deployment
# Source: ./aws/deployment-commands.sh

AWS_REGION="us-east-1"
CLUSTER_NAME="ibpipeline-cluster"
SERVICE_NAME="ibpipeline-complete-stack"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== IBPipeline AWS Deployment Commands ===${NC}\n"

# Function to get AWS Account ID
get_account_id() {
    aws sts get-caller-identity --query Account --output text
}

# Function to get EFS ID
get_efs_id() {
    aws efs describe-file-systems \
        --query "FileSystems[?Tags[?Key=='Name' && Value=='ibpipeline-efs']].FileSystemId" \
        --output text --region ${AWS_REGION} | head -1
}

# Function to get ALB DNS
get_alb_dns() {
    aws elbv2 describe-load-balancers --names ibpipeline-alb \
        --query 'LoadBalancers[0].DNSName' --output text --region ${AWS_REGION}
}

# Parse command
case "$1" in
    setup)
        echo -e "${YELLOW}Running infrastructure setup...${NC}"
        chmod +x setup-aws-infrastructure.sh
        ./setup-aws-infrastructure.sh
        ;;
    
    build)
        echo -e "${YELLOW}Building and pushing Docker images...${NC}"
        AWS_ACCOUNT_ID=$(get_account_id)
        
        # Login to ECR
        aws ecr get-login-password --region ${AWS_REGION} | \
            docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
        
        # Build backend
        cd ../IBPipeline
        docker build -t ibpipeline-backend:latest .
        docker tag ibpipeline-backend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ibpipeline-backend:latest
        docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ibpipeline-backend:latest
        
        # Build frontend
        cd ../frontend
        docker build -t ibpipeline-frontend:latest .
        docker tag ibpipeline-frontend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ibpipeline-frontend:latest
        docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ibpipeline-frontend:latest
        
        echo -e "${GREEN}✓ Images built and pushed${NC}"
        ;;
    
    register)
        echo -e "${YELLOW}Registering task definition...${NC}"
        AWS_ACCOUNT_ID=$(get_account_id)
        EFS_ID=$(get_efs_id)
        
        # Create temporary file with substitutions
        cat complete-stack-task-definition.json | \
            sed "s/\${AWS_ACCOUNT_ID}/${AWS_ACCOUNT_ID}/g" | \
            sed "s/\${AWS_REGION}/${AWS_REGION}/g" | \
            sed "s/\${EFS_ID}/${EFS_ID}/g" > /tmp/task-def.json
        
        aws ecs register-task-definition \
            --cli-input-json file:///tmp/task-def.json \
            --region ${AWS_REGION}
        
        echo -e "${GREEN}✓ Task definition registered${NC}"
        ;;
    
    create-service)
        echo -e "${YELLOW}Creating ECS service...${NC}"
        
        SUBNET_1=$(aws ec2 describe-subnets --filters "Name=cidr-block,Values=10.0.1.0/24" --query 'Subnets[0].SubnetId' --output text --region ${AWS_REGION})
        SUBNET_2=$(aws ec2 describe-subnets --filters "Name=cidr-block,Values=10.0.2.0/24" --query 'Subnets[0].SubnetId' --output text --region ${AWS_REGION})
        SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=ibpipeline-sg" --query 'SecurityGroups[0].GroupId' --output text --region ${AWS_REGION})
        TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups --names ibpipeline-frontend-tg --query 'TargetGroups[0].TargetGroupArn' --output text --region ${AWS_REGION})
        
        aws ecs create-service \
            --cluster ${CLUSTER_NAME} \
            --service-name ${SERVICE_NAME} \
            --task-definition ibpipeline-complete-stack \
            --desired-count 1 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_1},${SUBNET_2}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}" \
            --load-balancers "targetGroupArn=${TARGET_GROUP_ARN},containerName=frontend,containerPort=80" \
            --region ${AWS_REGION}
        
        echo -e "${GREEN}✓ Service created${NC}"
        ;;
    
    update)
        echo -e "${YELLOW}Updating ECS service (force new deployment)...${NC}"
        aws ecs update-service \
            --cluster ${CLUSTER_NAME} \
            --service ${SERVICE_NAME} \
            --force-new-deployment \
            --region ${AWS_REGION}
        
        echo -e "${GREEN}✓ Service update initiated${NC}"
        ;;
    
    status)
        echo -e "${YELLOW}Checking service status...${NC}"
        aws ecs describe-services \
            --cluster ${CLUSTER_NAME} \
            --services ${SERVICE_NAME} \
            --region ${AWS_REGION} \
            --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
            --output table
        ;;
    
    logs)
        CONTAINER=${2:-backend}
        echo -e "${YELLOW}Tailing logs for ${CONTAINER}...${NC}"
        aws logs tail /ecs/ibpipeline-${CONTAINER} --follow --region ${AWS_REGION}
        ;;
    
    url)
        ALB_DNS=$(get_alb_dns)
        echo -e "${GREEN}Application URL: ${NC}http://${ALB_DNS}"
        echo -e "${GREEN}Login: ${NC}admin / admin123"
        ;;
    
    scale)
        COUNT=${2:-1}
        echo -e "${YELLOW}Scaling service to ${COUNT} tasks...${NC}"
        aws ecs update-service \
            --cluster ${CLUSTER_NAME} \
            --service ${SERVICE_NAME} \
            --desired-count ${COUNT} \
            --region ${AWS_REGION}
        
        echo -e "${GREEN}✓ Service scaled to ${COUNT} tasks${NC}"
        ;;
    
    delete)
        echo -e "${RED}Deleting ECS service and resources...${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            aws ecs delete-service \
                --cluster ${CLUSTER_NAME} \
                --service ${SERVICE_NAME} \
                --force \
                --region ${AWS_REGION}
            echo -e "${GREEN}✓ Service deletion initiated${NC}"
            echo -e "${YELLOW}Note: Manual cleanup of ALB, EFS, VPC still required${NC}"
        else
            echo -e "${YELLOW}Deletion cancelled${NC}"
        fi
        ;;
    
    info)
        echo -e "${GREEN}Current AWS Configuration:${NC}"
        echo "  Account ID: $(get_account_id)"
        echo "  Region: ${AWS_REGION}"
        echo "  EFS ID: $(get_efs_id)"
        echo "  ALB DNS: $(get_alb_dns)"
        echo "  Cluster: ${CLUSTER_NAME}"
        echo "  Service: ${SERVICE_NAME}"
        ;;
    
    *)
        echo "Usage: $0 {setup|build|register|create-service|update|status|logs|url|scale|delete|info}"
        echo ""
        echo "Commands:"
        echo "  setup          - Create AWS infrastructure (VPC, ECS, EFS, ALB, etc.)"
        echo "  build          - Build and push Docker images to ECR"
        echo "  register       - Register ECS task definition"
        echo "  create-service - Create ECS service"
        echo "  update         - Force new deployment of ECS service"
        echo "  status         - Show service status"
        echo "  logs [name]    - Tail logs (backend|frontend|mongodb|kafka|zookeeper)"
        echo "  url            - Show application URL"
        echo "  scale [count]  - Scale service to specified task count"
        echo "  delete         - Delete ECS service"
        echo "  info           - Show AWS configuration info"
        echo ""
        echo "Example workflow:"
        echo "  $0 setup           # First time setup"
        echo "  $0 build           # Build images"
        echo "  $0 register        # Register task definition"
        echo "  $0 create-service  # Create service"
        echo "  $0 url             # Get application URL"
        echo "  $0 logs backend    # View logs"
        exit 1
        ;;
esac
