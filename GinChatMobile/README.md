# GinChat Mobile

A modern, feature-rich mobile chat application built with React Native and Expo. GinChat Mobile provides real-time messaging capabilities with support for text, images, videos, and audio messages.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Project Structure](#project-structure)
- [Pages and Components](#pages-and-components)
- [API Integration](#api-integration)
- [Media Handling](#media-handling)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Best Practices](#best-practices)
- [Contributing](#contributing)

## Features

- Real-time messaging
- Multi-media support (text, images, videos, audio)
- Group chat functionality
- Media download capabilities
- User authentication
- Modern UI with dark/light theme support
- Message status indicators
- Media preview and playback
- File download functionality

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator
- React Native development environment setup

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/GinChat.git
cd GinChatMobile
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on your preferred platform:
- Press 'i' for iOS
- Press 'a' for Android
- Press 'w' for web

## Environment Setup

### Development Environment

1. Create a `.env` file in the root directory:
```bash
# API Configuration
API_URL=https://ginchat-14ry.onrender.com/api
API_TIMEOUT=20000

# Feature Flags
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_FILE_ENCRYPTION=true

# Development Settings
DEBUG_MODE=false
```

2. Install required development dependencies:
```bash
npm install -D @types/react-native @types/expo
```

3. Configure your IDE:
- Install ESLint extension
- Install Prettier extension
- Use TypeScript version > 4.5

### iOS Setup

1. Install Cocoapods:
```bash
sudo gem install cocoapods
```

2. Install iOS dependencies:
```bash
cd ios
pod install
cd ..
```

### Android Setup

1. Create/update `android/local.properties`:
```properties
sdk.dir = /path/to/your/Android/sdk
```

2. Configure Android Studio:
- Install Android SDK 31
- Install Android Build Tools
- Configure Android Virtual Device

### Troubleshooting Common Issues

1. Metro Bundler Issues:
```bash
# Clear metro cache
npx react-native start --reset-cache
```

2. iOS Build Failures:
```bash
cd ios
pod deintegrate
pod install
```

3. Android Build Failures:
```bash
cd android
./gradlew clean
```

## Project Structure

```
GinChatMobile/
├── app/                    # App pages using Expo Router
│   ├── chat/              # Chat-related screens
│   ├── settings/          # Settings screens
│   └── index.tsx          # Entry point
├── src/
│   ├── components/        # Reusable components
│   ├── contexts/         # React contexts
│   ├── services/         # API and other services
│   ├── constants/        # App constants
│   └── types/            # TypeScript type definitions
├── assets/               # Static assets
└── package.json
```

## Pages and Components

### Authentication Pages

#### Login Screen (`app/login.tsx`)
- User authentication with email/password
- Error handling and validation
- Remember me functionality
- Navigation to registration

#### Registration Screen (`app/register.tsx`)
- New user registration
- Form validation
- Profile setup

### Chat Pages

#### Chat List (`app/index.tsx`)
- Displays all chat rooms
- Real-time updates for new messages
- Chat room creation
- Search functionality

#### Chat Room (`app/chat/[id].tsx`)
Features:
- Real-time messaging
- Media handling (images, videos, audio)
- Message status indicators
- User presence
- Media preview and downloads

Key Functions:
```typescript
// Message sending with media support
handleSendMessage(): Promise<void>

// Media selection and processing
handlePickMedia(): Promise<void>

// Message rendering with different types
renderMessage({ item: Message }): JSX.Element

// Media downloads
handleDownloadVideo(): Promise<void>
handleDownloadAudio(): Promise<void>
```

Components:
- `VideoPlayer`: Video playback with controls
- `AudioPlayer`: Audio playback with progress bar
- `ChatDetailHeader`: Room information and media gallery

### Settings Pages

#### Profile Settings (`app/settings/profile.tsx`)
- User profile management
- Avatar upload
- Personal information update

#### App Settings (`app/settings/app.tsx`)
- Theme selection
- Notification preferences
- Privacy settings

## API Integration

The app uses a RESTful API for data management. Key services:

### Authentication API (`services/api.ts`)
```typescript
authAPI.login(email: string, password: string)
authAPI.register(name: string, email: string, password: string)
authAPI.logout()
authAPI.getCurrentUser()
```

### Chat API (`services/api.ts`)
```typescript
chatAPI.getConversations()
chatAPI.getConversationById(id: string)
chatAPI.sendMessage(conversationId: string, content: MessageContent)
chatAPI.getMessages(conversationId: string, page?: number)
```

### Media API (`services/api.ts`)
```typescript
mediaAPI.uploadMedia(file: MediaFile, messageType: string)
```

## Media Handling

### Supported Media Types
- Images: jpg, jpeg, png, gif
- Videos: mp4, mov
- Audio: mp3, wav

### Media Upload Process
1. File selection using device picker
2. Type detection and validation
3. FormData preparation
4. Upload with progress tracking
5. Server response handling

### Media Playback
- Native video player with controls
- Custom audio player with progress bar
- Image viewer with zoom support

### Download Functionality
- Permission handling
- Progress tracking
- Media library integration
- Error handling

## Testing

### Unit Testing

Run unit tests using Jest:
```bash
npm test
```

Key test files:
- `__tests__/components/`: Component tests
- `__tests__/services/`: API and service tests
- `__tests__/utils/`: Utility function tests

### E2E Testing

Run end-to-end tests using Detox:
```bash
# Build for testing
detox build

# Run tests
detox test
```

### Manual Testing Checklist

1. Authentication:
   - [ ] Login with valid credentials
   - [ ] Login with invalid credentials
   - [ ] Registration flow
   - [ ] Password reset flow

2. Chat Functionality:
   - [ ] Send/receive text messages
   - [ ] Send/receive images
   - [ ] Send/receive videos
   - [ ] Send/receive audio
   - [ ] Message status updates

3. Media Handling:
   - [ ] Image upload and preview
   - [ ] Video upload and playback
   - [ ] Audio recording and playback
   - [ ] File downloads

4. Performance:
   - [ ] Load time < 3 seconds
   - [ ] Smooth scrolling
   - [ ] Memory usage
   - [ ] Battery consumption

## Deployment

### Building for Production

1. iOS Build:
```bash
# Update version in app.json
expo build:ios

# Or using EAS
eas build --platform ios
```

2. Android Build:
```bash
# Update version in app.json
expo build:android

# Or using EAS
eas build --platform android
```

### App Store Deployment

1. iOS App Store:
   - Update app version
   - Generate screenshots
   - Update metadata
   - Submit through App Store Connect

2. Google Play Store:
   - Update app version
   - Generate screenshots
   - Update metadata
   - Submit through Google Play Console

### CI/CD Pipeline

Using GitHub Actions for automated deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Dependencies
        run: npm install
      - name: Run Tests
        run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Expo
        uses: expo/expo-github-action@v7
      - name: Build
        run: eas build --platform all
```

### Version Management

Follow semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

Update version in:
- `app.json`
- `package.json`
- iOS: `Info.plist`
- Android: `build.gradle`

## Security

### Authentication & Authorization

- JWT token-based authentication
- Secure token storage using AsyncStorage encryption
- Automatic token refresh mechanism
- Session management and timeout

### Data Security

- End-to-end message encryption
- Secure file storage
- Media file encryption
- Network security with HTTPS

### Privacy Features

- Message deletion
- User blocking
- Private chat rooms
- Data retention policies

### Security Best Practices

1. Data Storage:
```typescript
// Use SecureStore for sensitive data
import * as SecureStore from 'expo-secure-store';

// Store sensitive data
await SecureStore.setItemAsync('token', authToken);

// Retrieve sensitive data
const token = await SecureStore.getItemAsync('token');
```

2. API Security:
```typescript
// Add security headers
api.interceptors.request.use(config => {
  config.headers['X-Security-Header'] = 'value';
  return config;
});
```

3. Input Validation:
```typescript
// Validate user input
const validateMessage = (content: string) => {
  if (!content.trim()) throw new Error('Empty message');
  if (content.length > 1000) throw new Error('Message too long');
};
```

## Best Practices

### Code Style

Follow the project's style guide:
- Use TypeScript for type safety
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful comments

### Component Structure

```typescript
// Functional component with TypeScript
interface Props {
  title: string;
  onPress: () => void;
}

const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  // Component logic
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
};
```

### State Management

1. Local State:
```typescript
const [state, setState] = useState<StateType>(initialState);
```

2. Context API:
```typescript
const { user, updateUser } = useAuth();
```

3. Async Operations:
```typescript
const fetchData = async () => {
  try {
    setLoading(true);
    const result = await api.getData();
    setData(result);
  } catch (error) {
    handleError(error);
  } finally {
    setLoading(false);
  }
};
```

### Performance Optimization

1. Memoization:
```typescript
const memoizedValue = useMemo(() => computeValue(prop), [prop]);
```

2. Callback Optimization:
```typescript
const handlePress = useCallback(() => {
  // Handle press
}, [dependencies]);
```

3. List Optimization:
```typescript
const renderItem = useCallback(({ item }) => (
  <MessageItem message={item} />
), []);
```

### Error Handling

1. Global Error Boundary:
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to service
    logErrorToService(error, errorInfo);
  }
}
```

2. API Error Handling:
```typescript
try {
  await api.request();
} catch (error) {
  if (error.response?.status === 401) {
    // Handle unauthorized
  } else {
    // Handle other errors
  }
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Expo team for the amazing framework
- React Native community
- Contributors and testers 