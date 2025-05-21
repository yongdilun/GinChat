package utils

import (
	"crypto/rand"
	"encoding/hex"
)

// MediaType represents the type of media file
type MediaType string

const (
	// ImageMedia represents image files
	ImageMedia MediaType = "image"
	// AudioMedia represents audio files
	AudioMedia MediaType = "audio"
	// VideoMedia represents video files
	VideoMedia MediaType = "video"
)

// GetMediaTypeFromMessageType returns the media type based on the message type
func GetMediaTypeFromMessageType(messageType string) MediaType {
	switch messageType {
	case "picture", "text_and_picture":
		return ImageMedia
	case "audio", "text_and_audio":
		return AudioMedia
	case "video", "text_and_video":
		return VideoMedia
	default:
		return ""
	}
}

// GenerateRandomID generates a random ID for filenames
func GenerateRandomID(length int) (string, error) {
	bytes := make([]byte, length/2)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
