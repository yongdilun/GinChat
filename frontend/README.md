# GinChat Frontend

A modern real-time chat application frontend built with React, Next.js, TypeScript, and Tailwind CSS with comprehensive message read status tracking and blue tick system.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (v14.1.0)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (v5.3.3)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v3.4.1)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (v4.5.0)
- **HTTP Client**: [Axios](https://axios-http.com/) (v1.6.7)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) (v7.50.0)
- **Data Fetching**: [React Query](https://react-query.tanstack.com/) (v3.39.3)
- **WebSocket Client**: [Socket.IO Client](https://socket.io/docs/v4/client-api/) (v4.7.4)
- **UI Components**:
  - [Heroicons](https://heroicons.com/) (v1.0.6)
  - [React Icons](https://react-icons.github.io/react-icons/) (v5.0.1)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (v12.12.1)

## Project Structure

```
frontend/
├── public/                # Static files
├── src/                   # Source code
│   ├── app/               # Next.js App Router
│   │   ├── auth/          # Authentication pages
│   │   ├── chat/          # Chat pages
│   │   ├── error.tsx      # Error handling
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Home page
│   ├── components/        # React components
│   │   ├── auth/          # Authentication components
│   │   ├── chat/          # Chat-related components
│   │   ├── ui/            # Reusable UI components
│   │   ├── Layout.tsx     # Main layout component
│   │   └── Navbar.tsx     # Navigation bar
│   ├── hooks/             # Custom React hooks
│   │   └── useWebSocket.ts # WebSocket hook
│   ├── services/          # API services
│   │   ├── api.ts         # Axios instance and API methods
│   │   └── websocket.ts   # WebSocket manager
│   ├── store/             # Zustand state management
│   └── types/             # TypeScript type definitions
├── .eslintrc.json         # ESLint configuration
├── .stylelintrc.json      # Stylelint configuration
├── next.config.js         # Next.js configuration
├── package.json           # Dependencies and scripts
├── postcss.config.js      # PostCSS configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Key Features

- **Modern React with Next.js App Router**: Utilizing the latest Next.js features for efficient routing and server components
- **Type-Safe Development**: Full TypeScript integration for better developer experience and code quality
- **Responsive UI with Tailwind CSS**: Fully responsive design using utility-first CSS framework
- **Real-time Communication**: Advanced WebSocket integration for instant messaging
  - **Instant Message Delivery**: Messages appear immediately across all connected clients
  - **Live Message Broadcasting**: Real-time message distribution without page refresh
  - **Auto-reconnection**: Robust connection management with exponential backoff
  - **Connection Status Indicators**: Visual WebSocket connection status (green/red dots)
- **Message Read Status System**: Complete WhatsApp-like blue tick implementation
  - **Grey/Blue Tick Indicators**: Visual read status like WhatsApp/Telegram
    - Single grey tick: Message delivered (not read)
    - Double grey tick: Message read by some recipients
    - Double blue tick: Message read by ALL recipients
  - **Real-time Read Status Updates**: Read status changes instantly via WebSocket
  - **Unread message count indicators in sidebar**: Live unread count updates
  - **Latest message preview for each chatroom**: Real-time sidebar updates
  - **Auto-navigation to first unread message**: Smart scroll to unread content
  - **Auto-mark messages as read when entering chatroom**: Automatic read marking
  - **Info button to view detailed read status**: Per-user read status details
  - **"Unread messages" label for navigation**: Clear unread message indication
- **WebSocket Real-time Features**:
  - **Live Sidebar Updates**: Unread counts and latest messages update instantly
  - **Real-time Message Appearance**: New messages appear immediately in chat
  - **Live Read Receipt Updates**: Blue ticks update in real-time when messages are read
  - **Connection Management**: Automatic reconnection with status indicators
  - **Dual WebSocket System**: Separate connections for chat and sidebar updates
- **Authentication**: JWT-based authentication with secure token handling
- **Chatroom Management**: Room codes, passwords, and member management
- **Media Support**: Upload and share images, audio, and video files
- **Form Validation**: Client-side validation using React Hook Form
- **API Integration**: Axios for REST API communication with the backend
- **Error Handling**: Comprehensive error handling with dedicated error boundaries
- **Code Quality**: ESLint and Stylelint for code quality enforcement

## API Communication

The frontend communicates with the backend through:

1. **REST API**: For authentication, fetching data, and performing actions
2. **WebSockets**: For real-time messaging and notifications

### WebSocket Integration

The application uses a dual WebSocket system for optimal real-time performance:

#### 1. Sidebar WebSocket Connection
- **Purpose**: Real-time sidebar updates (unread counts, latest messages)
- **Connection**: `ws://your-domain/ws?user_id=123`
- **Features**:
  - Live unread count updates
  - Real-time latest message previews
  - Connection status monitoring
  - Auto-reconnection with exponential backoff

#### 2. Chat Room WebSocket Connection (Future Enhancement)
- **Purpose**: Room-specific real-time messaging
- **Connection**: `ws://your-domain/api/ws?token=jwt&room_id=room123`
- **Features**:
  - Instant message delivery
  - Real-time read status updates
  - Typing indicators (planned)

#### WebSocket Context Provider
```typescript
// WebSocket context provides:
interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

// Usage in components:
const { isConnected, lastMessage, connectionStatus } = useWebSocket();
```

#### Real-time Message Handling
```typescript
// MessageList handles real-time updates:
useEffect(() => {
  if (!lastMessage || !selectedChatroom) return;

  switch (lastMessage.type) {
    case 'new_message':
      if (lastMessage.chatroom_id === selectedChatroom.id) {
        onNewMessage(lastMessage.data as Message);
        // Auto-scroll to new message
      }
      break;

    case 'message_read':
      if (lastMessage.chatroom_id === selectedChatroom.id) {
        onMessageReadStatusUpdate(data.message_id, data.read_status);
        onRefreshMessages(); // Refresh to get updated read status
      }
      break;

    case 'unread_count_update':
      // Update sidebar unread counts immediately
      updateUnreadCounts(lastMessage.data);
      break;
  }
}, [lastMessage, selectedChatroom]);
```

API routes are proxied through Next.js to avoid CORS issues:

```javascript
// next.config.js
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8080/api/:path*',
    },
    {
      source: '/health',
      destination: 'http://localhost:8080/health',
    },
  ];
}
```

## Authentication Flow

1. User registers or logs in through the `/auth` pages
2. JWT token is stored in localStorage
3. Token is attached to all subsequent API requests via Axios interceptors
4. WebSocket connections use the token as a URL parameter

## Message Types

The application supports various message types:
- `text`: Plain text messages
- `picture`: Image messages
- `audio`: Audio messages
- `video`: Video messages
- `text_and_picture`: Text with image
- `text_and_audio`: Text with audio
- `text_and_video`: Text with video

## Message Read Status Features

### Real-time WebSocket Updates
- **Live Unread Count Updates**: Sidebar badges update instantly when messages are sent/read
- **Real-time Read Status Changes**: Grey/blue ticks update immediately via WebSocket
- **Instant Message Appearance**: New messages appear immediately without refresh
- **Connection Status Monitoring**: Visual indicators show WebSocket connection status

### Grey/Blue Tick System (WhatsApp-like)
- **Single Grey Tick (✓)**: Message delivered but not read by anyone
- **Double Grey Tick (✓✓)**: Message read by some recipients
- **Double Blue Tick (✓✓)**: Message read by ALL recipients
- **Real-time Updates**: Tick status changes instantly when users read messages
- **Tooltips**: Hover over ticks to see status descriptions

### Sidebar Enhancements
- **Live Unread Count Badges**: Red circular badges with real-time updates via WebSocket
- **Latest Message Preview**: Shows the most recent message with smart truncation and media type icons
- **Real-time Latest Messages**: Updates immediately when new messages arrive
- **Responsive Design**: Adapts to both expanded and collapsed sidebar states
- **Connection Status Indicator**: Green/red dot showing WebSocket connection status

### Message List Features
- **Auto-Navigation**: Automatically scrolls to the first unread message when entering a chatroom
- **Unread Messages Label**: Blue floating label appears above the oldest unread message for easy identification
- **Auto-Mark as Read**: Messages are automatically marked as read after 2 seconds in the chatroom
- **Real-time Message Appearance**: New messages appear instantly via WebSocket
- **Live Read Status Updates**: Read status changes immediately when other users read messages
- **Clean Visual Design**: No highlighting or rings, just the unread label for clear indication

### Message Actions
- **Info Button**: Green info button available on all messages (not just sender's messages)
- **Read Status Modal**: Shows detailed information about who has read each message
- **Permission-Based Actions**: Edit and delete buttons only appear for message senders
- **Real-time Data**: Read status information is fetched live from the backend
- **Live Updates**: Read status modal updates in real-time via WebSocket

### UI/UX Improvements
- **Animated Badges**: Unread count badges have subtle pulse animation
- **Smart Truncation**: Long messages are truncated with "..." for better layout
- **Media Type Icons**: Different icons for photos (📷), audio (🎵), and video (🎥)
- **Loading States**: Proper loading indicators while fetching read status data
- **Connection Indicators**: Visual feedback for WebSocket connection status
- **Smooth Animations**: Framer Motion animations for better user experience

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
# or
yarn install
```

### Development

```bash
# Start development server
npm run dev
# or
yarn dev
```

The application will be available at http://localhost:3000.

### Code Quality Checks

```bash
# TypeScript type checking
npm run check:ts
# or
yarn check:ts

# CSS linting
npm run check:css
# or
yarn check:css

# Run all checks
npm run check:all
# or
yarn check:all
```

### Building for Production

```bash
# Build the application
npm run build
# or
yarn build

# Start production server
npm run start
# or
yarn start
```

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# API URL (only needed if not using the Next.js proxy)
NEXT_PUBLIC_API_URL=http://localhost:8080

# Other environment-specific variables
```

## Connecting to the Backend

The frontend expects the backend to be running on `http://localhost:8080` by default. This can be changed in the `next.config.js` file.

The application checks for backend availability using the `/health` endpoint.

## Recent Updates & Improvements

### WebSocket & Connection Stability (Latest)
- **Simplified Auto-Mark Logic**: Removed complex frontend auto-marking to prevent connection issues
- **Enhanced Error Handling**: Improved API error handling with better user feedback
- **Connection Optimization**: Reduced API timeout from 15s to 10s for better responsiveness
- **WebSocket Reliability**: Simplified WebSocket message handling for better stability

### Visual Tick System Enhancements
- **Simple Tick Logic**: Streamlined grey/blue tick system based on existing read status data
- **Real-time Updates**: Ticks update instantly via WebSocket without additional API calls
- **Performance Optimization**: Eliminated excessive API requests that caused connection issues
- **Visual Consistency**: Consistent tick display across all message types

### UI/UX Improvements
- **Responsive Design**: Better mobile and desktop experience
- **Loading States**: Improved loading indicators and error states
- **Animation Enhancements**: Smooth Framer Motion animations for better user experience
- **Accessibility**: Better keyboard navigation and screen reader support

### Code Quality & Performance
- **TypeScript Strict Mode**: Enhanced type safety and developer experience
- **Component Optimization**: Better React component structure and performance
- **Error Boundaries**: Comprehensive error handling with fallback UI
- **Bundle Optimization**: Reduced bundle size and improved loading times

### Security Enhancements
- **JWT Token Management**: Secure token storage and automatic refresh
- **API Security**: Proper authentication headers and CORS handling
- **Input Validation**: Client-side validation with React Hook Form
- **XSS Protection**: Sanitized user input and secure content rendering

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
