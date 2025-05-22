#!/usr/bin/env node

/**
 * This script clears various caches that can cause issues with Expo/React Native
 * development, especially when the bundler gets stuck in a loop.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = process.cwd();

console.log('🧹 Clearing caches and temporary files...');

// Functions to run cleanup tasks
const tasks = [
  {
    name: 'Clear Metro bundler cache',
    run: () => {
      try {
        const cacheDir = path.join(root, 'node_modules', '.cache');
        if (fs.existsSync(cacheDir)) {
          console.log(`Removing ${cacheDir}`);
          fs.rmSync(cacheDir, { recursive: true, force: true });
        }
        return true;
      } catch (error) {
        console.error(`Error clearing Metro cache: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'Clear Watchman watches',
    run: () => {
      try {
        console.log('Clearing Watchman watches...');
        // Check if we're on Windows
        const isWindows = process.platform === 'win32';
        if (isWindows) {
          // On Windows, watchman might be in a different location or not in PATH
          try {
            execSync('watchman watch-del-all', { stdio: 'inherit' });
          } catch (e) {
            // Try with full path for Windows
            console.log('Trying alternative watchman path...');
            execSync('"%USERPROFILE%\\AppData\\Local\\watchman\\bin\\watchman" watch-del-all', { stdio: 'inherit', shell: true });
          }
        } else {
          execSync('watchman watch-del-all', { stdio: 'inherit' });
        }
        return true;
      } catch (error) {
        console.error(`Error clearing Watchman watches: ${error.message}`);
        console.log('Watchman might not be installed or not in PATH, skipping...');
        return false;
      }
    }
  },
  {
    name: 'Clear Expo cache',
    run: () => {
      try {
        const expoCacheDir = path.join(os.homedir(), '.expo');
        if (fs.existsSync(expoCacheDir)) {
          console.log(`Clearing Expo cache in ${expoCacheDir}`);
          // Don't delete the entire directory, just clear specific cache files
          const cacheFiles = fs.readdirSync(expoCacheDir);
          cacheFiles.forEach(file => {
            if (file.includes('cache')) {
              fs.rmSync(path.join(expoCacheDir, file), { recursive: true, force: true });
            }
          });
        }
        return true;
      } catch (error) {
        console.error(`Error clearing Expo cache: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'Clear React Native cache',
    run: () => {
      try {
        const tempDir = path.join(os.tmpdir());
        if (fs.existsSync(tempDir)) {
          console.log(`Clearing React Native temporary files in ${tempDir}`);
          const tempFiles = fs.readdirSync(tempDir);
          tempFiles.forEach(file => {
            if (file.includes('react-native') || file.includes('metro-bundler')) {
              try {
                fs.rmSync(path.join(tempDir, file), { recursive: true, force: true });
              } catch (e) {
                // Ignore errors for temp files that can't be deleted
              }
            }
          });
        }
        return true;
      } catch (error) {
        console.error(`Error clearing React Native cache: ${error.message}`);
        return false;
      }
    }
  }
];

// Run all tasks
const results = tasks.map(task => {
  console.log(`\n🔄 ${task.name}...`);
  const success = task.run();
  console.log(`${success ? '✅' : '❌'} ${task.name} ${success ? 'completed' : 'failed'}`);
  return success;
});

console.log('\n🧹 Cleanup completed!');
console.log(`✅ ${results.filter(Boolean).length} tasks completed successfully`);
console.log(`❌ ${results.filter(r => !r).length} tasks failed`);

console.log('\n📋 Next steps:');
console.log('1. Run "npm start" to start the development server with a clean cache');
console.log('2. If issues persist, try "npm run clean" which runs this script and starts the server');
console.log('3. As a last resort, delete node_modules and run "npm install" again');
