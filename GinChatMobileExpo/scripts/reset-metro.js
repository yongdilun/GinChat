#!/usr/bin/env node

/**
 * This is a simplified script to reset the Metro bundler cache
 * without relying on external tools like watchman.
 * It's designed to be more compatible with Windows environments.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const root = process.cwd();

console.log('🧹 Performing minimal Metro bundler reset...');

// Delete the Metro cache directory
try {
  const cacheDir = path.join(root, 'node_modules', '.cache');
  if (fs.existsSync(cacheDir)) {
    console.log(`Removing Metro cache: ${cacheDir}`);
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('✅ Metro cache removed successfully');
  } else {
    console.log('ℹ️ No Metro cache directory found');
  }
} catch (error) {
  console.error(`❌ Error removing Metro cache: ${error.message}`);
}

// Delete the .expo directory in the project
try {
  const expoDir = path.join(root, '.expo');
  if (fs.existsSync(expoDir)) {
    console.log(`Removing Expo directory: ${expoDir}`);
    fs.rmSync(expoDir, { recursive: true, force: true });
    console.log('✅ Expo directory removed successfully');
  } else {
    console.log('ℹ️ No .expo directory found in project');
  }
} catch (error) {
  console.error(`❌ Error removing .expo directory: ${error.message}`);
}

// Create a fresh .expo directory to prevent issues
try {
  const expoDir = path.join(root, '.expo');
  fs.mkdirSync(expoDir, { recursive: true });
  console.log('✅ Created fresh .expo directory');
} catch (error) {
  console.error(`❌ Error creating .expo directory: ${error.message}`);
}

console.log('\n✅ Metro bundler reset completed');
console.log('\n📋 Next steps:');
console.log('1. Run "npm start" to start the development server');
console.log('2. If issues persist, try deleting node_modules and running "npm install"');
