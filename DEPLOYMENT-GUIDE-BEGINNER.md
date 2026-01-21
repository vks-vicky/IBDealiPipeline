# 🚀 Beginner's Deployment Guide - IBPipeline

**Welcome!** This guide will walk you through deploying your Investment Banking Deal Pipeline application step-by-step. No prior DevOps experience needed!

---

## 📋 Table of Contents

1. [Phase 1: Local Testing (Start Here!)](#phase-1-local-testing-start-here)
2. [Phase 2: AWS Setup](#phase-2-aws-setup)
3. [Phase 3: CI/CD Pipeline](#phase-3-cicd-pipeline)
4. [Troubleshooting](#troubleshooting)

---

## Phase 1: Local Testing (Start Here!)

**Goal:** Get your application running on your computer using Docker.

### Prerequisites

- [ ] Install **Docker Desktop** from https://www.docker.com/products/docker-desktop/
- [ ] Make sure Docker Desktop is running (you'll see a whale icon in your taskbar)

### Step 1: Create Your Environment File (2 minutes)

1. In your project folder, copy `.env.example` to `.env`:
   ```powershell
   cd C:\Users\vivek\OneDrive\Desktop\Projects\IBDealPipeline
   Copy-Item .env.example .env
   ```

2. Open `.env` file and customize these values:
   ```env
   MONGO_ROOT_PASSWORD=MySecurePassword123!
   JWT_SECRET=ThisIsMyVerySecretKeyForJWTTokensMinimum32Characters!
   ```

### Step 2: Start All Services (5 minutes)

**Option A - Using PowerShell Script (Recommended for Windows):**
```powershell
.\docker-manager.ps1 setup
```

**Option B - Using Docker Compose Directly:**
```powershell
docker-compose up -d
```

**What's happening?**
- Docker is downloading and starting 6 services:
  - Frontend (Angular)
  - Backend (Spring Boot)
  - MongoDB (Database)
  - Kafka (Message broker)
  - Zookeeper (Kafka coordinator)
  - Kafka UI (Monitoring tool)

### Step 3: Check If Everything Is Running (1 minute)

**Using PowerShell script:**
```powershell
.\docker-manager.ps1 health
```

**Or manually check:**
```powershell
docker-compose ps
```

You should see all services with status "Up" or "healthy".

### Step 4: Access Your Application

Open your browser and visit:

| Service | URL | What It Is |
|---------|-----|------------|
| **Frontend** | http://localhost | Your Angular web app |
| **Backend API** | http://localhost:8080 | REST API (test: http://localhost:8080/actuator/health) |
| **Kafka UI** | http://localhost:8081 | Message monitoring dashboard |

### Step 5: Stop Everything When Done

```powershell
.\docker-manager.ps1 stop
```

Or:
```powershell
docker-compose down
```

---

## ✅ Phase 1 Complete!

If you can access your frontend at http://localhost, **congratulations!** 🎉 Your application works locally.

**What you've learned:**
- ✅ Docker containers run your application
- ✅ Docker Compose manages multiple services
- ✅ Environment variables configure your app

---

## Phase 2: AWS Setup

**Goal:** Deploy your application to AWS cloud so it's accessible from anywhere.

### Prerequisites

- [ ] AWS Account (create free account at https://aws.amazon.com/)
- [ ] AWS CLI installed (https://aws.amazon.com/cli/)
- [ ] Credit card (AWS requires it, but won't charge if you stay in free tier)

### Understanding AWS Services You'll Use

| Service | What It Does | Cost (Approx) |
|---------|-------------|---------------|
| **ECS** | Runs your Docker containers in the cloud | ~$30-50/month |
| **ECR** | Stores your Docker images | ~$1-5/month |
| **RDS/DocumentDB** | Managed MongoDB database | ~$50-100/month |
| **ALB** | Distributes traffic to your app | ~$20/month |
| **MSK** | Managed Kafka service | ~$200/month |

**💡 Tip:** You can start without Kafka to save costs (~$200/month savings).

### Step 1: Configure AWS CLI (5 minutes)

1. **Get your AWS credentials:**
   - Go to AWS Console → IAM → Users → Your User → Security Credentials
   - Click "Create access key"
   - Save the Access Key ID and Secret Access Key

2. **Configure AWS CLI:**
   ```powershell
   aws configure
   ```
   
   Enter:
   - AWS Access Key ID: `[paste your access key]`
   - AWS Secret Access Key: `[paste your secret key]`
   - Default region: `us-east-1` (or your preferred region)
   - Default output format: `json`

### Step 2: Run Infrastructure Setup Script (15 minutes)

This script creates all necessary AWS resources automatically.

**Using WSL (Windows Subsystem for Linux):**
```bash
wsl
cd /mnt/c/Users/vivek/OneDrive/Desktop/Projects/IBDealPipeline
chmod +x aws/setup-aws-infrastructure.sh
./aws/setup-aws-infrastructure.sh
```

**What this creates:**
- ✅ VPC (Virtual Private Cloud) - your private network
- ✅ Subnets - network segments
- ✅ Security Groups - firewall rules
- ✅ ECS Cluster - container orchestration
- ✅ ECR Repositories - Docker image storage
- ✅ Load Balancers - traffic distribution
- ✅ CloudWatch Logs - monitoring

**⏱️ This takes about 10-15 minutes to complete.**

### Step 3: Store Secrets in AWS Secrets Manager (5 minutes)

Your application needs database passwords and JWT secrets. We store these securely in AWS Secrets Manager.

```bash
# MongoDB connection string
aws secretsmanager create-secret \
  --name /ibpipeline/mongodb/uri \
  --secret-string "mongodb://admin:MySecurePassword123@your-mongodb-host:27017/ibpipeline"

# JWT Secret
aws secretsmanager create-secret \
  --name /ibpipeline/jwt/secret \
  --secret-string "ThisIsMyVerySecretKeyForJWTTokensMinimum32Characters!"

# Kafka servers (optional - skip if not using Kafka)
aws secretsmanager create-secret \
  --name /ibpipeline/kafka/servers \
  --secret-string "your-kafka-broker:9092"
```

**💡 Note:** For MongoDB, you have two options:
- **Option A (Easier):** Use MongoDB Atlas (free tier) - https://www.mongodb.com/cloud/atlas
- **Option B (More Complex):** Set up Amazon DocumentDB

### Step 4: Build and Push Docker Images to ECR (10 minutes)

Now we need to get your Docker images into AWS.

```powershell
# Login to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [YOUR_AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com

# Build backend image
cd IBPipeline
docker build -t ibpipeline-backend:latest .

# Tag and push backend
docker tag ibpipeline-backend:latest [YOUR_AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/ibpipeline-backend:latest
docker push [YOUR_AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/ibpipeline-backend:latest

# Build frontend image
cd ../frontend
docker build -t ibpipeline-frontend:latest .

# Tag and push frontend
docker tag ibpipeline-frontend:latest [YOUR_AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/ibpipeline-frontend:latest
docker push [YOUR_AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/ibpipeline-frontend:latest
```

**Replace `[YOUR_AWS_ACCOUNT_ID]` with your actual AWS account ID** (12-digit number, find it in AWS Console top-right).

### Step 5: Deploy to ECS (5 minutes)

```bash
# Register task definitions
aws ecs register-task-definition --cli-input-json file://aws/backend-task-definition.json
aws ecs register-task-definition --cli-input-json file://aws/frontend-task-definition.json

# Create ECS services
aws ecs create-service \
  --cluster ibpipeline-cluster \
  --service-name backend-service \
  --task-definition ibpipeline-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-zzz],assignPublicIp=ENABLED}"

aws ecs create-service \
  --cluster ibpipeline-cluster \
  --service-name frontend-service \
  --task-definition ibpipeline-frontend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-zzz],assignPublicIp=ENABLED}"
```

**💡 Get subnet and security group IDs from the setup script output.**

### Step 6: Get Your Application URL

```bash
# Get frontend load balancer DNS
aws elbv2 describe-load-balancers --names ibpipeline-frontend-alb --query 'LoadBalancers[0].DNSName' --output text
```

**This URL is your application's public address!** Example: `ibpipeline-frontend-alb-123456789.us-east-1.elb.amazonaws.com`

---

## ✅ Phase 2 Complete!

Your application is now running in AWS cloud! 🌩️

**What you've learned:**
- ✅ AWS infrastructure setup
- ✅ Docker image registry (ECR)
- ✅ Container orchestration (ECS)
- ✅ Secure secret management
- ✅ Load balancing

---

## Phase 3: CI/CD Pipeline

**Goal:** Automatically deploy when you commit code to GitHub.

### Option 1: GitHub Actions (Recommended for Beginners)

**Step 1: Add AWS Credentials to GitHub Secrets**

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these:

| Name | Value |
|------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `AWS_REGION` | `us-east-1` (or your region) |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |

**Step 2: Enable GitHub Actions**

The workflow file is already created at `.github/workflows/ci-cd.yml`. GitHub will automatically detect it!

**Step 3: Test It**

1. Make a small code change
2. Commit and push:
   ```powershell
   git add .
   git commit -m "Test CI/CD pipeline"
   git push origin main
   ```

3. Watch the magic happen:
   - Go to your GitHub repo → **Actions** tab
   - You'll see the pipeline running!

**What happens automatically:**
1. ✅ Tests run (backend + frontend)
2. ✅ Docker images are built
3. ✅ Security scan with Trivy
4. ✅ Images pushed to ECR
5. ✅ ECS services updated
6. ✅ Health checks verify deployment

---

### Option 2: Jenkins (More Advanced)

Only use this if your company requires Jenkins.

**Step 1: Install Jenkins**

- Download from: https://www.jenkins.io/download/
- Install and access at: http://localhost:8080

**Step 2: Install Required Plugins**

In Jenkins:
1. Go to **Manage Jenkins** → **Manage Plugins**
2. Install these plugins:
   - Docker Pipeline
   - AWS Steps
   - Pipeline

**Step 3: Add AWS Credentials to Jenkins**

1. **Manage Jenkins** → **Manage Credentials** → **Global**
2. Add these credentials:
   - AWS Access Key ID (ID: `aws-credentials`)
   - AWS Secret Access Key
   - Docker Hub credentials (if needed)

**Step 4: Create Pipeline Job**

1. **New Item** → **Pipeline** → Name it "IBPipeline-Deploy"
2. Under **Pipeline** section:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: Your GitHub repo URL
   - Script Path: `Jenkinsfile`
3. Click **Save**

**Step 5: Run Pipeline**

Click **Build Now** and watch Jenkins deploy your application!

---

## ✅ Phase 3 Complete!

You now have fully automated deployments! 🎊

---

## 🔍 Troubleshooting

### Problem: Docker containers won't start

**Solution:**
```powershell
# Check logs
docker-compose logs

# Restart Docker Desktop
# Right-click Docker icon → Restart
```

### Problem: "Cannot connect to MongoDB"

**Solution:**
```powershell
# Check if MongoDB is running
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Problem: AWS CLI not found

**Solution:**
```powershell
# Install AWS CLI
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

### Problem: Port already in use (port 80 or 8080)

**Solution:**
```powershell
# Find what's using the port
netstat -ano | findstr :80

# Kill the process (replace PID with actual process ID)
taskkill /PID [PID] /F

# Or change port in docker-compose.yml
# Change "80:80" to "8081:80"
```

### Problem: AWS deployment fails

**Check:**
1. AWS credentials are correct: `aws sts get-caller-identity`
2. Secrets exist: `aws secretsmanager list-secrets`
3. ECR images exist: `aws ecr list-images --repository-name ibpipeline-backend`
4. ECS tasks are running: `aws ecs list-tasks --cluster ibpipeline-cluster`

---

## 📚 Useful Commands Reference

### Local Development

```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Rebuild images
docker-compose build --no-cache

# Clean everything
docker-compose down -v
```

### AWS Management

```bash
# Check ECS services
aws ecs list-services --cluster ibpipeline-cluster

# View task status
aws ecs describe-tasks --cluster ibpipeline-cluster --tasks [TASK_ARN]

# Update service (force new deployment)
aws ecs update-service --cluster ibpipeline-cluster --service backend-service --force-new-deployment

# View logs
aws logs tail /ecs/ibpipeline-backend --follow
```

---

## 🎯 Next Steps

1. **Set up custom domain** (optional)
   - Buy domain from Route 53 or Namecheap
   - Point it to your Load Balancer

2. **Enable HTTPS** (recommended for production)
   - Request SSL certificate in AWS Certificate Manager
   - Add certificate to Load Balancer

3. **Set up monitoring**
   - Configure CloudWatch alarms
   - Set up SNS notifications for errors

4. **Cost optimization**
   - Review AWS Cost Explorer monthly
   - Consider removing Kafka if not needed (~$200/month savings)
   - Use smaller ECS task sizes for development

---

## 🆘 Need Help?

**Resources:**
- Docker Documentation: https://docs.docker.com/
- AWS Free Tier: https://aws.amazon.com/free/
- AWS ECS Tutorial: https://aws.amazon.com/ecs/getting-started/
- Jenkins Documentation: https://www.jenkins.io/doc/

**Your created files:**
- 📄 `DOCKER-DEPLOYMENT.md` - Detailed technical documentation
- 📄 `SETUP-COMPLETE.md` - Complete setup reference
- 📄 `README-DOCKER.md` - Quick commands reference
- 📄 `ARCHITECTURE-DIAGRAMS.md` - Visual architecture

---

**Remember:** Start with Phase 1 (local testing) and only move to AWS when you're comfortable! 

You've got this! 💪
