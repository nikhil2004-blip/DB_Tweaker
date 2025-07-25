# Use Node.js LTS
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Start the application
CMD [ "node", "server.js" ]
