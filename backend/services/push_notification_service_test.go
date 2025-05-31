package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"testing"

	"github.com/ginchat/models"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var (
	testDB      *gorm.DB
	testMongoDB *mongo.Database
	service     *PushNotificationService
)

// Mock Expo Sender
type mockExpoSender struct {
	called bool
	tokens []string
	title  string
	body   string
	data   map[string]interface{}
}

func (m *mockExpoSender) send(tokens []string, title string, body string, data map[string]interface{}) error {
	m.called = true
	m.tokens = tokens
	m.title = title
	m.body = body
	m.data = data
	log.Printf("Mock send called with: tokens=%v, title=%s, body=%s, data=%v", tokens, title, body, data)
	return nil
}

func (m *mockExpoSender) reset() {
	m.called = false
	m.tokens = nil
	m.title = ""
	m.body = ""
	m.data = nil
}

// Setup for tests
func TestMain(m *testing.M) {
	// Setup GORM (SQLite in-memory)
	var err error
	testDB, err = gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to SQLite: %v", err)
	}
	err = testDB.AutoMigrate(&models.User{}, &models.PushToken{})
	if err != nil {
		log.Fatalf("Failed to migrate GORM models: %v", err)
	}

	// Setup MongoDB (using environment variable for connection string, or skip if not set)
	mongoURI := os.Getenv("MONGODB_URI_TEST")
	if mongoURI == "" {
		log.Println("MONGODB_URI_TEST not set, skipping MongoDB dependent tests or using mock MongoDB.")
		// For tests that absolutely need MongoDB and it's not available, they should be skipped.
		// Here, we'll allow service creation, but DB operations will fail if it's not a mock.
		// For now, we proceed, and tests not relying on actual Mongo interaction might pass.
	} else {
		clientOptions := options.Client().ApplyURI(mongoURI)
		client, err := mongo.Connect(context.Background(), clientOptions)
		if err != nil {
			log.Fatalf("Failed to connect to MongoDB: %v", err)
		}
		testMongoDB = client.Database("ginchat_test")
	}

	// Initialize service
	// Note: If testMongoDB is nil, MongoDB operations in the service will panic or error.
	// Tests need to account for this, ideally by using a mock MongoDB or ensuring a test instance is running.
	// For this specific set of tests, we will try to control the data flow such that direct mongo calls
	// for chatroom fetching are mimicked by pre-populating data or focusing on logic after data fetching.
	service = NewPushNotificationService(testDB, testMongoDB)


	// Run tests
	code := m.Run()

	// Teardown MongoDB connection if it was made
	if testMongoDB != nil {
		if err := testMongoDB.Client().Disconnect(context.Background()); err != nil {
			log.Printf("Failed to disconnect MongoDB: %v", err)
		}
	}

	os.Exit(code)
}

func TestSendMessageNotification_Basic(t *testing.T) {
	assert.NotNil(t, service, "Service should not be nil")
	if service == nil {
		t.Skip("Service not initialized, skipping test")
		return
	}
	if testMongoDB == nil {
		t.Skip("Skipping test: MONGODB_URI_TEST not set, MongoDB collection cannot be prepared.")
		return
	}


	mockSender := &mockExpoSender{}
	originalSender := service.sendExpoNotificationFunc
	service.sendExpoNotificationFunc = mockSender.send
	defer func() { service.sendExpoNotificationFunc = originalSender }() // Restore original

	// --- Test Data Setup ---
	senderUserID := uint(1)
	member2ID := uint(2)
	member3ID := uint(3)

	chatroomID := primitive.NewObjectID()
	chatroomName := "Test Chat Room"

	// Create a chatroom in the test MongoDB
	_, err := testMongoDB.Collection("chatrooms").InsertOne(context.Background(), &models.Chatroom{
		ID:   chatroomID,
		Name: chatroomName,
		Members: []models.ChatroomMember{
			{UserID: senderUserID, Username: "senderUser"},
			{UserID: member2ID, Username: "member2"},
			{UserID: member3ID, Username: "member3"},
		},
	})
	assert.NoError(t, err, "Failed to insert chatroom for test")
	defer testMongoDB.Collection("chatrooms").DeleteOne(context.Background(), primitive.M{"_id": chatroomID})


	// Create push tokens in the test GORM DB
	token2 := models.PushToken{UserID: member2ID, Token: "token2", IsActive: true}
	token3 := models.PushToken{UserID: member3ID, Token: "token3", IsActive: true}
	testDB.Create(&token2)
	testDB.Create(&token3)
	defer testDB.Delete(&token2)
	defer testDB.Delete(&token3)


	// --- Call the function ---
	err = service.SendMessageNotification(
		chatroomID.Hex(),
		senderUserID,
		"senderUser",
		"Hello World",
		chatroomName,
		[]uint{}, // No active users in this basic case
	)

	// --- Assertions ---
	assert.NoError(t, err)
	assert.True(t, mockSender.called, "sendExpoNotificationFunc should have been called")

	if !mockSender.called { // Guard against nil pointer dereference if not called
		t.FailNow() // Stop test if mock not called as other assertions will fail
	}

	// Assert tokens
	assert.ElementsMatch(t, []string{"token2", "token3"}, mockSender.tokens, "Tokens should match non-sender, non-active members")

	// Assert title and body
	expectedTitle := fmt.Sprintf("New message in %s", chatroomName)
	assert.Equal(t, expectedTitle, mockSender.title)
	expectedBody := "senderUser: Hello World"
	assert.Equal(t, expectedBody, mockSender.body)

	// Assert data payload
	assert.NotNil(t, mockSender.data)
	assert.Equal(t, chatroomID.Hex(), mockSender.data["chatroomId"])
	assert.Equal(t, senderUserID, mockSender.data["senderId"].(uint)) // Type assertion
	assert.Equal(t, "new_message", mockSender.data["type"])
	assert.Equal(t, "senderUser", mockSender.data["senderName"])
	assert.Equal(t, chatroomName, mockSender.data["chatroomName"])

	mockSender.reset() // Reset for next test
}

func TestSendMessageNotification_ActiveUsersExcluded(t *testing.T) {
	assert.NotNil(t, service, "Service should not be nil")
	if service == nil || testMongoDB == nil {
		t.Skip("Service or MongoDB not initialized, skipping test.")
		return
	}

	mockSender := &mockExpoSender{} // Use a local mock sender for better isolation
	originalSender := service.sendExpoNotificationFunc
	service.sendExpoNotificationFunc = mockSender.send
	defer func() { service.sendExpoNotificationFunc = originalSender }()

	senderUserID := uint(10)
	memberAID := uint(11)
	memberBID := uint(12) // This user will be active
	memberCID := uint(13)

	chatroomID := primitive.NewObjectID()
	chatroomName := "Active Users Test Room"

	_, err := testMongoDB.Collection("chatrooms").InsertOne(context.Background(), &models.Chatroom{
		ID:   chatroomID,
		Name: chatroomName,
		Members: []models.ChatroomMember{
			{UserID: senderUserID, Username: "sender"},
			{UserID: memberAID, Username: "memberA"},
			{UserID: memberBID, Username: "memberB"},
			{UserID: memberCID, Username: "memberC"},
		},
	})
	assert.NoError(t, err)
	defer testMongoDB.Collection("chatrooms").DeleteOne(context.Background(), primitive.M{"_id": chatroomID})

	tokenA := models.PushToken{UserID: memberAID, Token: "tokenA", IsActive: true}
	tokenB := models.PushToken{UserID: memberBID, Token: "tokenB", IsActive: true} // memberB has a token
	tokenC := models.PushToken{UserID: memberCID, Token: "tokenC", IsActive: true}
	testDB.Create(&tokenA)
	testDB.Create(&tokenB)
	testDB.Create(&tokenC)
	defer testDB.Delete(&tokenA)
	defer testDB.Delete(&tokenB)
	defer testDB.Delete(&tokenC)

	err = service.SendMessageNotification(
		chatroomID.Hex(),
		senderUserID,
		"sender",
		"Hello active test",
		chatroomName,
		[]uint{memberBID}, // memberB is active
	)

	assert.NoError(t, err)
	assert.True(t, mockSender.called, "sendExpoNotificationFunc should have been called")
	if !mockSender.called {
		t.FailNow()
	}

	assert.ElementsMatch(t, []string{"tokenA", "tokenC"}, mockSender.tokens, "Tokens should exclude active user memberB")
	expectedTitle := fmt.Sprintf("New message in %s", chatroomName)
	assert.Equal(t, expectedTitle, mockSender.title)
	assert.NotNil(t, mockSender.data)
	assert.Equal(t, chatroomID.Hex(), mockSender.data["chatroomId"])
}

func TestSendMessageNotification_AllOthersActive(t *testing.T) {
	assert.NotNil(t, service, "Service should not be nil")
	if service == nil || testMongoDB == nil {
		t.Skip("Service or MongoDB not initialized, skipping test.")
		return
	}

	mockSender := &mockExpoSender{}
	originalSender := service.sendExpoNotificationFunc
	service.sendExpoNotificationFunc = mockSender.send
	defer func() { service.sendExpoNotificationFunc = originalSender }()

	senderUserID := uint(20)
	memberAID := uint(21)
	memberBID := uint(22)

	chatroomID := primitive.NewObjectID()
	chatroomName := "All Active Test Room"

	_, err := testMongoDB.Collection("chatrooms").InsertOne(context.Background(), &models.Chatroom{
		ID:   chatroomID,
		Name: chatroomName,
		Members: []models.ChatroomMember{
			{UserID: senderUserID, Username: "sender"},
			{UserID: memberAID, Username: "memberA"},
			{UserID: memberBID, Username: "memberB"},
		},
	})
	assert.NoError(t, err)
	defer testMongoDB.Collection("chatrooms").DeleteOne(context.Background(), primitive.M{"_id": chatroomID})

	tokenA := models.PushToken{UserID: memberAID, Token: "tokenAllA", IsActive: true}
	tokenB := models.PushToken{UserID: memberBID, Token: "tokenAllB", IsActive: true}
	testDB.Create(&tokenA)
	testDB.Create(&tokenB)
	defer testDB.Delete(&tokenA)
	defer testDB.Delete(&tokenB)

	err = service.SendMessageNotification(
		chatroomID.Hex(),
		senderUserID,
		"sender",
		"Hello all active",
		chatroomName,
		[]uint{memberAID, memberBID}, // All other members are active
	)

	assert.NoError(t, err) // Should return nil early
	assert.False(t, mockSender.called, "sendExpoNotificationFunc should NOT have been called")
}

func TestSendMessageNotification_SenderOnlyOrAllActiveScenarios(t *testing.T) {
	assert.NotNil(t, service, "Service should not be nil")
	if service == nil || testMongoDB == nil {
		t.Skip("Service or MongoDB not initialized, skipping test.")
		return
	}

	mockSender := &mockExpoSender{}
	originalSender := service.sendExpoNotificationFunc
	service.sendExpoNotificationFunc = mockSender.send
	defer func() { service.sendExpoNotificationFunc = originalSender }()

	// Scenario A: Chatroom with only the sender
	t.Run("SenderOnlyInChatroom", func(t *testing.T) {
		mockSender.reset()
		senderOnlyID := uint(30)
		chatroomSenderOnlyID := primitive.NewObjectID()
		chatroomSenderOnlyName := "Sender Only Room"

		_, err := testMongoDB.Collection("chatrooms").InsertOne(context.Background(), &models.Chatroom{
			ID:   chatroomSenderOnlyID,
			Name: chatroomSenderOnlyName,
			Members: []models.ChatroomMember{
				{UserID: senderOnlyID, Username: "senderOnly"},
			},
		})
		assert.NoError(t, err)
		defer testMongoDB.Collection("chatrooms").DeleteOne(context.Background(), primitive.M{"_id": chatroomSenderOnlyID})

		err = service.SendMessageNotification(
			chatroomSenderOnlyID.Hex(),
			senderOnlyID,
			"senderOnly",
			"Hello myself",
			chatroomSenderOnlyName,
			[]uint{},
		)
		assert.NoError(t, err)
		assert.False(t, mockSender.called, "sendExpoNotificationFunc should NOT be called for sender-only room")
	})

	// Scenario B: Chatroom with sender and 1 other member who is active
	t.Run("OtherMemberActive", func(t *testing.T) {
		mockSender.reset()
		senderIDScenarioB := uint(31)
		otherMemberIDScenarioB := uint(32)
		chatroomOtherActiveID := primitive.NewObjectID()
		chatroomOtherActiveName := "Other Active Room"

		_, err := testMongoDB.Collection("chatrooms").InsertOne(context.Background(), &models.Chatroom{
			ID:   chatroomOtherActiveID,
			Name: chatroomOtherActiveName,
			Members: []models.ChatroomMember{
				{UserID: senderIDScenarioB, Username: "senderB"},
				{UserID: otherMemberIDScenarioB, Username: "otherMemberB"},
			},
		})
		assert.NoError(t, err)
		defer testMongoDB.Collection("chatrooms").DeleteOne(context.Background(), primitive.M{"_id": chatroomOtherActiveID})

		// Other member has an active token, but will be marked as active in chatroom
		tokenOtherB := models.PushToken{UserID: otherMemberIDScenarioB, Token: "tokenOtherB", IsActive: true}
		testDB.Create(&tokenOtherB)
		defer testDB.Delete(&tokenOtherB)

		err = service.SendMessageNotification(
			chatroomOtherActiveID.Hex(),
			senderIDScenarioB,
			"senderB",
			"Hello other active person",
			chatroomOtherActiveName,
			[]uint{otherMemberIDScenarioB}, // The other member is active
		)
		assert.NoError(t, err)
		assert.False(t, mockSender.called, "sendExpoNotificationFunc should NOT be called if the only other member is active")
	})
}

func TestSendMessageNotification_NoActivePushTokens(t *testing.T) {
	assert.NotNil(t, service, "Service should not be nil")
	if service == nil || testMongoDB == nil {
		t.Skip("Service or MongoDB not initialized, skipping test.")
		return
	}

	mockSender := &mockExpoSender{}
	originalSender := service.sendExpoNotificationFunc
	service.sendExpoNotificationFunc = mockSender.send
	defer func() { service.sendExpoNotificationFunc = originalSender }()

	senderUserID := uint(40)
	memberAID := uint(41)
	memberBID := uint(42)

	chatroomID := primitive.NewObjectID()
	chatroomName := "No Active Tokens Room"

	_, err := testMongoDB.Collection("chatrooms").InsertOne(context.Background(), &models.Chatroom{
		ID:   chatroomID,
		Name: chatroomName,
		Members: []models.ChatroomMember{
			{UserID: senderUserID, Username: "sender"},
			{UserID: memberAID, Username: "memberA"},
			{UserID: memberBID, Username: "memberB"},
		},
	})
	assert.NoError(t, err)
	defer testMongoDB.Collection("chatrooms").DeleteOne(context.Background(), primitive.M{"_id": chatroomID})

	// Tokens exist but are not active
	tokenA := models.PushToken{UserID: memberAID, Token: "tokenNoActiveA", IsActive: false}
	tokenB := models.PushToken{UserID: memberBID, Token: "tokenNoActiveB", IsActive: false}
	testDB.Create(&tokenA)
	testDB.Create(&tokenB)
	defer testDB.Delete(&tokenA)
	defer testDB.Delete(&tokenB)

	err = service.SendMessageNotification(
		chatroomID.Hex(),
		senderUserID,
		"sender",
		"Hello no active tokens",
		chatroomName,
		[]uint{},
	)

	assert.NoError(t, err) // Should return nil early and log
	assert.False(t, mockSender.called, "sendExpoNotificationFunc should NOT have been called if no active tokens")
}


// TODO: Add more test cases as outlined in the plan:
// TestSendMessageNotification_SenderIsExcluded (implicitly covered by others, but could be explicit)
// TestSendMessageNotification_MessageBodyTruncation
// TestSendMessageNotification_InvalidChatroomID (though this is more of an input validation, already handled by ObjectIDFromHex)

// Helper to clear DB tables if needed, or rely on TestMain setup/teardown per test if transactions are used.
// For SQLite in-memory, it's often reset per TestMain or connection.
// For MongoDB, explicit deletion of test data is good practice.
