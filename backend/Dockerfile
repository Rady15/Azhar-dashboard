# Use official Node.js runtime as a parent image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --only=production

# Bundle app source
COPY . .

# Expose port 7860 (default port for Hugging Face Spaces)
EXPOSE 7860

# Set environment variables
ENV PORT=7860
ENV NODE_ENV=production

# Start the application
CMD [ "node", "src/server.js" ]
