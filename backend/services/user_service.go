package services

import (
	"errors"
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
	// Check if user already exists
	var existingUser models.User
	if result := s.DB.Where("email = ?", email).Or("username = ?", username).First(&existingUser); result.Error == nil {
		return nil, errors.New("user with this email or username already exists")
	}

	// Hash the password
	hashedPassword, err := s.HashPassword(password)
	if err != nil {
		return nil, err
	}

	// Create new user
	now := time.Now()
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

	// Update user status
	user.IsLogin = true
	user.Status = "online"
	now := time.Now()
	user.LastLoginAt = &now
	user.Heartbeat = &now
	s.DB.Save(&user)

	return &user, nil
}

// Logout updates the user's status
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
		CreatedAt: user.CreatedAt,
	}
}
