# GinChat Database Initialization

This directory contains the database initialization script for the GinChat application.

## ⚠️ WARNING

**The `init_db.go` script will completely clear ALL existing data in both MySQL and MongoDB databases!**

## Overview

The initialization script:

- `init_db.go` - A standalone Go program that clears all existing data and creates fresh database schema

## Prerequisites

- MySQL server running
- MongoDB server running
- Go 1.16+

## Environment Variables

The script reads environment variables from:
1. `backend/test/.env` (if exists)
2. `backend/.env` (fallback)
3. System environment variables (final fallback)

### Configuration Options:

**MySQL (choose one approach):**
```bash
# Option 1: Full URI (recommended for cloud databases)
MYSQL_URI=mysql://username:password@host:port/database?ssl-mode=REQUIRED

# Option 2: Individual parameters (for local development)
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=ginchat
```

**MongoDB (choose one approach):**
```bash
# Option 1: Full URI (recommended for MongoDB Atlas)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Option 2: Individual parameters (for local development)
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=ginchat
```

## Usage

**⚠️ WARNING: This will delete all existing data!**

```bash
cd test
go run init_db.go
```

Or from the backend directory:
```bash
go run test/init_db.go
```

## What it does

The initialization script will:

### MySQL Operations:
1. Connect to MySQL database
2. **Drop the `users` table** if it exists (⚠️ **DATA LOSS**)
3. Create fresh `users` table with current schema
4. Apply all GORM migrations

### MongoDB Operations:
1. Connect to MongoDB database
2. **Drop existing collections**: `chatrooms`, `messages`, `chatroom_members` (⚠️ **DATA LOSS**)
3. Create fresh empty collections
4. Prepare collections for application use

## Expected Output

```
=== GinChat Database Initialization ===
WARNING: This will clear ALL existing data in both MySQL and MongoDB!
========================================
Loaded environment variables from ../.env
Connected to MySQL database successfully
Clearing all MySQL data...
Dropping existing users table
Schema migration completed
MySQL database initialization completed - ready for use
Connected to MongoDB database successfully
Clearing all MongoDB data...
Dropping existing collection: chatrooms
Dropping existing collection: messages
Creating fresh MongoDB collections...
Created chatrooms collection
Created messages collection
Created chatroom_members collection
MongoDB database initialization completed - ready for use
========================================
✅ Database initialization completed successfully!
✅ All existing data has been cleared
✅ Fresh database schema created
✅ Ready for application use
========================================
```

## When to Use

- **Development**: Reset your local database to a clean state
- **Testing**: Before running integration tests that require a clean database
- **Deployment**: Setting up a new environment
- **Schema Updates**: After making changes to database models

## Safety Notes

- **NEVER run this script against production databases**
- Always backup important data before running
- Verify your environment variables point to the correct databases
- The script will show which database it's connecting to in the logs


