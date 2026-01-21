.PHONY: help build up down restart logs clean test deploy

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "IBPipeline Docker Commands"
	@echo "=========================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development
build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d
	@echo "Waiting for services to be healthy..."
	@sleep 10
	@docker-compose ps
	@echo "\n✅ Services are running:"
	@echo "Frontend: http://localhost:80"
	@echo "Backend: http://localhost:8080"
	@echo "Kafka UI: http://localhost:8081"

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

logs-mongo: ## View MongoDB logs
	docker-compose logs -f mongodb

logs-kafka: ## View Kafka logs
	docker-compose logs -f kafka

# Testing
test: ## Run all tests
	@echo "Running backend tests..."
	cd IBPipeline && mvn test
	@echo "Running frontend tests..."
	cd frontend && npm run test -- --watch=false --code-coverage

test-backend: ## Run backend tests only
	cd IBPipeline && mvn test

test-frontend: ## Run frontend tests only
	cd frontend && npm run test -- --watch=false --code-coverage

# Cleanup
clean: ## Remove all containers, volumes, and images
	docker-compose down -v --remove-orphans
	docker system prune -f

clean-volumes: ## Remove all volumes
	docker-compose down -v

clean-images: ## Remove all project images
	docker rmi ibpipeline-backend ibpipeline-frontend || true

# Database
db-shell: ## Open MongoDB shell
	docker-compose exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin

db-backup: ## Backup MongoDB database
	@echo "Creating backup..."
	docker-compose exec mongodb mongodump --out /data/backup --authenticationDatabase admin -u admin -p admin123
	docker cp ibpipeline-mongodb:/data/backup ./backup
	@echo "✅ Backup saved to ./backup"

db-restore: ## Restore MongoDB database from backup
	@echo "Restoring from backup..."
	docker cp ./backup ibpipeline-mongodb:/data/backup
	docker-compose exec mongodb mongorestore /data/backup --authenticationDatabase admin -u admin -p admin123
	@echo "✅ Database restored"

# Health checks
health: ## Check health of all services
	@echo "Checking service health..."
	@curl -f http://localhost:80 > /dev/null 2>&1 && echo "✅ Frontend: OK" || echo "❌ Frontend: Failed"
	@curl -f http://localhost:8080/actuator/health > /dev/null 2>&1 && echo "✅ Backend: OK" || echo "❌ Backend: Failed"
	@docker-compose exec mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1 && echo "✅ MongoDB: OK" || echo "❌ MongoDB: Failed"
	@docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1 && echo "✅ Kafka: OK" || echo "❌ Kafka: Failed"

status: ## Show status of all services
	docker-compose ps

# Development helpers
dev-backend: ## Run backend in development mode
	cd IBPipeline && mvn spring-boot:run

dev-frontend: ## Run frontend in development mode
	cd frontend && npm start

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

# AWS Deployment
aws-setup: ## Setup AWS infrastructure
	chmod +x aws/setup-aws-infrastructure.sh
	./aws/setup-aws-infrastructure.sh

aws-deploy: ## Deploy to AWS ECS (requires Jenkins or manual push)
	@echo "Push to main branch to trigger deployment"
	@git status

# Production build
prod-build: ## Build production images
	docker build -t ibpipeline-backend:prod ./IBPipeline
	docker build -t ibpipeline-frontend:prod ./frontend
	@echo "✅ Production images built"

prod-run: ## Run production images locally
	docker run -d -p 8080:8080 --name backend-prod ibpipeline-backend:prod
	docker run -d -p 80:80 --name frontend-prod ibpipeline-frontend:prod
	@echo "✅ Production containers running"

# Monitoring
stats: ## Show container resource usage
	docker stats

inspect-backend: ## Inspect backend container
	docker-compose exec backend env

inspect-frontend: ## Inspect frontend container
	docker-compose exec frontend env

# Quick actions
rebuild: down clean build up ## Rebuild and restart everything

quick-start: ## Quick start for first time setup
	@echo "Setting up IBPipeline..."
	cp .env.example .env
	docker-compose build
	docker-compose up -d
	@echo "\n✅ Setup complete!"
	@echo "Frontend: http://localhost:80"
	@echo "Backend: http://localhost:8080"
	@echo "Kafka UI: http://localhost:8081"
