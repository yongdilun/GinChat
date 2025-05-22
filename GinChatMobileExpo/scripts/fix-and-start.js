#!/usr/bin/env node

/**
 * This script applies all fixes and starts the app
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();

console.log('🚀 Applying all fixes and starting the app...');

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

// Apply all fixes in the correct order
console.log('\n🔧 Applying all fixes...');

// 1. Fix dependencies
console.log('\n📦 Fixing dependency issues...');
safeExec('node ./scripts/fix-dependencies.js');

// 2. Fix entry point
console.log('\n🚪 Fixing Expo Router entry point...');
safeExec('node ./scripts/fix-entry-point.js');

// 3. Fix bundler loop
console.log('\n🔄 Fixing Metro bundler loop issue...');
safeExec('node ./scripts/fix-bundler-loop.js');

// 4. Clean Metro cache
console.log('\n🧹 Cleaning Metro cache...');
safeExec('node ./scripts/reset-metro.js');

// Start the app
console.log('\n🚀 Starting the app...');
safeExec('expo start --clear --reset-cache');

console.log('\n✨ Done!');
