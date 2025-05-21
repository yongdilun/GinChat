package services

import (
	"context"
	"errors"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/ginchat/utils"
)

// CloudinaryService handles media file operations with Cloudinary
type CloudinaryService struct {
	Cld *cloudinary.Cloudinary
}

// NewCloudinaryService creates a new CloudinaryService
func NewCloudinaryService() (*CloudinaryService, error) {
	// Get Cloudinary credentials from environment variables
	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	apiKey := os.Getenv("CLOUDINARY_API_KEY")
	apiSecret := os.Getenv("CLOUDINARY_API_SECRET")

	if cloudName == "" || apiKey == "" || apiSecret == "" {
		return nil, errors.New("missing Cloudinary credentials in environment variables")
	}

	// Create a new Cloudinary instance
	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, err
	}

	return &CloudinaryService{
		Cld: cld,
	}, nil
}

// GetCloudinaryFolder returns the folder path for a specific media type
func (s *CloudinaryService) GetCloudinaryFolder(mediaType utils.MediaType) string {
	switch mediaType {
	case utils.ImageMedia:
		return "ginchat/images"
	case utils.AudioMedia:
		return "ginchat/audio"
	case utils.VideoMedia:
		return "ginchat/video"
	default:
		return "ginchat/uploads"
	}
}

// UploadFile uploads a file to Cloudinary and returns the URL
func (s *CloudinaryService) UploadFile(file *multipart.FileHeader, mediaType utils.MediaType) (string, error) {
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

	// Open the source file
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Get the folder path
	folder := s.GetCloudinaryFolder(mediaType)

	// Create boolean pointers for Cloudinary params
	useFilename := true
	uniqueFilename := true

	// Upload to Cloudinary
	uploadParams := uploader.UploadParams{
		PublicID:       randomID,
		Folder:         folder,
		ResourceType:   s.getResourceType(mediaType),
		UseFilename:    &useFilename,
		UniqueFilename: &uniqueFilename,
	}

	// Upload the file
	uploadResult, err := s.Cld.Upload.Upload(context.Background(), src, uploadParams)
	if err != nil {
		return "", err
	}

	return uploadResult.SecureURL, nil
}

// getResourceType returns the Cloudinary resource type for a specific media type
func (s *CloudinaryService) getResourceType(mediaType utils.MediaType) string {
	switch mediaType {
	case utils.ImageMedia:
		return "image"
	case utils.AudioMedia:
		return "video" // Cloudinary uses "video" resource type for audio files
	case utils.VideoMedia:
		return "video"
	default:
		return "auto"
	}
}

// isValidFileExtension checks if the file extension is valid for the specified media type
func (s *CloudinaryService) isValidFileExtension(ext string, mediaType utils.MediaType) bool {
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
