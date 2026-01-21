# Complete CI/CD Setup Guide with Jenkins

## Architecture Overview

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   GitHub     │─────▶│   Webhook    │─────▶│   Jenkins    │─────▶│   AWS ECS    │
│   (main)     │      │   Trigger    │      │  Container   │      │   (Deploy)   │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
```

**Flow:**
1. You push code to GitHub `main` branch
2. GitHub webhook triggers Jenkins
3. Jenkins pulls code and runs Jenkinsfile
4. Jenkins builds Docker images
5. Jenkins pushes images to AWS ECR
6. Jenkins deploys to AWS ECS
7. Application auto-updates!

---

## Quick Start (Local Development)

### 1. Start All Services Including Jenkins

```bash
# Start all containers
docker-compose up -d

# Check status
docker-compose ps

# You should see:
# - mongodb
# - zookeeper
# - kafka
# - backend
# - frontend
# - kafka-ui
# - jenkins  ← NEW!
```

### 2. Configure Jenkins

```bash
# Run setup script
chmod +x setup-jenkins.sh
./setup-jenkins.sh

# This will show you:
# - Jenkins initial password
# - Access URL (http://localhost:8082)
# - Configuration steps
```

### 3. Access Jenkins

- **URL**: http://localhost:8082
- **Initial Password**: (shown by setup script)
- **Services**:
  - Frontend: http://localhost
  - Backend: http://localhost:8080
  - Kafka UI: http://localhost:8081
  - Jenkins: http://localhost:8082

---

## Complete Setup Steps

### Part 1: GitHub Repository

1. **Create GitHub Repository**
   ```bash
   # In your project folder
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR-USERNAME/IBDealPipeline.git
   git push -u origin main
   ```

2. **Create GitHub Personal Access Token**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token
   - Select scopes: `repo`, `admin:repo_hook`
   - Copy the token (save it securely!)

### Part 2: Jenkins Configuration

1. **Initial Setup** (first time only)
   - Open http://localhost:8082
   - Enter initial admin password (from setup-jenkins.sh output)
   - Click "Install suggested plugins"
   - Create admin user (remember credentials!)

2. **Install Additional Plugins**
   - Go to: Manage Jenkins → Plugins → Available plugins
   - Search and install:
     - ✅ GitHub Integration Plugin
     - ✅ Docker Plugin
     - ✅ Docker Pipeline Plugin
     - ✅ AWS Steps Plugin
     - ✅ CloudBees AWS Credentials Plugin
   - Click "Install" and restart Jenkins

3. **Add Credentials** (Manage Jenkins → Credentials → System → Global credentials)

   **a. GitHub Token:**
   - Click "Add Credentials"
   - Kind: **Secret text**
   - Scope: Global
   - Secret: `<your-github-token>`
   - ID: `github-token`
   - Description: GitHub Access Token
   - Click "Create"

   **b. AWS Credentials:**
   - Click "Add Credentials"
   - Kind: **AWS Credentials**
   - ID: `aws-credentials`
   - Access Key ID: `<your-aws-access-key>`
   - Secret Access Key: `<your-aws-secret-key>`
   - Description: AWS Deployment Credentials
   - Click "Create"

   **c. AWS Account ID:**
   - Click "Add Credentials"
   - Kind: **Secret text**
   - Secret: `<your-12-digit-aws-account-id>`
   - ID: `aws-account-id`
   - Description: AWS Account ID
   - Click "Create"

4. **Create Pipeline Job**
   - Click "New Item"
   - Name: `IBPipeline-Deploy`
   - Type: **Pipeline**
   - Click "OK"
   
   **Configure Pipeline:**
   - Description: `IBPipeline CI/CD Pipeline`
   - ✅ Check "GitHub project"
     - Project url: `https://github.com/YOUR-USERNAME/IBDealPipeline`
   - ✅ Check "Build Triggers" → "GitHub hook trigger for GITScm polling"
   - Pipeline:
     - Definition: **Pipeline script from SCM**
     - SCM: **Git**
     - Repository URL: `https://github.com/YOUR-USERNAME/IBDealPipeline.git`
     - Credentials: Select `github-token`
     - Branch Specifier: `*/main`
     - Script Path: `Jenkinsfile`
   - Click "Save"

### Part 3: GitHub Webhook (For Automatic Triggers)

**Option A: Local Testing (Skip webhook, use manual builds)**
- Just click "Build Now" in Jenkins to test

**Option B: Public Deployment (Requires public IP/domain)**

1. **Get Jenkins Public URL**
   - If Jenkins on EC2: `http://YOUR-EC2-PUBLIC-IP:8082`
   - If using ngrok: `https://YOUR-NGROK-URL`

2. **Add Webhook in GitHub**
   - Go to your GitHub repo → Settings → Webhooks → Add webhook
   - Payload URL: `http://YOUR-PUBLIC-IP:8082/github-webhook/`
   - Content type: `application/json`
   - Secret: (leave empty or add one)
   - Which events: "Just the push event"
   - ✅ Active
   - Click "Add webhook"

3. **Test Webhook**
   - Make a change and push to main
   - Jenkins should automatically trigger!

---

## AWS Deployment Setup

### Option 1: Deploy Everything to AWS (Jenkins + App)

**Architecture:**
- EC2 Instance running Docker Compose (all containers)
- Elastic IP for stable address
- Security groups for ports 80, 8080, 8082

**Steps:**

1. **Launch EC2 Instance**
   ```bash
   # Use Ubuntu 22.04 LTS
   # Instance type: t3.medium (2 vCPU, 4GB RAM)
   # Storage: 30GB
   # Security Group: Allow ports 22, 80, 8080, 8082
   ```

2. **SSH to EC2 and Setup**
   ```bash
   # Install Docker & Docker Compose
   sudo apt update
   sudo apt install -y docker.io docker-compose git
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker ubuntu

   # Clone your repo
   git clone https://github.com/YOUR-USERNAME/IBDealPipeline.git
   cd IBDealPipeline

   # Start all services
   docker-compose up -d

   # Configure Jenkins (follow Part 2 above)
   ```

3. **Update Environment Variables**
   - Update `.env` file with production values
   - Update JWT_SECRET with strong value
   - Update MONGO_ROOT_PASSWORD

4. **Configure GitHub Webhook**
   - Use EC2 public IP: `http://YOUR-EC2-IP:8082/github-webhook/`

### Option 2: Deploy App to ECS, Keep Jenkins Local

**Architecture:**
- Jenkins runs locally (or on separate EC2)
- App deployed to ECS Fargate
- Jenkins builds and deploys to ECS

**Steps:**

1. **Setup AWS Infrastructure**
   ```bash
   cd aws
   chmod +x setup-aws-infrastructure.sh
   ./setup-aws-infrastructure.sh
   ```

2. **Configure Jenkins** (same as Part 2 above)

3. **First Deployment**
   - In Jenkins, click "Build Now"
   - Jenkins will:
     - Build Docker images
     - Push to ECR
     - Deploy to ECS
   - Check AWS Console for deployment status

4. **Subsequent Deployments**
   - Just push to GitHub main branch
   - Jenkins automatically builds and deploys!

---

## Testing the Complete Workflow

### Test 1: Manual Build

1. Open Jenkins: http://localhost:8082
2. Click on "IBPipeline-Deploy"
3. Click "Build Now"
4. Watch the build progress
5. Check Console Output for any errors

### Test 2: Automatic Build (GitHub Push)

1. Make a code change
   ```bash
   echo "// Test change" >> IBPipeline/src/main/java/org/example/ibpipeline/IbPipelineApplication.java
   git add .
   git commit -m "Test CI/CD"
   git push origin main
   ```

2. Jenkins should automatically start building!
3. Check Jenkins dashboard for build status

### Test 3: Verify Deployment

1. If deployed to EC2:
   - Frontend: http://YOUR-EC2-IP
   - Backend: http://YOUR-EC2-IP:8080/api/auth/login

2. If deployed to ECS:
   - Get ALB DNS from AWS Console
   - Frontend: http://ALB-DNS-NAME

---

## Common Issues & Solutions

### Issue 1: Jenkins Can't Connect to GitHub
**Solution:**
- Verify GitHub token has correct permissions
- Check token is not expired
- Test: `git clone https://<TOKEN>@github.com/YOUR-USERNAME/IBDealPipeline.git`

### Issue 2: Jenkins Can't Build Docker Images
**Solution:**
- Verify Docker socket is mounted: `/var/run/docker.sock`
- Check Jenkins user has Docker permissions
- Run: `docker exec -it ibpipeline-jenkins docker ps`

### Issue 3: Jenkins Can't Deploy to AWS
**Solution:**
- Verify AWS credentials are correct
- Check AWS region in Jenkinsfile matches your setup
- Test AWS CLI: `docker exec -it ibpipeline-jenkins aws sts get-caller-identity`

### Issue 4: Webhook Not Triggering
**Solution:**
- Check webhook delivery in GitHub (Settings → Webhooks → Recent Deliveries)
- Verify Jenkins URL is publicly accessible
- Check Jenkins webhook URL format: `http://IP:8082/github-webhook/` (trailing slash!)
- Ensure "GitHub hook trigger" is enabled in Jenkins job

---

## Port Reference

| Service    | Local Port | Description                |
|------------|-----------|----------------------------|
| Frontend   | 80        | Angular application        |
| Backend    | 8080      | Spring Boot API           |
| Kafka UI   | 8081      | Kafka monitoring          |
| Jenkins    | 8082      | CI/CD server              |
| MongoDB    | 27017     | Database (internal)       |
| Kafka      | 9092/9093 | Message broker (internal) |
| Zookeeper  | 2181      | Kafka coordination (internal) |

---

## Maintenance Commands

```bash
# View all logs
docker-compose logs -f

# View Jenkins logs only
docker-compose logs -f jenkins

# Restart Jenkins
docker-compose restart jenkins

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Remove all containers and volumes (CAUTION!)
docker-compose down -v

# Update Jenkins
docker-compose pull jenkins
docker-compose up -d jenkins
```

---

## Next Steps After Setup

1. ✅ Test local development workflow
2. ✅ Commit and push to GitHub
3. ✅ Verify Jenkins triggers automatically
4. ✅ Deploy to AWS (EC2 or ECS)
5. ✅ Configure custom domain (optional)
6. ✅ Setup SSL/HTTPS (optional)
7. ✅ Configure monitoring and alerts
8. ✅ Setup database backups

---

## Security Checklist

- [ ] Change default admin passwords
- [ ] Update JWT_SECRET in production
- [ ] Use strong MongoDB password
- [ ] Enable HTTPS for Jenkins
- [ ] Restrict security group rules
- [ ] Enable AWS CloudWatch logs
- [ ] Setup backup strategy
- [ ] Enable Docker security scanning
- [ ] Rotate AWS credentials regularly
- [ ] Use AWS Secrets Manager for production

---

Your complete CI/CD pipeline is ready! 🚀
