# ----------- Build Stage -----------
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code and build
COPY . .
RUN npm run build -- --configuration production

# ----------- Runtime Stage -----------
FROM nginx:1.27-alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built Angular app from build stage
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Create runtime config injection script
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-inject-env.sh && \
    echo 'if [ -n "$API_URL" ]; then' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  echo "Injecting API_URL: $API_URL"' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.html" \) -exec sed -i "s|http://localhost:8080/api|$API_URL|g" {} \;' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo 'fi' >> /docker-entrypoint.d/40-inject-env.sh && \
    chmod +x /docker-entrypoint.d/40-inject-env.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
