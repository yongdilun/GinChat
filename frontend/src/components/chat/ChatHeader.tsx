import { useState } from 'react';
import { Chatroom } from '@/types';
import { XIcon, PhotographIcon, DocumentTextIcon } from '@heroicons/react/outline';

interface ChatHeaderProps {
  chatroom: Chatroom | null;
  onClose: () => void;
}

interface File {
  name: string;
  url: string;
}

interface Media {
  url: string;
  type: string;
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

export default function ChatHeader({ chatroom, onClose }: ChatHeaderProps) {
  const [activeTab, setActiveTab] = useState<'media' | 'files'>('media');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">{chatroom.name}</h2>
          <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
            {chatroom.members?.length || 0} members
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <XIcon className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>

      <div className="border-t">
        <div className="flex">
          <button
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === 'media'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('media')}
          >
            <PhotographIcon className="w-5 h-5 mx-auto mb-1" aria-hidden="true" />
            Media
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === 'files'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('files')}
          >
            <DocumentTextIcon className="w-5 h-5 mx-auto mb-1" aria-hidden="true" />
            Files
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'media' ? (
          <div className="grid grid-cols-3 gap-4">
            {(extendedChatroom.media || []).map((media: Media, index: number) => (
              <div key={index} className="relative group">
                <img
                  src={media.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg cursor-pointer"
                  onClick={() => handleImageClick(media.url)}
                />
                <button
                  onClick={() => handleDownload(media.url)}
                  className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <DownloadIcon className="w-4 h-4 text-white" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(extendedChatroom.files || []).map((file: File, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <span className="text-sm text-gray-600">{file.name}</span>
                </div>
                <button
                  onClick={() => handleDownload(file.url)}
                  className="p-1 text-gray-400 hover:text-gray-500"
                >
                  <DownloadIcon className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Selected media"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={() => handleDownload(selectedImage)}
                className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75"
              >
                <DownloadIcon className="w-6 h-6" aria-hidden="true" />
              </button>
              <button
                onClick={() => setSelectedImage(null)}
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
