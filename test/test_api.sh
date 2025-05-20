#!/bin/bash

# Test the health endpoint
echo "Testing health endpoint..."
curl -s http://localhost:8080/health | jq

# Register a new user
echo -e "\nRegistering a new user..."
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser3","email":"test3@example.com","password":"password123"}' | jq

# Login with the new user
echo -e "\nLogging in with the new user..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test3@example.com","password":"password123"}' | jq -r '.token')

echo "Token: $TOKEN"

# Get chatrooms
echo -e "\nGetting chatrooms..."
curl -s -X GET http://localhost:8080/api/chatrooms \
  -H "Authorization: Bearer $TOKEN" | jq

# Create a new chatroom
echo -e "\nCreating a new chatroom..."
CHATROOM_ID=$(curl -s -X POST http://localhost:8080/api/chatrooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Chatroom"}' | jq -r '.chatroom.id')

echo "Chatroom ID: $CHATROOM_ID"

# Get messages from the chatroom
echo -e "\nGetting messages from the chatroom..."
curl -s -X GET http://localhost:8080/api/chatrooms/$CHATROOM_ID/messages \
  -H "Authorization: Bearer $TOKEN" | jq

# Send a message to the chatroom
echo -e "\nSending a message to the chatroom..."
curl -s -X POST http://localhost:8080/api/chatrooms/$CHATROOM_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message_type":"text","text_content":"Hello, this is a test message!"}' | jq

# Get messages from the chatroom again
echo -e "\nGetting messages from the chatroom again..."
curl -s -X GET http://localhost:8080/api/chatrooms/$CHATROOM_ID/messages \
  -H "Authorization: Bearer $TOKEN" | jq
