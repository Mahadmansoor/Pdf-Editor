# Stage 1: Build the application
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.23-alpine
# Copy the built static files from the 'build' stage
COPY --from=build /app/build /usr/share/nginx/html
# Nginx will automatically serve the index.html file
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]