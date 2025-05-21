package services

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/utils"
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

// GetMediaFolder returns the folder path for a specific media type
func (s *MediaService) GetMediaFolder(mediaType utils.MediaType) string {
	switch mediaType {
	case utils.ImageMedia:
		return filepath.Join(s.BasePath, "uploads/images")
	case utils.AudioMedia:
		return filepath.Join(s.BasePath, "uploads/audio")
	case utils.VideoMedia:
		return filepath.Join(s.BasePath, "uploads/video")
	default:
		return filepath.Join(s.BasePath, "uploads")
	}
}

// UploadFile uploads a file to the appropriate folder and returns the URL
func (s *MediaService) UploadFile(file *multipart.FileHeader, mediaType utils.MediaType) (string, error) {
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
	randomID, err := utils.GenerateRandomID(16)
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
func (s *MediaService) getMediaTypeFolder(mediaType utils.MediaType) string {
	switch mediaType {
	case utils.ImageMedia:
		return "images"
	case utils.AudioMedia:
		return "audio"
	case utils.VideoMedia:
		return "video"
	default:
		return "uploads"
	}
}

// isValidFileExtension checks if the file extension is valid for the specified media type
func (s *MediaService) isValidFileExtension(ext string, mediaType utils.MediaType) bool {
	ext = strings.ToLower(ext)

	switch mediaType {
	case utils.ImageMedia:
		return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp"
	case utils.AudioMedia:
		return ext == ".mp3" || ext == ".wav" || ext == ".ogg" || ext == ".m4a"
	case utils.VideoMedia:
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
