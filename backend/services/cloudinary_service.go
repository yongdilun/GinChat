package services

import (
	"context"
	"errors"
	"mime/multipart"
	"net/url"
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

// DeleteFile deletes a file from Cloudinary using its URL
func (s *CloudinaryService) DeleteFile(mediaURL string) error {
	if mediaURL == "" {
		return nil // No media to delete
	}

	// Extract public ID and resource type from Cloudinary URL
	publicID, resourceType, err := s.extractPublicIDAndResourceType(mediaURL)
	if err != nil {
		// Try fallback method
		return s.deleteFileWithFallback(mediaURL)
	}

	// Try to delete with the detected resource type first
	invalidate := true
	_, err = s.Cld.Upload.Destroy(context.Background(), uploader.DestroyParams{
		PublicID:     publicID,
		ResourceType: resourceType,
		Invalidate:   &invalidate,
	})

	if err == nil {
		// Successfully deleted
		return nil
	}

	// If that failed, try fallback method
	return s.deleteFileWithFallback(mediaURL)
}

// deleteFileWithFallback tries to delete with all possible resource types
func (s *CloudinaryService) deleteFileWithFallback(mediaURL string) error {
	publicID, err := s.extractPublicIDFromURL(mediaURL)
	if err != nil {
		return nil // Don't fail the operation
	}

	// Try all possible resource types
	resourceTypes := []string{"image", "video", "raw", "auto"}
	invalidate := true

	for _, resourceType := range resourceTypes {
		_, err = s.Cld.Upload.Destroy(context.Background(), uploader.DestroyParams{
			PublicID:     publicID,
			ResourceType: resourceType,
			Invalidate:   &invalidate,
		})
		if err == nil {
			return nil // Successfully deleted
		}
	}

	// If all attempts failed, don't fail the operation
	return nil
}

// extractPublicIDFromURL extracts the public ID from a Cloudinary URL
func (s *CloudinaryService) extractPublicIDFromURL(mediaURL string) (string, error) {
	if mediaURL == "" {
		return "", errors.New("empty media URL")
	}

	// Parse the URL
	parsedURL, err := url.Parse(mediaURL)
	if err != nil {
		return "", errors.New("invalid media URL")
	}

	// Extract path and remove leading slash
	path := strings.TrimPrefix(parsedURL.Path, "/")

	// Split path by '/'
	parts := strings.Split(path, "/")
	if len(parts) < 4 {
		return "", errors.New("invalid Cloudinary URL format")
	}

	// For Cloudinary URLs, the format is typically:
	// /{cloud_name}/{resource_type}/{type}/{version}/{public_id}.{format}
	// or /{cloud_name}/{resource_type}/{type}/{public_id}.{format}

	// Find the public ID part (everything after the first 3 parts)
	publicIDParts := parts[3:]

	// Join all parts except remove extension from the last part
	if len(publicIDParts) > 0 {
		lastPart := publicIDParts[len(publicIDParts)-1]

		// Remove file extension
		if dotIndex := strings.LastIndex(lastPart, "."); dotIndex != -1 {
			lastPart = lastPart[:dotIndex]
		}

		// Replace the last part without extension
		publicIDParts[len(publicIDParts)-1] = lastPart

		// Join all parts to form the public ID
		return strings.Join(publicIDParts, "/"), nil
	}

	return "", errors.New("could not extract public ID")
}

// extractPublicIDAndResourceType extracts both public ID and resource type from Cloudinary URL
func (s *CloudinaryService) extractPublicIDAndResourceType(mediaURL string) (string, string, error) {
	if mediaURL == "" {
		return "", "", errors.New("empty media URL")
	}

	// Parse the URL
	parsedURL, err := url.Parse(mediaURL)
	if err != nil {
		return "", "", errors.New("invalid media URL")
	}

	// Extract path and remove leading slash
	path := strings.TrimPrefix(parsedURL.Path, "/")

	// Split path by '/'
	parts := strings.Split(path, "/")
	if len(parts) < 4 {
		return "", "", errors.New("invalid Cloudinary URL format")
	}

	// For Cloudinary URLs, the format is:
	// /{cloud_name}/{resource_type}/{type}/{version?}/{folder?}/{public_id}.{format}
	// Examples:
	// /demo/image/upload/v1234567890/sample.jpg
	// /demo/video/upload/v1234567890/sample.mp4
	// /demo/image/upload/folder/sample.jpg
	// /demo/video/upload/folder/subfolder/sample.mp4

	// parts[0] is cloud_name
	resourceType := parts[1]
	// parts[2] is upload_type (usually "upload")

	// Find where the actual public ID starts
	// Skip cloud_name, resource_type, upload_type
	publicIDParts := parts[3:]

	if len(publicIDParts) == 0 {
		return "", "", errors.New("no public ID found in URL")
	}

	// Check if first part is a version (starts with 'v' followed by numbers)
	startIndex := 0
	if len(publicIDParts[0]) > 1 && publicIDParts[0][0] == 'v' {
		// Check if the rest are digits
		isVersion := true
		for _, char := range publicIDParts[0][1:] {
			if char < '0' || char > '9' {
				isVersion = false
				break
			}
		}
		if isVersion {
			startIndex = 1 // Skip version
		}
	}

	// Get the actual public ID parts (everything after version)
	actualPublicIDParts := publicIDParts[startIndex:]
	if len(actualPublicIDParts) == 0 {
		return "", "", errors.New("no public ID found after version")
	}

	// Remove file extension from the last part
	lastPart := actualPublicIDParts[len(actualPublicIDParts)-1]
	if dotIndex := strings.LastIndex(lastPart, "."); dotIndex != -1 {
		lastPart = lastPart[:dotIndex]
	}
	actualPublicIDParts[len(actualPublicIDParts)-1] = lastPart

	// Join all parts to form the public ID
	publicID := strings.Join(actualPublicIDParts, "/")

	return publicID, resourceType, nil
}

// TestURLParsing is a helper function to test URL parsing (for debugging)
func (s *CloudinaryService) TestURLParsing(mediaURL string) (string, string, error) {
	return s.extractPublicIDAndResourceType(mediaURL)
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
