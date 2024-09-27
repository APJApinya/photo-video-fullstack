# Stage 1: Build frontend
FROM node:18 AS frontend-build

WORKDIR /app/frontend

# Copy frontend package.json and package-lock.json
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the frontend code
COPY frontend/ ./

# Build the frontend for production
RUN npm run build

# Stage 2: Build backend
FROM node:18 AS backend-build

WORKDIR /app/backend

# Copy backend package.json and package-lock.json
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install

# Copy the rest of the backend code
COPY backend/ ./

# Stage 3: Production image
FROM node:18

WORKDIR /app

# Install FFmpeg for backend use
RUN apt-get update && apt-get install -y ffmpeg

# Copy frontend build artifacts from frontend-build stage
COPY --from=frontend-build /app/frontend/build /app/frontend

# Copy backend code from backend-build stage
COPY --from=backend-build /app/backend /app/backend

# Install serve to serve the frontend build files
RUN npm install -g serve

# Set NODE_ENV to production
ENV NODE_ENV production
ENV COGNITO_POOL_ID=ap-southeast-2_tS0yDXCN3
ENV COGNITO_POOL_APP_ID=8eg6dbrtk09o7km999e6jih8f
ENV AWS_BUCKET_NAME=n11780100-assignment2
ENV QUT_USERNAME=n11780100@qut.edu.au

# Expose ports for frontend and backend
EXPOSE 80 3000

# Start both frontend and backend
CMD sh -c "serve -s /app/frontend -l 80 & node /app/backend/app.js"
