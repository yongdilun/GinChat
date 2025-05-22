#!/usr/bin/env node

/**
 * This script combines all fix scripts to solve common Expo project issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const root = process.cwd();

console.log('🔧 Starting comprehensive fix for Expo project issues...');

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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask user what they want to fix
console.log('\n📋 What would you like to fix?');
console.log('1. Fix expo-router plugin issues');
console.log('2. Check for Expo CLI conflicts');
console.log('3. Clean Metro bundler cache');
console.log('4. Perform a clean installation');
console.log('5. Fix Windows long path issues');
console.log('6. Fix Metro bundler loop issue');
console.log('7. Fix Expo Router entry point');
console.log('8. Fix dependency issues (ajv, etc.)');
console.log('9. ALL OF THE ABOVE (recommended)');

rl.question('\nEnter your choice (1-9): ', (answer) => {
  const choice = parseInt(answer.trim());

  if (isNaN(choice) || choice < 1 || choice > 9) {
    console.log('❌ Invalid choice. Exiting.');
    rl.close();
    return;
  }

  // Process user choice
  switch(choice) {
    case 1:
      fixExpoRouter();
      break;
    case 2:
      checkExpoCLI();
      break;
    case 3:
      cleanMetroCache();
      break;
    case 4:
      performCleanInstall();
      break;
    case 5:
      fixWindowsLongPaths();
      break;
    case 6:
      fixBundlerLoop();
      break;
    case 7:
      fixEntryPoint();
      break;
    case 8:
      fixDependencies();
      break;
    case 9:
      fixAll();
      break;
  }

  rl.close();
});

// Fix functions
function fixExpoRouter() {
  console.log('\n🔧 Fixing expo-router issues...');
  safeExec('node ./scripts/fix-expo-router.js');
}

function checkExpoCLI() {
  console.log('\n🔍 Checking Expo CLI installations...');
  safeExec('node ./scripts/check-expo-cli.js');
}

function cleanMetroCache() {
  console.log('\n🧹 Cleaning Metro bundler cache...');
  safeExec('node ./scripts/reset-metro.js');
}

function performCleanInstall() {
  console.log('\n📦 Performing clean installation...');
  safeExec('node ./scripts/clean-install.js');
}

function fixWindowsLongPaths() {
  console.log('\n🪟 Fixing Windows long path issues...');
  safeExec('node ./scripts/enable-long-paths.js');
}

function fixBundlerLoop() {
  console.log('\n🔄 Fixing Metro bundler loop issue...');
  safeExec('node ./scripts/fix-bundler-loop.js');
}

function fixEntryPoint() {
  console.log('\n🚪 Fixing Expo Router entry point...');
  safeExec('node ./scripts/fix-entry-point.js');
}

function fixDependencies() {
  console.log('\n📦 Fixing dependency issues...');
  safeExec('node ./scripts/fix-dependencies.js');
}

function fixAll() {
  console.log('\n✨ Performing ALL fixes in recommended order...');

  // 1. Check Expo CLI first
  checkExpoCLI();

  // 2. Fix Windows long paths
  fixWindowsLongPaths();

  // 3. Clean Metro cache
  cleanMetroCache();

  // 4. Fix dependency issues
  fixDependencies();

  // 5. Fix expo-router
  fixExpoRouter();

  // 6. Fix Expo Router entry point
  fixEntryPoint();

  // 7. Fix bundler loop issue
  fixBundlerLoop();

  // 8. Perform clean install
  performCleanInstall();

  console.log('\n🎉 All fixes have been applied!');
  console.log('\n📋 Next steps:');
  console.log('1. Run "npm run start-safe" to start the development server with bundler loop protection');
  console.log('2. If issues persist, try "npm run start-prod" for a production build without hot reloading');
  console.log('3. As a last resort, try uninstalling and reinstalling Node.js');
}
