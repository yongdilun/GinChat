package utils

import (
	"strings"
)

// UserFriendlyError represents a user-friendly error message
type UserFriendlyError struct {
	Message string
	Code    string
}

// Error implements the error interface
func (e UserFriendlyError) Error() string {
	return e.Message
}

// NewUserFriendlyError creates a new user-friendly error
func NewUserFriendlyError(message, code string) UserFriendlyError {
	return UserFriendlyError{
		Message: message,
		Code:    code,
	}
}

// FormatValidationError converts Gin binding validation errors to user-friendly messages
func FormatValidationError(err error) string {
	errMsg := err.Error()

	// Handle common validation errors
	if strings.Contains(errMsg, "required") {
		if strings.Contains(errMsg, "Username") {
			return "Username is required"
		}
		if strings.Contains(errMsg, "Email") {
			return "Email address is required"
		}
		if strings.Contains(errMsg, "Password") {
			return "Password is required"
		}
		if strings.Contains(errMsg, "Name") {
			return "Name is required"
		}
		if strings.Contains(errMsg, "MessageType") {
			return "Message type is required"
		}
		return "This field is required"
	}

	if strings.Contains(errMsg, "email") {
		return "Please enter a valid email address"
	}

	if strings.Contains(errMsg, "min") {
		if strings.Contains(errMsg, "Username") {
			return "Username must be at least 3 characters long"
		}
		if strings.Contains(errMsg, "Password") {
			return "Password must be at least 6 characters long"
		}
		if strings.Contains(errMsg, "Name") {
			return "Name must be at least 3 characters long"
		}
		return "This field is too short"
	}

	if strings.Contains(errMsg, "max") {
		if strings.Contains(errMsg, "Username") {
			return "Username cannot be longer than 50 characters"
		}
		if strings.Contains(errMsg, "Name") {
			return "Name cannot be longer than 100 characters"
		}
		return "This field is too long"
	}

	if strings.Contains(errMsg, "oneof") {
		if strings.Contains(errMsg, "MessageType") {
			return "Please select a valid message type"
		}
		return "Please select a valid option"
	}

	// Handle JSON parsing errors
	if strings.Contains(errMsg, "invalid character") || strings.Contains(errMsg, "unexpected end") {
		return "Invalid request format. Please check your input and try again"
	}

	// Default fallback for unknown validation errors
	return "Please check your input and try again"
}

// FormatAuthError converts authentication errors to user-friendly messages
func FormatAuthError(err error) string {
	errMsg := err.Error()

	switch {
	case strings.Contains(errMsg, "Authorization header is required"):
		return "Please log in to continue"
	case strings.Contains(errMsg, "Authorization header must be in the format"):
		return "Authentication failed. Please log in again"
	case strings.Contains(errMsg, "Invalid or expired token"):
		return "Your session has expired. Please log in again"
	case strings.Contains(errMsg, "User not authenticated"):
		return "Please log in to continue"
	case strings.Contains(errMsg, "Invalid user ID"):
		return "Authentication error. Please log in again"
	default:
		return "Authentication failed. Please log in again"
	}
}

// FormatServiceError converts service layer errors to user-friendly messages
func FormatServiceError(err error) string {
	errMsg := err.Error()

	switch errMsg {
	// User service errors
	case "user with this email already exists":
		return "An account with this email already exists. Please use a different email address"
	case "user with this username already exists":
		return "This username is already taken. Please choose a different username"
	case "invalid email or password":
		return "Invalid email or password. Please check your credentials and try again"
	case "user not found":
		return "User account not found"
	case "failed to create user":
		return "Unable to create account. Please try again later"
	case "failed to update user":
		return "Unable to update account. Please try again later"
	case "failed to update user status":
		return "Unable to update account status. Please try again later"

	// Chatroom service errors
	case "chatroom with this name already exists":
		return "A chat room with this name already exists. Please choose a different name"
	case "chatroom not found":
		return "Chat room not found. It may have been deleted"
	case "failed to create chatroom":
		return "Unable to create chat room. Please try again later"
	case "failed to get chatrooms":
		return "Unable to load chat rooms. Please try again later"
	case "failed to decode chatrooms":
		return "Unable to load chat rooms. Please try again later"
	case "failed to join chatroom":
		return "Unable to join chat room. Please try again later"
	case "failed to leave chatroom":
		return "Unable to leave chat room. Please try again later"
	case "user is already a member of this chatroom":
		return "You are already a member of this chat room"
	case "user is not a member of this chatroom":
		return "You are not a member of this chat room"

	// Message service errors
	case "text content is required for text messages":
		return "Please enter a message"
	case "media URL is required for media messages":
		return "Please upload a file for this message type"
	case "text content is required for combined messages":
		return "Please enter a message along with your media"
	case "media URL is required for combined messages":
		return "Please upload a file along with your message"
	case "invalid message type":
		return "Invalid message type selected"
	case "message not found":
		return "Message not found. It may have been deleted"
	case "user is not the sender of this message":
		return "You can only modify your own messages"
	case "failed to update message":
		return "Unable to update message. Please try again later"
	case "failed to delete message":
		return "Unable to delete message. Please try again later"
	case "failed to find messages":
		return "Unable to load messages. Please try again later"
	case "failed to delete messages":
		return "Unable to delete messages. Please try again later"
	case "failed to delete chatroom messages":
		return "Unable to delete chatroom messages. Please try again later"
	case "only the creator can delete this chatroom":
		return "Only the chatroom creator can delete this chatroom"
	case "failed to delete chatroom":
		return "Unable to delete chatroom. Please try again later"

	// Media service errors
	case "file size exceeds the 10MB limit":
		return "File is too large. Please choose a file smaller than 10MB"
	case "invalid file type for the specified media type":
		return "Invalid file type. Please choose a supported file format"
	case "No file uploaded":
		return "Please select a file to upload"
	case "Invalid message type for media upload":
		return "Invalid file type selected"

	// Generic database errors
	case "failed to check chatroom existence":
		return "Unable to verify chat room. Please try again later"

	// Default fallback
	default:
		if strings.Contains(errMsg, "failed to") {
			return "Operation failed. Please try again later"
		}
		if strings.Contains(errMsg, "invalid") {
			return "Invalid input. Please check your data and try again"
		}
		if strings.Contains(errMsg, "not found") {
			return "Requested item not found"
		}
		return "An error occurred. Please try again later"
	}
}

// FormatMediaError converts media-related errors to user-friendly messages
func FormatMediaError(err error) string {
	errMsg := err.Error()

	switch {
	case strings.Contains(errMsg, "Cloudinary service not initialized"):
		return "File upload service is temporarily unavailable. Please try again later"
	case strings.Contains(errMsg, "file size"):
		return "File is too large. Please choose a file smaller than 10MB"
	case strings.Contains(errMsg, "invalid file type"):
		return "Unsupported file type. Please choose a valid image, audio, or video file"
	case strings.Contains(errMsg, "No file uploaded"):
		return "Please select a file to upload"
	case strings.Contains(errMsg, "Invalid message type"):
		return "Please select a valid message type"
	default:
		return "File upload failed. Please try again"
	}
}

// FormatGeneralError provides a user-friendly message for general errors
func FormatGeneralError(err error) string {
	if err == nil {
		return "An unknown error occurred"
	}

	errMsg := err.Error()

	// Check for specific error types first
	if strings.Contains(errMsg, "validation") || strings.Contains(errMsg, "binding") {
		return FormatValidationError(err)
	}

	if strings.Contains(errMsg, "auth") || strings.Contains(errMsg, "token") {
		return FormatAuthError(err)
	}

	if strings.Contains(errMsg, "media") || strings.Contains(errMsg, "file") || strings.Contains(errMsg, "upload") {
		return FormatMediaError(err)
	}

	// Try service error formatting
	serviceMsg := FormatServiceError(err)
	if serviceMsg != "An error occurred. Please try again later" {
		return serviceMsg
	}

	// Final fallback
	return "Something went wrong. Please try again later"
}
