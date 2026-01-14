# ----------- Build Stage -----------
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom and download dependencies first (better layer caching)
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests

# ----------- Runtime Stage -----------
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Environment variables will be provided later (Docker Compose / IntelliJ)
ENTRYPOINT ["java", "-jar", "app.jar"]
