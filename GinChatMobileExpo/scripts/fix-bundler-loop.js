#!/usr/bin/env node

/**
 * This script fixes the issue with Metro bundler getting stuck in a loop
 * with expo-router/entry.js and expo-router/node/render.js files
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();

console.log('🔄 Fixing Metro bundler loop issue...');

// Function to execute commands safely
function safeExec(command, options = {}) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { 
      stdio: 'inherit',
      ...options
    });
    return true;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Create a .watchmanconfig file to exclude problematic directories
console.log('\n📝 Creating optimized .watchmanconfig file...');
const watchmanConfig = {
  "ignore_dirs": [
    ".git",
    "node_modules",
    ".expo",
    "android",
    "ios",
    "build",
    "dist"
  ]
};

try {
  fs.writeFileSync(
    path.join(root, '.watchmanconfig'),
    JSON.stringify(watchmanConfig, null, 2),
    'utf8'
  );
  console.log('✅ Created .watchmanconfig file');
} catch (error) {
  console.error(`❌ Error creating .watchmanconfig file: ${error.message}`);
}

// Clean watchman watches
console.log('\n🧹 Cleaning watchman watches...');
try {
  execSync('watchman watch-del-all', { stdio: 'inherit' });
  console.log('✅ Cleaned watchman watches');
} catch (error) {
  console.log('⚠️ Could not clean watchman watches. This is not critical if watchman is not installed.');
}

// Clear Metro cache
console.log('\n🧹 Clearing Metro cache...');
try {
  const cacheDir = path.join(root, 'node_modules', '.cache');
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('✅ Cleared Metro cache');
  }
} catch (error) {
  console.error(`❌ Error clearing Metro cache: ${error.message}`);
}

// Clear Expo cache
console.log('\n🧹 Clearing Expo cache...');
try {
  const expoDir = path.join(root, '.expo');
  if (fs.existsSync(expoDir)) {
    fs.rmSync(expoDir, { recursive: true, force: true });
    console.log('✅ Cleared Expo cache');
  }
} catch (error) {
  console.error(`❌ Error clearing Expo cache: ${error.message}`);
}

// Create a fresh .expo directory
try {
  fs.mkdirSync(path.join(root, '.expo'), { recursive: true });
  console.log('✅ Created fresh .expo directory');
} catch (error) {
  console.error(`❌ Error creating .expo directory: ${error.message}`);
}

console.log('\n📋 Next steps:');
console.log('1. Run "npm start -- --no-dev" to start the development server in production mode');
console.log('   This will disable hot reloading but should prevent the bundler loop');
console.log('2. If you need hot reloading, try "npm start -- --reset-cache" instead');
console.log('3. If issues persist, try "npm run clean-install" for a complete reinstallation');
