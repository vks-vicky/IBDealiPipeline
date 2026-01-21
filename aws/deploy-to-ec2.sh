#!/bin/bash

# Deploy IBDealPipeline to EC2 instance
# Usage: ./deploy-to-ec2.sh <EC2_PUBLIC_IP> [--initial]

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
EC2_IP="${1}"
KEY_FILE="ibpipeline-key.pem"
EC2_USER="ec2-user"
APP_DIR="/home/ec2-user/ibpipeline"
INITIAL_DEPLOY="${2}"

if [ -z "$EC2_IP" ]; then
    echo -e "${RED}Error: EC2 IP address required${NC}"
    echo "Usage: $0 <EC2_PUBLIC_IP> [--initial]"
    echo "Example: $0 54.123.45.67"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}Error: Key file $KEY_FILE not found${NC}"
    echo "Make sure you have the key file in the current directory"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deploying IBDealPipeline to EC2${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Target: $EC2_USER@$EC2_IP"
echo ""

# Function to run SSH command
run_ssh() {
    ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "$@"
}

# Function to copy files
copy_files() {
    scp -i "$KEY_FILE" -o StrictHostKeyChecking=no -r "$@"
}

# Test SSH connection
echo "Testing SSH connection..."
if ! run_ssh "echo 'SSH connection successful'" &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to EC2 instance${NC}"
    echo "Please check:"
    echo "  - EC2 instance is running"
    echo "  - Security group allows SSH from your IP"
    echo "  - Key file has correct permissions: chmod 400 $KEY_FILE"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection successful${NC}"

# Check if Docker is installed
echo "Checking Docker installation..."
if ! run_ssh "docker --version" &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
    run_ssh "sudo dnf install -y docker && sudo systemctl start docker && sudo systemctl enable docker && sudo usermod -aG docker ec2-user"
    echo -e "${GREEN}✓ Docker installed. Please re-run this script.${NC}"
    echo -e "${YELLOW}Note: You may need to log out and back in for group changes to take effect${NC}"
    exit 0
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if Docker Compose is installed
echo "Checking Docker Compose installation..."
if ! run_ssh "docker-compose --version" &> /dev/null; then
    echo -e "${YELLOW}Docker Compose not found. Installing...${NC}"
    run_ssh 'sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose && sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose'
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Create application directory
echo "Creating application directory..."
run_ssh "mkdir -p $APP_DIR"
echo -e "${GREEN}✓ Application directory ready${NC}"

# Copy necessary files
echo "Copying files to EC2..."

# Create temporary directory with files to copy
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy docker-compose.yml
cp docker-compose.yml "$TEMP_DIR/"

# Copy Jenkinsfile (if exists)
[ -f "Jenkinsfile" ] && cp Jenkinsfile "$TEMP_DIR/"

# Copy backend directory
cp -r IBPipeline "$TEMP_DIR/"

# Copy frontend directory
cp -r frontend "$TEMP_DIR/"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    cat > "$TEMP_DIR/.env" << EOF
# MongoDB Configuration
MONGODB_URI=mongodb://mongodb:27017/ibpipeline
MONGODB_DATABASE=ibpipeline

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# Backend Configuration
SERVER_PORT=8080
FRONTEND_URL=http://$EC2_IP

# JWT Configuration (change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=86400000

# Environment
SPRING_PROFILES_ACTIVE=prod
EOF
else
    cp .env "$TEMP_DIR/"
fi

# Copy files to EC2
echo "Uploading files..."
copy_files "$TEMP_DIR/"* "$EC2_USER@$EC2_IP:$APP_DIR/"
echo -e "${GREEN}✓ Files uploaded${NC}"

# Stop existing containers (if any)
echo "Stopping existing containers..."
run_ssh "cd $APP_DIR && docker-compose down || true"
echo -e "${GREEN}✓ Stopped existing containers${NC}"

# Pull latest images (for pre-built images)
# echo "Pulling latest images..."
# run_ssh "cd $APP_DIR && docker-compose pull || true"

# Build and start containers
echo "Building and starting containers..."
run_ssh "cd $APP_DIR && docker-compose up -d --build"
echo -e "${GREEN}✓ Containers started${NC}"

# Wait for services to be healthy
echo "Waiting for services to be healthy (60 seconds)..."
sleep 60

# Check container status
echo ""
echo "Container Status:"
run_ssh "cd $APP_DIR && docker-compose ps"

# Show logs
echo ""
echo "Recent logs:"
run_ssh "cd $APP_DIR && docker-compose logs --tail=20"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Application URLs:"
echo "  Frontend:    http://$EC2_IP"
echo "  Backend API: http://$EC2_IP:8080"
echo "  Kafka UI:    http://$EC2_IP:8081"
echo "  Jenkins:     http://$EC2_IP:8082"
echo ""
echo "Useful commands:"
echo "  View logs:        ssh -i $KEY_FILE $EC2_USER@$EC2_IP 'cd $APP_DIR && docker-compose logs -f'"
echo "  Restart service:  ssh -i $KEY_FILE $EC2_USER@$EC2_IP 'cd $APP_DIR && docker-compose restart <service>'"
echo "  Stop all:         ssh -i $KEY_FILE $EC2_USER@$EC2_IP 'cd $APP_DIR && docker-compose down'"
echo "  Update code:      ./deploy-to-ec2.sh $EC2_IP"
echo ""
echo "To SSH into the instance:"
echo "  ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo ""
