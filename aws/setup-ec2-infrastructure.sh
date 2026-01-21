#!/bin/bash

# EC2 Infrastructure Setup Script for IBDealPipeline
# This script creates all necessary AWS resources for EC2 deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="ibpipeline"
KEY_NAME="${PROJECT_NAME}-key"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.medium}"  # 2 vCPU, 4GB RAM - sufficient for all containers
AMI_ID=""  # Will be auto-detected (Amazon Linux 2023)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}EC2 Infrastructure Setup for IBDealPipeline${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}Error: AWS CLI is not configured or credentials are invalid${NC}"
        echo "Please run: aws configure"
        exit 1
    fi
    echo -e "${GREEN}✓ AWS CLI configured${NC}"
}

# Function to get the latest Amazon Linux 2023 AMI
get_latest_ami() {
    echo "Finding latest Amazon Linux 2023 AMI..."
    AMI_ID=$(aws ec2 describe-images \
        --region $AWS_REGION \
        --owners amazon \
        --filters "Name=name,Values=al2023-ami-2023.*-x86_64" \
        --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
        --output text)
    
    if [ -z "$AMI_ID" ]; then
        echo -e "${RED}Error: Could not find Amazon Linux 2023 AMI${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Using AMI: $AMI_ID${NC}"
}

# Function to create or get VPC
setup_vpc() {
    echo ""
    echo "Setting up VPC..."
    
    # Check if VPC already exists
    VPC_ID=$(aws ec2 describe-vpcs \
        --region $AWS_REGION \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-vpc" \
        --query 'Vpcs[0].VpcId' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$VPC_ID" = "None" ]; then
        # Create VPC
        VPC_ID=$(aws ec2 create-vpc \
            --region $AWS_REGION \
            --cidr-block 10.0.0.0/16 \
            --query 'Vpc.VpcId' \
            --output text)
        
        aws ec2 create-tags \
            --region $AWS_REGION \
            --resources $VPC_ID \
            --tags Key=Name,Value=${PROJECT_NAME}-vpc
        
        # Enable DNS hostnames
        aws ec2 modify-vpc-attribute \
            --region $AWS_REGION \
            --vpc-id $VPC_ID \
            --enable-dns-hostnames
        
        echo -e "${GREEN}✓ Created VPC: $VPC_ID${NC}"
    else
        echo -e "${YELLOW}✓ Using existing VPC: $VPC_ID${NC}"
    fi
}

# Function to create or get Internet Gateway
setup_internet_gateway() {
    echo "Setting up Internet Gateway..."
    
    # Check if IGW already exists for this VPC
    IGW_ID=$(aws ec2 describe-internet-gateways \
        --region $AWS_REGION \
        --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
        --query 'InternetGateways[0].InternetGatewayId' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$IGW_ID" = "None" ]; then
        # Create IGW
        IGW_ID=$(aws ec2 create-internet-gateway \
            --region $AWS_REGION \
            --query 'InternetGateway.InternetGatewayId' \
            --output text)
        
        aws ec2 create-tags \
            --region $AWS_REGION \
            --resources $IGW_ID \
            --tags Key=Name,Value=${PROJECT_NAME}-igw
        
        # Attach to VPC
        aws ec2 attach-internet-gateway \
            --region $AWS_REGION \
            --vpc-id $VPC_ID \
            --internet-gateway-id $IGW_ID
        
        echo -e "${GREEN}✓ Created and attached Internet Gateway: $IGW_ID${NC}"
    else
        echo -e "${YELLOW}✓ Using existing Internet Gateway: $IGW_ID${NC}"
    fi
}

# Function to create or get Subnet
setup_subnet() {
    echo "Setting up Subnet..."
    
    SUBNET_ID=$(aws ec2 describe-subnets \
        --region $AWS_REGION \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=${PROJECT_NAME}-subnet" \
        --query 'Subnets[0].SubnetId' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$SUBNET_ID" = "None" ]; then
        # Create subnet
        SUBNET_ID=$(aws ec2 create-subnet \
            --region $AWS_REGION \
            --vpc-id $VPC_ID \
            --cidr-block 10.0.1.0/24 \
            --query 'Subnet.SubnetId' \
            --output text)
        
        aws ec2 create-tags \
            --region $AWS_REGION \
            --resources $SUBNET_ID \
            --tags Key=Name,Value=${PROJECT_NAME}-subnet
        
        # Enable auto-assign public IP
        aws ec2 modify-subnet-attribute \
            --region $AWS_REGION \
            --subnet-id $SUBNET_ID \
            --map-public-ip-on-launch
        
        echo -e "${GREEN}✓ Created Subnet: $SUBNET_ID${NC}"
    else
        echo -e "${YELLOW}✓ Using existing Subnet: $SUBNET_ID${NC}"
    fi
}

# Function to setup Route Table
setup_route_table() {
    echo "Setting up Route Table..."
    
    # Get main route table
    ROUTE_TABLE_ID=$(aws ec2 describe-route-tables \
        --region $AWS_REGION \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=association.main,Values=true" \
        --query 'RouteTables[0].RouteTableId' \
        --output text)
    
    # Check if route to IGW exists
    ROUTE_EXISTS=$(aws ec2 describe-route-tables \
        --region $AWS_REGION \
        --route-table-ids $ROUTE_TABLE_ID \
        --query "RouteTables[0].Routes[?GatewayId=='$IGW_ID']" \
        --output text)
    
    if [ -z "$ROUTE_EXISTS" ]; then
        # Create route to internet gateway
        aws ec2 create-route \
            --region $AWS_REGION \
            --route-table-id $ROUTE_TABLE_ID \
            --destination-cidr-block 0.0.0.0/0 \
            --gateway-id $IGW_ID
        
        echo -e "${GREEN}✓ Added route to Internet Gateway${NC}"
    else
        echo -e "${YELLOW}✓ Route to Internet Gateway already exists${NC}"
    fi
}

# Function to create or get Security Group
setup_security_group() {
    echo "Setting up Security Group..."
    
    # Check if security group exists
    SG_ID=$(aws ec2 describe-security-groups \
        --region $AWS_REGION \
        --filters "Name=group-name,Values=${PROJECT_NAME}-sg" "Name=vpc-id,Values=$VPC_ID" \
        --query 'SecurityGroups[0].GroupId' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$SG_ID" = "None" ]; then
        # Create security group
        SG_ID=$(aws ec2 create-security-group \
            --region $AWS_REGION \
            --group-name ${PROJECT_NAME}-sg \
            --description "Security group for IBDealPipeline" \
            --vpc-id $VPC_ID \
            --query 'GroupId' \
            --output text)
        
        echo -e "${GREEN}✓ Created Security Group: $SG_ID${NC}"
        
        # Add inbound rules
        echo "Adding security group rules..."
        
        # SSH (22)
        aws ec2 authorize-security-group-ingress \
            --region $AWS_REGION \
            --group-id $SG_ID \
            --protocol tcp \
            --port 22 \
            --cidr 0.0.0.0/0
        
        # HTTP (80) - Frontend
        aws ec2 authorize-security-group-ingress \
            --region $AWS_REGION \
            --group-id $SG_ID \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0
        
        # Backend API (8080)
        aws ec2 authorize-security-group-ingress \
            --region $AWS_REGION \
            --group-id $SG_ID \
            --protocol tcp \
            --port 8080 \
            --cidr 0.0.0.0/0
        
        # Kafka UI (8081)
        aws ec2 authorize-security-group-ingress \
            --region $AWS_REGION \
            --group-id $SG_ID \
            --protocol tcp \
            --port 8081 \
            --cidr 0.0.0.0/0
        
        # Jenkins (8082)
        aws ec2 authorize-security-group-ingress \
            --region $AWS_REGION \
            --group-id $SG_ID \
            --protocol tcp \
            --port 8082 \
            --cidr 0.0.0.0/0
        
        echo -e "${GREEN}✓ Added all security group rules${NC}"
    else
        echo -e "${YELLOW}✓ Using existing Security Group: $SG_ID${NC}"
    fi
}

# Function to create or get Key Pair
setup_key_pair() {
    echo ""
    echo "Setting up Key Pair..."
    
    # Check if key pair exists
    KEY_EXISTS=$(aws ec2 describe-key-pairs \
        --region $AWS_REGION \
        --key-names $KEY_NAME \
        --query 'KeyPairs[0].KeyName' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$KEY_EXISTS" = "None" ]; then
        # Create key pair and save to file
        aws ec2 create-key-pair \
            --region $AWS_REGION \
            --key-name $KEY_NAME \
            --query 'KeyMaterial' \
            --output text > ${KEY_NAME}.pem
        
        chmod 400 ${KEY_NAME}.pem
        
        echo -e "${GREEN}✓ Created Key Pair: $KEY_NAME${NC}"
        echo -e "${YELLOW}✓ Private key saved to: ${KEY_NAME}.pem${NC}"
        echo -e "${YELLOW}  Keep this file safe! You need it to SSH into the instance.${NC}"
    else
        echo -e "${YELLOW}✓ Key Pair already exists: $KEY_NAME${NC}"
        if [ ! -f "${KEY_NAME}.pem" ]; then
            echo -e "${RED}  Warning: ${KEY_NAME}.pem not found locally.${NC}"
            echo -e "${RED}  If you don't have this file, you won't be able to SSH.${NC}"
        fi
    fi
}

# Function to create user data script
create_user_data() {
    cat > /tmp/user-data.sh << 'EOF'
#!/bin/bash

# Update system
dnf update -y

# Install Docker
dnf install -y docker
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install Git
dnf install -y git

# Add ec2-user to docker group
usermod -aG docker ec2-user

# Create application directory
mkdir -p /home/ec2-user/ibpipeline
chown ec2-user:ec2-user /home/ec2-user/ibpipeline

# Install AWS CLI (already included in AL2023)
# aws --version

echo "Docker and Docker Compose installed successfully" > /home/ec2-user/setup-complete.txt
chown ec2-user:ec2-user /home/ec2-user/setup-complete.txt
EOF
}

# Function to launch EC2 instance
launch_ec2_instance() {
    echo ""
    echo "Launching EC2 Instance..."
    
    # Check if instance already exists
    INSTANCE_ID=$(aws ec2 describe-instances \
        --region $AWS_REGION \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-instance" \
                  "Name=instance-state-name,Values=running,pending,stopping,stopped" \
        --query 'Reservations[0].Instances[0].InstanceId' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$INSTANCE_ID" != "None" ]; then
        echo -e "${YELLOW}✓ Instance already exists: $INSTANCE_ID${NC}"
        
        # Get instance state
        INSTANCE_STATE=$(aws ec2 describe-instances \
            --region $AWS_REGION \
            --instance-ids $INSTANCE_ID \
            --query 'Reservations[0].Instances[0].State.Name' \
            --output text)
        
        echo -e "${YELLOW}  Instance state: $INSTANCE_STATE${NC}"
        
        if [ "$INSTANCE_STATE" = "stopped" ]; then
            echo "Starting stopped instance..."
            aws ec2 start-instances \
                --region $AWS_REGION \
                --instance-ids $INSTANCE_ID
            echo -e "${GREEN}✓ Instance starting...${NC}"
        fi
    else
        # Create user data
        create_user_data
        
        # Launch instance
        INSTANCE_ID=$(aws ec2 run-instances \
            --region $AWS_REGION \
            --image-id $AMI_ID \
            --instance-type $INSTANCE_TYPE \
            --key-name $KEY_NAME \
            --security-group-ids $SG_ID \
            --subnet-id $SUBNET_ID \
            --user-data file:///tmp/user-data.sh \
            --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
            --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}-instance}]" \
            --query 'Instances[0].InstanceId' \
            --output text)
        
        echo -e "${GREEN}✓ Launched EC2 Instance: $INSTANCE_ID${NC}"
        
        # Wait for instance to be running
        echo "Waiting for instance to be running..."
        aws ec2 wait instance-running \
            --region $AWS_REGION \
            --instance-ids $INSTANCE_ID
        
        echo -e "${GREEN}✓ Instance is running${NC}"
        
        # Wait a bit more for initialization
        echo "Waiting for initialization to complete (60 seconds)..."
        sleep 60
    fi
}

# Function to allocate or get Elastic IP
setup_elastic_ip() {
    echo ""
    echo "Setting up Elastic IP..."
    
    # Check if EIP already exists
    ALLOCATION_ID=$(aws ec2 describe-addresses \
        --region $AWS_REGION \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-eip" \
        --query 'Addresses[0].AllocationId' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$ALLOCATION_ID" = "None" ]; then
        # Allocate new EIP
        ALLOCATION_ID=$(aws ec2 allocate-address \
            --region $AWS_REGION \
            --domain vpc \
            --query 'AllocationId' \
            --output text)
        
        aws ec2 create-tags \
            --region $AWS_REGION \
            --resources $ALLOCATION_ID \
            --tags Key=Name,Value=${PROJECT_NAME}-eip
        
        echo -e "${GREEN}✓ Allocated Elastic IP: $ALLOCATION_ID${NC}"
    else
        echo -e "${YELLOW}✓ Using existing Elastic IP: $ALLOCATION_ID${NC}"
    fi
    
    # Get the public IP
    PUBLIC_IP=$(aws ec2 describe-addresses \
        --region $AWS_REGION \
        --allocation-ids $ALLOCATION_ID \
        --query 'Addresses[0].PublicIp' \
        --output text)
    
    # Associate EIP with instance if not already associated
    ASSOCIATION_ID=$(aws ec2 describe-addresses \
        --region $AWS_REGION \
        --allocation-ids $ALLOCATION_ID \
        --query 'Addresses[0].AssociationId' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$ASSOCIATION_ID" = "None" ]; then
        aws ec2 associate-address \
            --region $AWS_REGION \
            --instance-id $INSTANCE_ID \
            --allocation-id $ALLOCATION_ID
        
        echo -e "${GREEN}✓ Associated Elastic IP with instance${NC}"
    else
        echo -e "${YELLOW}✓ Elastic IP already associated${NC}"
    fi
    
    echo -e "${GREEN}✓ Public IP: $PUBLIC_IP${NC}"
}

# Main execution
main() {
    check_aws_cli
    get_latest_ami
    setup_vpc
    setup_internet_gateway
    setup_subnet
    setup_route_table
    setup_security_group
    setup_key_pair
    launch_ec2_instance
    setup_elastic_ip
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}EC2 Infrastructure Setup Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Instance Details:"
    echo "  Instance ID: $INSTANCE_ID"
    echo "  Public IP: $PUBLIC_IP"
    echo "  SSH Command: ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
    echo ""
    echo "Application URLs (after deployment):"
    echo "  Frontend: http://$PUBLIC_IP"
    echo "  Backend API: http://$PUBLIC_IP:8080"
    echo "  Kafka UI: http://$PUBLIC_IP:8081"
    echo "  Jenkins: http://$PUBLIC_IP:8082"
    echo ""
    echo "Next Steps:"
    echo "1. Wait a few minutes for Docker installation to complete"
    echo "2. Test SSH: ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
    echo "3. Deploy application: ./aws/deploy-to-ec2.sh $PUBLIC_IP"
    echo ""
    echo "To save these values for later use:"
    echo "  export EC2_PUBLIC_IP=$PUBLIC_IP"
    echo "  export EC2_INSTANCE_ID=$INSTANCE_ID"
    echo ""
}

main
