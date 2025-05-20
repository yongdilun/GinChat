# GinChat Test Environment

This folder contains scripts and configuration files to set up a test environment for the GinChat application.

## Prerequisites

- Docker and Docker Compose
- Go 1.16+
- curl and jq (for testing the API)

## Setup

1. Start the test environment:

```bash
./run_test.sh
```

This script will:
- Start MySQL and MongoDB containers using Docker Compose
- Copy the .env file to the backend directory
- Run the backend server

2. Test the API:

```bash
./test_api.sh
```

This script will:
- Test the health endpoint
- Register a new user
- Login with the new user
- Get chatrooms
- Create a new chatroom
- Get messages from the chatroom
- Send a message to the chatroom
- Get messages from the chatroom again

## Database Information

### MySQL

- Host: localhost
- Port: 3306
- Username: ginchat
- Password: ginchat
- Database: ginchat

### MongoDB

- Host: localhost
- Port: 27017
- Username: root
- Password: password
- Database: ginchat

## Cleanup

To stop and remove the containers:

```bash
docker-compose down
```

To stop and remove the containers and volumes:

```bash
docker-compose down -v
```
