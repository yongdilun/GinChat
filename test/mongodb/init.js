// Switch to the ginchat database
db = db.getSiblingDB('ginchat');

// Create collections
db.createCollection('chatrooms');
db.createCollection('messages');

// Insert sample chatrooms
db.chatrooms.insertMany([
  {
    _id: ObjectId(),
    name: "General",
    created_by: 1, // testuser1
    created_at: new Date(),
    members: [
      {
        user_id: 1,
        username: "testuser1",
        joined_at: new Date()
      }
    ]
  },
  {
    _id: ObjectId(),
    name: "Random",
    created_by: 2, // testuser2
    created_at: new Date(),
    members: [
      {
        user_id: 2,
        username: "testuser2",
        joined_at: new Date()
      }
    ]
  }
]);

// Get the chatroom IDs
const generalChatroom = db.chatrooms.findOne({ name: "General" });
const randomChatroom = db.chatrooms.findOne({ name: "Random" });

// Insert sample messages
if (generalChatroom) {
  db.messages.insertMany([
    {
      _id: ObjectId(),
      chatroom_id: generalChatroom._id,
      sender_id: 1,
      sender_name: "testuser1",
      message_type: "text",
      text_content: "Hello, welcome to the General chatroom!",
      sent_at: new Date()
    },
    {
      _id: ObjectId(),
      chatroom_id: generalChatroom._id,
      sender_id: 3,
      sender_name: "admin",
      message_type: "text",
      text_content: "This is a test message from admin.",
      sent_at: new Date()
    }
  ]);
}

if (randomChatroom) {
  db.messages.insertMany([
    {
      _id: ObjectId(),
      chatroom_id: randomChatroom._id,
      sender_id: 2,
      sender_name: "testuser2",
      message_type: "text",
      text_content: "Hello, welcome to the Random chatroom!",
      sent_at: new Date()
    }
  ]);
}

// Display the collections
print("Chatrooms:");
db.chatrooms.find().forEach(printjson);

print("\nMessages:");
db.messages.find().forEach(printjson);
