# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the application code to the working directory
COPY . .

# Expose the port on which your LDAP server listens (e.g., 389)
EXPOSE 389

# Specify the command to run your application
CMD ["node", "index.js"]