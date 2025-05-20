package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// MediaService handles media file operations
type MediaService struct {
	BasePath string
	BaseURL  string
}

// NewMediaService creates a new MediaService
func NewMediaService(basePath, baseURL string) *MediaService {
	// Create media directories if they don't exist
	os.MkdirAll(filepath.Join(basePath, "uploads/images"), os.ModePerm)
	os.MkdirAll(filepath.Join(basePath, "uploads/audio"), os.ModePerm)
	os.MkdirAll(filepath.Join(basePath, "uploads/video"), os.ModePerm)

	return &MediaService{
		BasePath: basePath,
		BaseURL:  baseURL,
	}
}

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

// GetMediaFolder returns the folder path for a specific media type
func (s *MediaService) GetMediaFolder(mediaType MediaType) string {
	switch mediaType {
	case ImageMedia:
		return filepath.Join(s.BasePath, "uploads/images")
	case AudioMedia:
		return filepath.Join(s.BasePath, "uploads/audio")
	case VideoMedia:
		return filepath.Join(s.BasePath, "uploads/video")
	default:
		return filepath.Join(s.BasePath, "uploads")
	}
}

// UploadFile uploads a file to the appropriate folder and returns the URL
func (s *MediaService) UploadFile(file *multipart.FileHeader, mediaType MediaType) (string, error) {
	// Validate file size (10MB max)
	if file.Size > 10*1024*1024 {
		return "", errors.New("file size exceeds the 10MB limit")
	}

	// Get the file extension
	ext := filepath.Ext(file.Filename)

	// Validate file extension based on media type
	if !s.isValidFileExtension(ext, mediaType) {
		return "", errors.New("invalid file type for the specified media type")
	}

	// Generate a unique filename
	randomID, err := generateRandomID(16)
	if err != nil {
		return "", err
	}
	filename := fmt.Sprintf("%s%s", randomID, ext)

	// Get the folder path
	folderPath := s.GetMediaFolder(mediaType)

	// Create the full file path
	filePath := filepath.Join(folderPath, filename)

	// Open the source file
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Create the destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	// Copy the file content
	if _, err = io.Copy(dst, src); err != nil {
		return "", err
	}

	// Generate the URL
	mediaURL := fmt.Sprintf("%s/media/%s/%s", s.BaseURL, s.getMediaTypeFolder(mediaType), filename)

	return mediaURL, nil
}

// getMediaTypeFolder returns the folder name for a specific media type
func (s *MediaService) getMediaTypeFolder(mediaType MediaType) string {
	switch mediaType {
	case ImageMedia:
		return "images"
	case AudioMedia:
		return "audio"
	case VideoMedia:
		return "video"
	default:
		return "uploads"
	}
}

// isValidFileExtension checks if the file extension is valid for the specified media type
func (s *MediaService) isValidFileExtension(ext string, mediaType MediaType) bool {
	ext = strings.ToLower(ext)

	switch mediaType {
	case ImageMedia:
		return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp"
	case AudioMedia:
		return ext == ".mp3" || ext == ".wav" || ext == ".ogg" || ext == ".m4a"
	case VideoMedia:
		return ext == ".mp4" || ext == ".webm" || ext == ".mov" || ext == ".avi"
	default:
		return false
	}
}

// SetupMediaRoutes sets up routes for serving media files
func SetupMediaRoutes(router *gin.Engine, basePath string) {
	// Serve static files from the media directory
	router.Static("/media", filepath.Join(basePath, "uploads"))
}

// generateRandomID generates a random ID of the specified length
func generateRandomID(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
