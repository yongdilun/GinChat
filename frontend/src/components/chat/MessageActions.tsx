import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Message, User } from '@/types';
import { messageAPI } from '@/services/api';

interface MessageActionsProps {
  message: Message;
  user: User | null;
  onEdit: (messageId: string, newContent: string, newMediaUrl?: string, newMessageType?: string) => void;
  onDelete: (messageId: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

// Icons as inline SVG components
const EditIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SaveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CancelIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UploadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const RemoveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  user,
  onEdit,
  onDelete,
  isEditing,
  onStartEdit,
  onCancelEdit,
}) => {
  const [editContent, setEditContent] = useState(message.text_content || '');
  const [editMediaUrl, setEditMediaUrl] = useState(message.media_url || '');
  const [editMessageType, setEditMessageType] = useState(message.message_type || 'text');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only show actions for the message sender
  if (!user || message.sender_id !== user.user_id) {
    return null;
  }

  const handleSaveEdit = () => {
    const hasContentChanged = editContent.trim() !== message.text_content;
    const hasMediaChanged = editMediaUrl !== message.media_url;

    if (hasContentChanged || hasMediaChanged) {
      onEdit(message.id, editContent.trim(), editMediaUrl, editMessageType);
    }
    onCancelEdit();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Determine message type based on file type
      let messageType: 'picture' | 'audio' | 'video' = 'picture';
      if (file.type.startsWith('audio/')) {
        messageType = 'audio';
      } else if (file.type.startsWith('video/')) {
        messageType = 'video';
      }

      const response = await messageAPI.uploadMedia(file, messageType);
      const mediaUrl = response.data.media_url;

      setEditMediaUrl(mediaUrl);

      // Update message type based on content
      if (editContent.trim()) {
        // Use explicit type mapping for TypeScript
        const combinedType = messageType === 'picture' ? 'text_and_picture' :
                           messageType === 'audio' ? 'text_and_audio' :
                           'text_and_video';
        setEditMessageType(combinedType);
      } else {
        setEditMessageType(messageType);
      }
    } catch (error) {
      console.error('Failed to upload media:', error);
      alert('Failed to upload media. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMedia = () => {
    setEditMediaUrl('');
    if (editContent.trim()) {
      setEditMessageType('text');
    } else {
      setEditMessageType('text');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(message.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = () => {
    setEditContent(message.text_content || '');
    setEditMediaUrl(message.media_url || '');
    setEditMessageType(message.message_type || 'text');
    onStartEdit();
  };

  if (isEditing) {
    return (
      <motion.div
        className="mt-2 space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
      >
        {/* Text Content Editor */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message Text
          </label>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            placeholder="Edit your message..."
            autoFocus
          />
        </div>

        {/* Media Management */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Media
          </label>

          {editMediaUrl ? (
            <div className="space-y-2">
              {/* Current Media Preview */}
              <div className="relative inline-block">
                {editMessageType.includes('picture') && (
                  <Image
                    src={editMediaUrl}
                    alt="Current media"
                    width={128}
                    height={128}
                    className="max-w-32 max-h-32 rounded-md object-cover"
                  />
                )}
                {editMessageType.includes('video') && (
                  <video
                    src={editMediaUrl}
                    className="max-w-32 max-h-32 rounded-md object-cover"
                    controls={false}
                  />
                )}
                {editMessageType.includes('audio') && (
                  <div className="w-32 h-16 bg-gray-200 dark:bg-gray-600 rounded-md flex items-center justify-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Audio File</span>
                  </div>
                )}
              </div>

              {/* Media Actions */}
              <div className="flex space-x-2">
                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <UploadIcon className="w-3 h-3 mr-1" />
                  {isUploading ? 'Uploading...' : 'Replace'}
                </motion.button>
                <motion.button
                  onClick={handleRemoveMedia}
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RemoveIcon className="w-3 h-3 mr-1" />
                  Remove
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:border-primary-500 dark:hover:border-primary-400 transition-colors disabled:opacity-50 flex items-center justify-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isUploading ? 'Uploading...' : 'Add Media'}
              </span>
            </motion.button>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <motion.button
            onClick={handleSaveEdit}
            disabled={isUploading}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <SaveIcon className="w-3 h-3 mr-1" />
            Save Changes
          </motion.button>
          <motion.button
            onClick={onCancelEdit}
            className="px-3 py-1 text-xs bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <CancelIcon className="w-3 h-3 mr-1" />
            Cancel
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Simple Always-Visible Action Buttons */}
      <div className="flex items-center space-x-1">
        {/* Edit Button */}
        <motion.button
          onClick={handleStartEdit}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors duration-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Edit message"
        >
          <EditIcon className="w-3.5 h-3.5" />
        </motion.button>

        {/* Delete Button */}
        <motion.button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors duration-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Delete message"
        >
          <DeleteIcon className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Delete Message
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <motion.button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center justify-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isDeleting ? (
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <DeleteIcon className="w-4 h-4 mr-2" />
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </motion.button>
                <motion.button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MessageActions;
