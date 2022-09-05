# Use an official node runtime as a parent image
FROM node:16.13.1

# Set the working directory to /home/app
WORKDIR /app

# Bundle app source
COPY package*.json ./

# If you are building your code for production
# RUN npm install --only=production
RUN npm install

COPY . .
# Make port 8000 available to the world outside this container
EXPOSE 5002

CMD npm run dev
