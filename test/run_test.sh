#!/bin/bash

# Start the databases
echo "Starting MySQL and MongoDB containers..."
docker-compose up -d

# Wait for the databases to be ready
echo "Waiting for databases to be ready..."
sleep 10

# Copy the .env file to the backend directory
echo "Copying .env file to backend directory..."
cp .env ../

# Run the backend
echo "Starting the backend server..."
cd ..
go run main.go
