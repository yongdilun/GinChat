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
- **Real-time Communication**: WebSocket integration for instant messaging
- **Message Read Status System**: Complete blue tick implementation
  - Unread message count indicators in sidebar
  - Latest message preview for each chatroom
  - Auto-navigation to first unread message
  - Auto-mark messages as read when entering chatroom
  - Info button to view detailed read status
  - "Unread messages" label for navigation
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

### Sidebar Enhancements
- **Unread Count Badges**: Red circular badges showing unread message count for each chatroom
- **Latest Message Preview**: Shows the most recent message with smart truncation and media type icons
- **Responsive Design**: Adapts to both expanded and collapsed sidebar states
- **Real-time Updates**: Automatically refreshes when new messages arrive

### Message List Features
- **Auto-Navigation**: Automatically scrolls to the first unread message when entering a chatroom
- **Unread Messages Label**: Blue floating label appears above the oldest unread message for easy identification
- **Auto-Mark as Read**: Messages are automatically marked as read after 2 seconds in the chatroom
- **Clean Visual Design**: No highlighting or rings, just the unread label for clear indication

### Message Actions
- **Info Button**: Green info button available on all messages (not just sender's messages)
- **Read Status Modal**: Shows detailed information about who has read each message
- **Permission-Based Actions**: Edit and delete buttons only appear for message senders
- **Real-time Data**: Read status information is fetched live from the backend

### UI/UX Improvements
- **Animated Badges**: Unread count badges have subtle pulse animation
- **Smart Truncation**: Long messages are truncated with "..." for better layout
- **Media Type Icons**: Different icons for photos (📷), audio (🎵), and video (🎥)
- **Loading States**: Proper loading indicators while fetching read status data

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
