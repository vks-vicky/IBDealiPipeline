# IBPipeline - Docker & AWS Deployment Guide

## 📦 Docker Containerization

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Frontend   │  │   Backend    │  │   MongoDB    │     │
│  │  (Angular +  │◄─┤ (Spring Boot)│◄─┤  (Database)  │     │
│  │    Nginx)    │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│        :80              :8080             :27017           │
│                            │                               │
│                            ▼                               │
│                    ┌──────────────┐                        │
│                    │    Kafka     │                        │
│                    │ (Message Bus)│                        │
│                    └──────────────┘                        │
│                         :9092                              │
│                            │                               │
│                            ▼                               │
│                    ┌──────────────┐                        │
│                    │  Zookeeper   │                        │
│                    └──────────────┘                        │
│                         :2181                              │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker 24.0+
- Docker Compose 2.20+
- Node.js 22+ (for local development)
- Java 17+ (for local development)
- Git

### Local Development with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd IBDealPipeline
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env and set your values
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Check service health**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

5. **Access applications**
   - Frontend: http://localhost:80
   - Backend API: http://localhost:8080/api
   - Kafka UI: http://localhost:8081
   - MongoDB: mongodb://localhost:27017

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Volumes
```bash
docker-compose down -v
```

## 🏗️ Building Individual Images

### Backend (Spring Boot)
```bash
cd IBPipeline
docker build -t ibpipeline-backend:latest .
docker run -p 8080:8080 \
  -e SPRING_DATA_MONGODB_URI=mongodb://mongodb:27017/ibpipeline \
  -e JWT_SECRET=your-secret-key \
  ibpipeline-backend:latest
```

### Frontend (Angular + Nginx)
```bash
cd frontend
docker build -t ibpipeline-frontend:latest .
docker run -p 80:80 \
  -e API_URL=http://backend:8080/api \
  ibpipeline-frontend:latest
```

## 🔐 Environment Variables

### Backend Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `SPRING_DATA_MONGODB_URI` | MongoDB connection string | `mongodb://mongodb:27017/ibpipeline` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Required |
| `JWT_EXPIRATION` | Token expiration in milliseconds | `86400000` (24h) |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | Kafka broker address | `kafka:9092` |
| `SPRING_PROFILES_ACTIVE` | Spring profile | `prod` |

### Frontend Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Backend API URL | `http://backend:8080/api` |

### MongoDB Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_INITDB_ROOT_USERNAME` | Root username | `admin` |
| `MONGO_INITDB_ROOT_PASSWORD` | Root password | Set in `.env` |
| `MONGO_INITDB_DATABASE` | Initial database | `ibpipeline` |

## 🐋 Docker Compose Services

### Services Overview
- **frontend**: Angular app served by Nginx (port 80)
- **backend**: Spring Boot REST API (port 8080)
- **mongodb**: MongoDB 8.0 database (port 27017)
- **kafka**: Apache Kafka message broker (port 9092)
- **zookeeper**: Kafka dependency (port 2181)
- **kafka-ui**: Kafka management UI (port 8081)

### Health Checks
All services include health checks:
- Frontend: `wget http://localhost:80`
- Backend: `wget http://localhost:8080/actuator/health`
- MongoDB: `mongosh --eval "db.adminCommand('ping')"`
- Kafka: `kafka-broker-api-versions --bootstrap-server localhost:9092`

### Persistent Volumes
- `mongodb_data`: MongoDB database files
- `mongodb_config`: MongoDB configuration
- `zookeeper_data`: Zookeeper data
- `kafka_data`: Kafka logs and data
- `backend_logs`: Application logs

## 🌩️ AWS ECS Deployment

### Architecture on AWS
```
Internet
    │
    ▼
┌─────────────────┐
│  Route 53 DNS   │
└─────────────────┘
    │
    ▼
┌─────────────────┐         ┌─────────────────┐
│ CloudFront CDN  │◄────────┤      WAF        │
└─────────────────┘         └─────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│         Application Load Balancer           │
│  (Frontend ALB + Backend ALB)               │
└─────────────────────────────────────────────┘
    │                    │
    ▼                    ▼
┌──────────┐      ┌──────────┐
│   ECS    │      │   ECS    │
│ Frontend │      │ Backend  │
│ Service  │      │ Service  │
└──────────┘      └──────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │                        │
          │  DocumentDB (MongoDB)  │
          │  or MongoDB Atlas      │
          │                        │
          └────────────────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │                        │
          │  Amazon MSK (Kafka)    │
          │  or Confluent Cloud    │
          │                        │
          └────────────────────────┘
```

### Prerequisites for AWS
1. AWS Account with appropriate permissions
2. AWS CLI configured
3. Jenkins server with Docker and AWS CLI
4. ECR repositories created
5. ECS cluster created
6. Secrets stored in AWS Secrets Manager

### Setup AWS Infrastructure

1. **Run infrastructure setup script**
   ```bash
   chmod +x aws/setup-aws-infrastructure.sh
   ./aws/setup-aws-infrastructure.sh
   ```

2. **Create AWS Secrets Manager secrets**
   ```bash
   # MongoDB URI
   aws secretsmanager create-secret \
     --name ibpipeline/mongodb/uri \
     --secret-string "mongodb://username:password@host:27017/ibpipeline" \
     --region us-east-1

   # JWT Secret
   aws secretsmanager create-secret \
     --name ibpipeline/jwt/secret \
     --secret-string "your-256-bit-secret-key-min-32-characters" \
     --region us-east-1

   # Kafka Bootstrap Servers
   aws secretsmanager create-secret \
     --name ibpipeline/kafka/bootstrap-servers \
     --secret-string "kafka-broker-1:9092,kafka-broker-2:9092" \
     --region us-east-1
   ```

3. **Register ECS Task Definitions**
   ```bash
   # Backend
   aws ecs register-task-definition \
     --cli-input-json file://aws/backend-task-definition.json

   # Frontend
   aws ecs register-task-definition \
     --cli-input-json file://aws/frontend-task-definition.json
   ```

4. **Create ECS Services**
   ```bash
   # Backend Service
   aws ecs create-service \
     --cluster ibpipeline-cluster \
     --service-name ibpipeline-backend-service \
     --task-definition ibpipeline-backend \
     --desired-count 2 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx]}"

   # Frontend Service
   aws ecs create-service \
     --cluster ibpipeline-cluster \
     --service-name ibpipeline-frontend-service \
     --task-definition ibpipeline-frontend \
     --desired-count 2 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx]}"
   ```

## 🔄 CI/CD Pipeline (Jenkins)

### Jenkins Setup

1. **Install required plugins**
   - Docker Pipeline
   - AWS Steps
   - Pipeline AWS
   - Git
   - Credentials Binding

2. **Configure credentials in Jenkins**
   - AWS credentials: `aws-credentials`
   - AWS Account ID: `aws-account-id`

3. **Create new Pipeline job**
   - Point to your Git repository
   - Use `Jenkinsfile` in root directory

### Pipeline Stages

1. **Checkout**: Clone repository
2. **Validate**: Validate POM and package.json
3. **Test**: Run backend and frontend tests
4. **Build**: Build Docker images
5. **Security Scan**: Scan images for vulnerabilities (Trivy)
6. **Push to ECR**: Push images to AWS ECR
7. **Deploy to ECS**: Update ECS services
8. **Health Check**: Verify deployment

### Trigger Pipeline

```bash
# Push to main branch triggers automatic deployment
git push origin main
```

### Manual Build
```bash
# In Jenkins UI, click "Build Now"
```

## 🔍 Monitoring & Logging

### CloudWatch Logs
```bash
# View backend logs
aws logs tail /ecs/ibpipeline-backend --follow

# View frontend logs
aws logs tail /ecs/ibpipeline-frontend --follow
```

### Application Metrics
- Backend health: `http://<alb-dns>:8080/actuator/health`
- Prometheus metrics: `http://<alb-dns>:8080/actuator/prometheus`

## 🐛 Troubleshooting

### Common Issues

#### Docker Compose fails to start
```bash
# Check logs
docker-compose logs

# Recreate containers
docker-compose down -v
docker-compose up -d --build
```

#### Backend can't connect to MongoDB
```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Verify connection string
docker-compose exec backend env | grep MONGODB
```

#### Frontend shows API errors
```bash
# Check backend health
curl http://localhost:8080/actuator/health

# Check nginx logs
docker-compose logs frontend

# Verify API URL
docker-compose exec frontend env | grep API_URL
```

#### Kafka connection issues
```bash
# Check Kafka is running
docker-compose logs kafka

# Check Zookeeper
docker-compose logs zookeeper

# Test Kafka connection
docker-compose exec kafka kafka-broker-api-versions --bootstrap-server kafka:9092
```

### AWS ECS Troubleshooting

#### Task fails to start
```bash
# Check task definition
aws ecs describe-task-definition --task-definition ibpipeline-backend

# Check service events
aws ecs describe-services --cluster ibpipeline-cluster --services ibpipeline-backend-service

# Check CloudWatch logs
aws logs tail /ecs/ibpipeline-backend --follow
```

#### Health check failing
```bash
# Check container logs
aws ecs execute-command --cluster ibpipeline-cluster \
  --task <task-id> --container ibpipeline-backend \
  --interactive --command "/bin/sh"
```

## 📊 Performance Tuning

### Backend Optimization
```dockerfile
# Adjust JVM memory in Dockerfile
ENV JAVA_OPTS="-Xmx1024m -Xms512m -XX:MaxRAMPercentage=75.0"
```

### Frontend Optimization
- Gzip compression enabled in Nginx
- Static asset caching (1 year)
- Browser caching policies

### Database Optimization
- Indexes created automatically (see `init-mongo.js`)
- Connection pooling configured in Spring Boot

## 🔒 Security Best Practices

1. **Never commit secrets to Git**
   - Use `.env` file (git-ignored)
   - Use AWS Secrets Manager in production

2. **Use non-root users in containers**
   - Backend runs as `appuser` (UID 1001)
   - Nginx runs as `nginx` user

3. **Enable HTTPS in production**
   - Use AWS Certificate Manager
   - Configure ALB with SSL certificate

4. **Regular security updates**
   - Update base images regularly
   - Scan images with Trivy
   - Monitor CVE databases

## 📝 Maintenance

### Update Docker images
```bash
# Pull latest base images
docker-compose pull

# Rebuild with no cache
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

### Backup MongoDB
```bash
# Create backup
docker-compose exec mongodb mongodump --out /data/backup

# Copy backup to host
docker cp ibpipeline-mongodb:/data/backup ./backup
```

### Clean up Docker
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Spring Boot Docker](https://spring.io/guides/topicals/spring-boot-docker/)
- [Angular Production Build](https://angular.io/guide/deployment)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)

## 🆘 Support

For issues and questions:
1. Check CloudWatch Logs
2. Review Docker Compose logs
3. Check application health endpoints
4. Review Jenkins build logs
5. Contact DevOps team

---
**Last Updated**: January 2026
