import { useState, useRef } from 'react';
import { Chatroom } from '@/types';
import { messageAPI } from '@/services/api';

interface MessageInputProps {
  selectedChatroom: Chatroom | null;
  onMessageSent: (message?: any) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ selectedChatroom, onMessageSent }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<string>('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedChatroom) return;
    if (!newMessage.trim() && !mediaFile) return;

    setIsSending(true);

    try {
      let finalMediaURL = '';
      let finalMessageType = 'text';

      // If there's a media file, upload it first
      if (mediaFile) {
        setIsUploading(true);

        try {
          const uploadResponse = await messageAPI.uploadMedia(mediaFile, mediaType);
          finalMediaURL = uploadResponse.data.media_url;

          // Determine the message type based on whether there's text and media
          if (newMessage.trim()) {
            finalMessageType = mediaType.includes('_') ? mediaType : `text_and_${mediaType}`;
          } else {
            finalMessageType = mediaType;
          }
        } catch (error) {
          console.error('Failed to upload media:', error);
          setIsSending(false);
          setIsUploading(false);
          return;
        }

        setIsUploading(false);
      }

      // Send the message with or without media
      const response = await messageAPI.sendMessage(
        selectedChatroom.id,
        finalMessageType,
        newMessage.trim() || undefined,
        finalMediaURL || undefined
      );

      // Get the sent message from the response
      const sentMessage = response.data.message;

      // Reset the form
      setNewMessage('');
      setMediaFile(null);
      setMediaType('');
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
        setMediaPreview(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent component that a message was sent
      // Pass the sent message so it can be added to the list immediately
      onMessageSent(sentMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine media type based on file type
    let type = '';
    if (file.type.startsWith('image/')) {
      type = 'picture';
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    } else {
      alert('Unsupported file type');
      return;
    }

    setMediaFile(file);
    setMediaType(type);

    // Create a preview URL
    const previewURL = URL.createObjectURL(file);
    setMediaPreview(previewURL);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaType('');
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!selectedChatroom) {
    return null;
  }

  return (
    <form onSubmit={sendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
      {/* Media preview */}
      {mediaPreview && (
        <div className="mb-2 relative">
          <div className="relative rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 max-h-32">
            {mediaType === 'picture' && (
              <img
                src={mediaPreview}
                alt="Preview"
                className="max-h-32 max-w-full object-contain mx-auto"
              />
            )}
            {mediaType === 'audio' && (
              <audio
                src={mediaPreview}
                controls
                className="w-full"
              />
            )}
            {mediaType === 'video' && (
              <video
                src={mediaPreview}
                controls
                className="max-h-32 max-w-full mx-auto"
              />
            )}
            <button
              type="button"
              onClick={handleRemoveMedia}
              className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {mediaFile?.name} ({mediaFile ? Math.round(mediaFile.size / 1024) : 0} KB)
          </div>
        </div>
      )}

      <div className="flex items-center">
        <div className="flex-none mr-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,audio/*,video/*"
            disabled={isSending || isUploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploading || !!mediaFile}
            className="p-2 text-gray-500 hover:text-primary-500 focus:outline-none disabled:opacity-50"
            title="Attach media"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
        </div>

        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          disabled={isSending || isUploading}
        />

        <button
          type="submit"
          disabled={isSending || isUploading || (!newMessage.trim() && !mediaFile)}
          className="px-4 py-2 bg-primary-500 text-white rounded-r-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isUploading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </span>
          ) : isSending ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </span>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
