#!/usr/bin/env node

/**
 * This script performs a clean installation of dependencies
 * with optimized settings to avoid common issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = process.cwd();

console.log('🧹 Preparing for clean installation...');

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

// Clean up node_modules
console.log('\n🗑️  Removing node_modules directory...');
try {
  const nodeModulesPath = path.join(root, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    console.log('✅ node_modules removed successfully');
  } else {
    console.log('ℹ️ node_modules directory not found');
  }
} catch (error) {
  console.error(`❌ Error removing node_modules: ${error.message}`);
}

// Clean npm cache
console.log('\n🧹 Cleaning npm cache...');
safeExec('npm cache clean --force');

// Set npm config for better installation
console.log('\n⚙️ Setting npm configuration for better installation...');
safeExec('npm config set legacy-peer-deps true');
safeExec('npm config set fetch-retries 5');
safeExec('npm config set fetch-retry-mintimeout 20000');
safeExec('npm config set fetch-retry-maxtimeout 120000');

// Check if yarn is installed
const hasYarn = safeExec('yarn --version', { stdio: 'ignore' });

// Install dependencies
console.log('\n📦 Installing dependencies...');
if (hasYarn) {
  console.log('Using Yarn for installation (handles long paths better)');
  safeExec('yarn install');
} else {
  console.log('Using npm for installation');
  safeExec('npm install --no-fund --no-audit --prefer-offline --loglevel=error');
}

console.log('\n✅ Clean installation process completed');
console.log('\n📋 Next steps:');
console.log('1. Run "npm run reset" to reset the Metro bundler cache');
console.log('2. Run "npm start" to start the development server');
console.log('3. If you still see TAR_ENTRY_ERROR warnings, run "node scripts/enable-long-paths.js" for more help');
