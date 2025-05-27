#!/bin/bash

# Simple script to optimize GinChat database from backend directory
# This script loads the .env file and runs the indexing optimization

echo "🚀 GinChat Database Optimization"
echo "================================="

# Check if we're in the backend directory
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Please run this script from the backend directory:"
    echo "cd backend && ./optimize_db.sh"
    exit 1
fi

echo "📄 Loading environment from .env..."

# Load environment variables from .env file
export $(grep -v '^#' .env | grep -v '^$' | xargs)

# Check if MONGO_URI is loaded
if [ -z "$MONGO_URI" ]; then
    echo "❌ Error: MONGO_URI not found in .env file"
    echo "Please ensure your .env file contains:"
    echo "MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database"
    exit 1
fi

echo "✅ Environment loaded successfully"
echo "🔗 MongoDB: ${MONGO_URI:0:30}..."

# Set MONGODB_URI for the Go script
export MONGODB_URI="$MONGO_URI"

# Navigate to scripts directory
cd scripts

echo "📁 Entering scripts directory..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Error: Go is not installed"
    echo "Please install Go from https://golang.org/dl/"
    exit 1
fi

echo "✅ Go found: $(go version)"

# Initialize Go module if needed
if [ ! -f "go.mod" ]; then
    echo "📦 Initializing Go module..."
    go mod init add_indexes
fi

# Install dependencies
echo "📦 Installing dependencies..."
go mod tidy

# Run the optimization
echo ""
echo "🔧 Running database optimization..."
echo "================================="

go run add_indexes.go

# Check result
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Database optimization completed!"
    echo "Your GinChat backend is now optimized for maximum performance."
else
    echo ""
    echo "❌ Optimization failed. Please check the errors above."
    exit 1
fi
