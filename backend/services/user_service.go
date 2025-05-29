package services

import (
	"errors"
	"log"
	"time"

	"github.com/ginchat/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserService handles business logic related to users
type UserService struct {
	DB *gorm.DB
}

// NewUserService creates a new UserService
func NewUserService(db *gorm.DB) *UserService {
	return &UserService{
		DB: db,
	}
}

// Register creates a new user
func (s *UserService) Register(username, email, password, role string) (*models.User, error) {
	// Check if email already exists
	var existingUser models.User
	if result := s.DB.Where("email = ?", email).First(&existingUser); result.Error == nil {
		return nil, errors.New("user with this email already exists")
	}

	// Check if username already exists
	if result := s.DB.Where("username = ?", username).First(&existingUser); result.Error == nil {
		return nil, errors.New("user with this username already exists")
	}

	// Hash the password
	hashedPassword, err := s.HashPassword(password)
	if err != nil {
		return nil, err
	}

	// Create new user
	now := models.CustomTime{Time: time.Now()}
	user := models.User{
		Username:  username,
		Email:     email,
		Password:  hashedPassword,
		Role:      role,
		Status:    "offline",
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Save user to database
	if result := s.DB.Create(&user); result.Error != nil {
		return nil, errors.New("failed to create user")
	}

	return &user, nil
}

// Login authenticates a user
func (s *UserService) Login(email, password string) (*models.User, error) {
	// Find user by email
	var user models.User
	if result := s.DB.Where("email = ?", email).First(&user); result.Error != nil {
		return nil, errors.New("invalid email or password")
	}

	// Check password
	if !s.VerifyPassword(user.Password, password) {
		return nil, errors.New("invalid email or password")
	}

	// Check if user is already logged in on another device
	if user.IsLogin {
		log.Printf("DEBUG: User %d (%s) attempted login but already logged in", user.UserID, user.Email)
		return nil, errors.New("this user is already logged in on another device")
	}

	// Update user status
	user.IsLogin = true
	user.Status = "online"
	now := models.CustomTime{Time: time.Now()}
	customTimePtr := &now
	user.LastLoginAt = customTimePtr
	user.Heartbeat = customTimePtr
	s.DB.Save(&user)

	log.Printf("DEBUG: User %d (%s) logged in successfully", user.UserID, user.Email)
	return &user, nil
}

// Logout updates the user's status and deactivates push tokens
func (s *UserService) Logout(userID uint) error {
	// Find user by ID
	var user models.User
	if result := s.DB.First(&user, userID); result.Error != nil {
		return errors.New("user not found")
	}

	// Update user status
	user.IsLogin = false
	user.Status = "offline"
	if result := s.DB.Save(&user); result.Error != nil {
		return errors.New("failed to update user status")
	}

	// Deactivate all push tokens for this user
	if err := s.DB.Model(&models.PushToken{}).Where("user_id = ?", userID).Update("is_active", false).Error; err != nil {
		// Log error but don't fail logout
		log.Printf("Warning: Failed to deactivate push tokens for user %d: %v", userID, err)
	} else {
		log.Printf("DEBUG: Deactivated push tokens for user %d during logout", userID)
	}

	return nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(userID uint) (*models.User, error) {
	var user models.User
	if result := s.DB.First(&user, userID); result.Error != nil {
		return nil, errors.New("user not found")
	}
	return &user, nil
}

// GetUserByEmail retrieves a user by email
func (s *UserService) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	if result := s.DB.Where("email = ?", email).First(&user); result.Error != nil {
		return nil, errors.New("user not found")
	}
	return &user, nil
}

// UpdateUser updates a user's information
func (s *UserService) UpdateUser(user *models.User) error {
	if result := s.DB.Save(user); result.Error != nil {
		return errors.New("failed to update user")
	}
	return nil
}

// HashPassword hashes a password using bcrypt
func (s *UserService) HashPassword(password string) (string, error) {
	// Use a higher cost factor for better security (12 is a good balance between security and performance)
	cost := 12

	// Generate a salt and hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), cost)
	if err != nil {
		return "", err
	}

	return string(hashedPassword), nil
}

// VerifyPassword checks if a password matches a hash
func (s *UserService) VerifyPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// IsHashedPassword checks if a password is already hashed with bcrypt
func (s *UserService) IsHashedPassword(password string) bool {
	return len(password) > 4 && (password[:4] == "$2a$" || password[:4] == "$2b$" || password[:4] == "$2y$")
}

// ToResponse converts a User to a UserResponse
func (s *UserService) ToResponse(user *models.User) models.UserResponse {
	return models.UserResponse{
		UserID:    user.UserID,
		Username:  user.Username,
		Email:     user.Email,
		Role:      user.Role,
		Status:    user.Status,
		AvatarURL: user.AvatarURL,
		CreatedAt: user.CreatedAt.Time,
	}
}
