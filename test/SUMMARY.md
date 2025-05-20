# GinChat Test Environment Setup

## Overview

This test environment has been set up to help you test the GinChat application. It includes:

1. Docker Compose configuration for MySQL and MongoDB
2. Initialization scripts for both databases
3. Test scripts to verify the API functionality
4. Fixed backend code to properly initialize the databases

## Fixed Issues

The following issues have been fixed in the backend code:

1. In `chatroom_controller.go`:
   - Fixed the `CountDocuments` method call to properly capture both the count and error return values
   - Changed `userID, exists := c.Get("user_id")` to `_, exists := c.Get("user_id")` in the `GetChatrooms` function since the userID wasn't being used

2. In `message_controller.go`:
   - Fixed the condition for parsing the limit parameter to use `strconv.Atoi` instead of trying to get it from the context

3. In `main.go`:
   - Updated the MongoDB connection string to include the database name
   - Uncommented the database initialization code to ensure the databases are properly connected

## How to Use

1. Start the test environment:
   ```bash
   cd test
   ./run_test.sh
   ```

2. In a separate terminal, test the API:
   ```bash
   cd test
   ./test_api.sh
   ```

3. To clean up:
   ```bash
   cd test
   docker-compose down -v
   ```

## Next Steps

1. Test the WebSocket functionality
2. Implement the frontend to connect to the backend
3. Add more features to the chat application

## Troubleshooting

If you encounter any issues:

1. Check the logs of the backend server
2. Check the logs of the MySQL and MongoDB containers:
   ```bash
   docker logs ginchat-mysql
   docker logs ginchat-mongodb
   ```
3. Make sure the .env file is correctly set up
4. Ensure Docker is running and the ports are not in use
