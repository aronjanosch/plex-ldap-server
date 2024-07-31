# Use an official Node runtime as a parent image
FROM node:14

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Make port 2389 available to the world outside this container
EXPOSE 2389

# Define environment variable
ENV NODE_ENV=development

# Run the application
CMD ["node", "index.js"]