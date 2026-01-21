# IBPipeline - Quick Start Guide

## 🚀 Local Development with Docker

### Start Everything
```bash
# Copy environment template
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Access Applications
- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:8080/api
  - Health: http://localhost:8080/actuator/health
- **Kafka UI**: http://localhost:8081
- **MongoDB**: mongodb://admin:admin123@localhost:27017

### Stop Services
```bash
docker-compose down
```

## 🏗️ Project Structure
```
IBDealPipeline/
├── frontend/                    # Angular 21 application
│   ├── Dockerfile              # Multi-stage build with Nginx
│   ├── nginx.conf              # Nginx configuration
│   ├── .dockerignore           # Docker ignore patterns
│   └── src/                    # Angular source code
├── IBPipeline/                 # Spring Boot application
│   ├── Dockerfile              # Multi-stage build with Maven
│   ├── .dockerignore           # Docker ignore patterns
│   ├── pom.xml                 # Maven dependencies
│   └── src/                    # Java source code
├── aws/                        # AWS deployment configurations
│   ├── backend-task-definition.json
│   ├── frontend-task-definition.json
│   └── setup-aws-infrastructure.sh
├── docker-compose.yml          # Complete stack definition
├── Jenkinsfile                 # CI/CD pipeline
├── init-mongo.js               # MongoDB initialization
├── .env.example                # Environment template
└── DOCKER-DEPLOYMENT.md        # Complete documentation
```

## 🐳 Individual Service Commands

### Backend
```bash
cd IBPipeline
docker build -t ibpipeline-backend .
docker run -p 8080:8080 ibpipeline-backend
```

### Frontend
```bash
cd frontend
docker build -t ibpipeline-frontend .
docker run -p 80:80 ibpipeline-frontend
```

## 🌩️ AWS Deployment

### Prerequisites
1. AWS CLI configured
2. Jenkins server running
3. AWS credentials in Jenkins

### Deploy to AWS ECS
```bash
# Setup infrastructure
./aws/setup-aws-infrastructure.sh

# Push code to trigger Jenkins pipeline
git push origin main
```

## 📊 Service Health Checks

### Check All Services
```bash
docker-compose ps
```

### Individual Health Checks
```bash
# Backend
curl http://localhost:8080/actuator/health

# Frontend
curl http://localhost:80

# MongoDB
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Kafka
docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

## 🔍 Troubleshooting

### View Service Logs
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
docker-compose logs kafka
```

### Restart Services
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Clean Restart
```bash
docker-compose down -v
docker-compose up -d --build
```

## 📝 Environment Variables

Copy `.env.example` to `.env` and customize:
- `MONGO_ROOT_PASSWORD`: MongoDB admin password
- `JWT_SECRET`: JWT signing secret (min 32 characters)
- `JWT_EXPIRATION`: Token expiration (default: 24 hours)

## 🔐 Default Credentials

### MongoDB
- Username: `admin`
- Password: `admin123` (change in `.env`)
- Database: `ibpipeline`

### Application
- Admin Username: `admin`
- Admin Password: `admin123` (created by init-mongo.js)

## 🛠️ Development Commands

### Rebuild After Code Changes
```bash
# Rebuild specific service
docker-compose up -d --build backend
docker-compose up -d --build frontend

# Rebuild all
docker-compose up -d --build
```

### Execute Commands in Containers
```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# MongoDB shell
docker-compose exec mongodb mongosh
```

### View Resource Usage
```bash
docker stats
```

## 📚 Documentation

For detailed information, see [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md)

## 🆘 Quick Help

| Issue | Solution |
|-------|----------|
| Port already in use | `docker-compose down` and check other services |
| MongoDB connection failed | Check `SPRING_DATA_MONGODB_URI` in backend logs |
| Frontend can't reach backend | Verify `API_URL` environment variable |
| Kafka won't start | Ensure Zookeeper is healthy first |
| Services won't stop | `docker-compose down -v --remove-orphans` |

---
**Need Help?** Check logs with `docker-compose logs -f [service-name]`
