# Use Node.js LTS
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies
RUN apk --no-cache add python3 make g++

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Copy only necessary files
COPY server.js .
COPY backend/ backend/
COPY frontend/ frontend/
COPY scripts/ scripts/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose the app port
EXPOSE 3001

# Start the application
CMD [ "node", "server.js" ]
