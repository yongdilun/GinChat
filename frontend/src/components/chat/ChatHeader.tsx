import { useState } from 'react';
import Image from 'next/image';
import { Chatroom } from '@/types';
import { XIcon, PhotographIcon, UserGroupIcon } from '@heroicons/react/outline';

// Define missing icons
const VideoCameraIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const MicrophoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

interface ChatHeaderProps {
  chatroom: Chatroom | null;
}

interface File {
  name: string;
  url: string;
}

interface Media {
  url: string;
  type: string; // "image", "video", or "audio"
}

interface ExtendedChatroom extends Chatroom {
  media?: Media[];
  files?: File[];
}

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
    </svg>
  );
}

export default function ChatHeader({ chatroom }: ChatHeaderProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'images' | 'videos' | 'audio'>('members');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);

  if (!chatroom) {
    return (
      <div className="flex items-center justify-center h-16 bg-white border-b">
        <p className="text-gray-500">Select a chatroom to start chatting</p>
      </div>
    );
  }

  const extendedChatroom = chatroom as ExtendedChatroom;

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const getFilenameFromUrl = (url: string) => {
    // Get the filename from the URL path
    const urlParts = url.split('/');
    let filename = urlParts[urlParts.length - 1];
    
    // Remove query parameters if any
    filename = filename.split('?')[0];
    
    // Make sure we have a valid filename
    return filename || 'download';
  };

  const handleDownload = (url: string) => {
    try {
      // Create a fetch request to get the image data
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          // Create a blob URL for the image
          const blobUrl = URL.createObjectURL(blob);
          
          // Create a temporary link element
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = getFilenameFromUrl(url);
          
          // Append to body, click and remove
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
          console.error('Error downloading image:', error);
          // Fallback to simpler approach if fetch fails
          const link = document.createElement('a');
          link.href = url;
          link.download = getFilenameFromUrl(url);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    } catch (error) {
      console.error('Error in download handler:', error);
    }
  };

  // Toggle content visibility when header is clicked
  const toggleContent = () => {
    setShowContent(!showContent);
  };

  // Filter media by type
  const getFilteredMedia = (type: string) => {
    return extendedChatroom.media?.filter(m => m.type === type) || [];
  };

  const images = getFilteredMedia('image');
  const videos = getFilteredMedia('video');
  const audios = getFilteredMedia('audio');

  return (
    <div className="bg-white border-b">
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={toggleContent}
      >
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">{chatroom.name}</h2>
          <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
            {chatroom.members?.length || 0} members
          </span>
        </div>
      </div>

      {showContent && (
        <>
          <div className="border-t">
            <div className="flex">
              <button
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === 'members'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('members')}
              >
                <UserGroupIcon className="w-5 h-5 mx-auto mb-1" aria-hidden="true" />
                Members
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === 'images'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('images')}
              >
                <PhotographIcon className="w-5 h-5 mx-auto mb-1" aria-hidden="true" />
                Images
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === 'videos'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('videos')}
              >
                <VideoCameraIcon className="w-5 h-5 mx-auto mb-1" aria-hidden="true" />
                Videos
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === 'audio'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('audio')}
              >
                <MicrophoneIcon className="w-5 h-5 mx-auto mb-1" aria-hidden="true" />
                Audio
              </button>
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'members' && (
              <div className="space-y-2">
                {chatroom.members.map((member, index) => (
                  <div key={index} className="flex items-center p-2 hover:bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold mr-3">
                      {member.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.username || `User ${member.user_id}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'images' && (
              <div className="grid grid-cols-3 gap-4">
                {images.length > 0 ? (
                  images.map((media, index) => (
                    <div key={index} className="relative group">
                      <div className="relative w-full h-24">
                        <Image
                          src={media.url}
                          alt={`Image ${index + 1}`}
                          fill
                          className="object-cover rounded-lg cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleImageClick(media.url);
                          }}
                        />
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownload(media.url);
                        }}
                        className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <DownloadIcon className="w-4 h-4 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 col-span-3 text-center py-4">No images in this chatroom</p>
                )}
              </div>
            )}

            {activeTab === 'videos' && (
              <div className="space-y-4">
                {videos.length > 0 ? (
                  videos.map((media, index) => (
                    <div key={index} className="relative group bg-gray-50 rounded-lg p-2">
                      <video 
                        src={media.url} 
                        className="w-full rounded" 
                        controls 
                        preload="metadata"
                      />
                      <button
                        onClick={() => handleDownload(media.url)}
                        className="absolute top-4 right-4 p-1 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <DownloadIcon className="w-4 h-4 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No videos in this chatroom</p>
                )}
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="space-y-3">
                {audios.length > 0 ? (
                  audios.map((media, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 flex items-center">
                      <audio 
                        src={media.url} 
                        className="w-full" 
                        controls
                      />
                      <button
                        onClick={() => handleDownload(media.url)}
                        className="ml-2 p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <DownloadIcon className="w-5 h-5" aria-hidden="true" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No audio files in this chatroom</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-4xl">
            <div className="relative w-full h-[80vh]">
              <Image 
                src={selectedImage} 
                alt="Selected image" 
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-contain"
                priority
              />
            </div>
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedImage) handleDownload(selectedImage);
                }}
                className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75"
              >
                <DownloadIcon className="w-6 h-6" aria-hidden="true" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedImage(null);
                }}
                className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75"
              >
                <XIcon className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
