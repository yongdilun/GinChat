package utils

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/dgrijalva/jwt-go"
)

// generateTokenID creates a random token ID for the JWT
func generateTokenID() string {
	bytes := make([]byte, 16)
	_, err := rand.Read(bytes)
	if err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(bytes)
}

// JWTClaims represents the claims in a JWT
type JWTClaims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	jwt.StandardClaims
}

// GenerateJWT generates a new JWT token for a user
func GenerateJWT(userID uint, username, email, role string) (string, error) {
	// Get JWT secret from environment
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return "", errors.New("JWT_SECRET environment variable not set")
	}

	// Get JWT expiration from environment
	jwtExpiration := os.Getenv("JWT_EXPIRATION")
	if jwtExpiration == "" {
		jwtExpiration = "24h" // Default to 24 hours
	}

	// Parse expiration duration
	expirationDuration, err := time.ParseDuration(jwtExpiration)
	if err != nil {
		return "", err
	}

	// Generate a unique token ID (jti)
	tokenID := generateTokenID()

	now := time.Now()
	// Create claims
	claims := JWTClaims{
		UserID:   userID,
		Username: username,
		Email:    email,
		Role:     role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: now.Add(expirationDuration).Unix(),
			IssuedAt:  now.Unix(),
			NotBefore: now.Unix(),                // Token is not valid before the issued time
			Issuer:    "ginchat-api",             // Identify the issuer
			Subject:   fmt.Sprintf("%d", userID), // Subject is the user ID
			Id:        tokenID,                   // Unique token ID
		},
	}

	// Create token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Add header information
	token.Header["typ"] = "JWT"
	token.Header["alg"] = "HS256"

	// Sign token with secret
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateJWT validates a JWT token and returns the claims
func ValidateJWT(tokenString string) (*JWTClaims, error) {
	// Get JWT secret from environment
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, errors.New("JWT_SECRET environment variable not set")
	}

	// Parse token
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	// Extract claims
	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
