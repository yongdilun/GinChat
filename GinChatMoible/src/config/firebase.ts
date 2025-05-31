import { initializeApp } from 'firebase/app';
import {
  FIREBASE_PROJECT_NUMBER,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_DATABASE_URL,
  FIREBASE_MOBILE_SDK_APP_ID,
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
} from '@env';

export const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  databaseURL: FIREBASE_DATABASE_URL,
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Validate required environment variables
const requiredVars = [
  'FIREBASE_PROJECT_NUMBER',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MOBILE_SDK_APP_ID',
  'FIREBASE_API_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required Firebase environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('\n📝 Please copy .env.example to .env and fill in your Firebase credentials');
} 