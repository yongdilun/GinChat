# GinChat Test Database Initialization

This directory contains code to initialize the MySQL and MongoDB databases with test data for the GinChat application.

## Overview

The test environment consists of:

- `init_db.go` - A standalone Go program that initializes both MySQL and MongoDB databases with test data

## Prerequisites

- MySQL server running
- MongoDB server running
- Go 1.16+

## Setup

1. Make sure you have a `.env` file in the backend directory with your database credentials:

```
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=ginchat

# MongoDB Configuration
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=ginchat
# MONGO_USER=root       # Optional for local MongoDB without authentication
# MONGO_PASSWORD=password  # Optional for local MongoDB without authentication
```

2. Run the database initialization:

```bash
cd test
go run init_db.go
```

The initialization script will read the `.env` file from the parent directory (backend/.env).

## What it does

The initialization code will:

1. Connect to the MySQL database
2. Create the `users` table if it doesn't exist
3. Create test users if they don't exist
4. Connect to the MongoDB database
5. Create the `chatrooms` and `messages` collections if they don't exist
6. Create test chatrooms and messages if they don't exist

## Test Data

### MySQL

The following test users will be created:

1. Username: `testuser1`, Email: `test1@example.com`, Password: `password123`
2. Username: `testuser2`, Email: `test2@example.com`, Password: `password123`
3. Username: `admin`, Email: `admin@example.com`, Password: `password123`

### MongoDB

The following test chatrooms will be created:

1. Name: `General`, Created by: `testuser1`
2. Name: `Random`, Created by: `testuser2`

Each chatroom will have some test messages.


