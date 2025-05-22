#!/usr/bin/env node

/**
 * This script fixes issues with the Expo Router entry point
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();

console.log('🔧 Fixing Expo Router entry point issues...');

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

// Create App.js entry point
console.log('\n📝 Creating App.js entry point...');
try {
  fs.writeFileSync(
    path.join(root, 'App.js'),
    "import 'expo-router/entry';",
    'utf8'
  );
  console.log('✅ Created App.js entry point');
} catch (error) {
  console.error(`❌ Error creating App.js: ${error.message}`);
}

// Update package.json main field
console.log('\n📝 Updating package.json main field...');
try {
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Update the main field
  packageJson.main = 'node_modules/expo/AppEntry.js';
  
  // Write the updated package.json
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2),
    'utf8'
  );
  console.log('✅ Updated package.json main field');
} catch (error) {
  console.error(`❌ Error updating package.json: ${error.message}`);
}

// Reinstall expo-router
console.log('\n📦 Reinstalling expo-router...');
safeExec('npm uninstall expo-router');
safeExec('npm install expo-router@latest --save');

// Create babel.config.js if it doesn't exist
console.log('\n📝 Checking babel.config.js...');
const babelConfigPath = path.join(root, 'babel.config.js');
if (!fs.existsSync(babelConfigPath)) {
  try {
    fs.writeFileSync(
      babelConfigPath,
      `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['expo-router/babel'],
  };
};`,
      'utf8'
    );
    console.log('✅ Created babel.config.js');
  } catch (error) {
    console.error(`❌ Error creating babel.config.js: ${error.message}`);
  }
} else {
  console.log('✅ babel.config.js already exists');
}

console.log('\n📋 Next steps:');
console.log('1. Run "npm start -- --reset-cache" to start the development server with a clean cache');
console.log('2. If issues persist, try "npm run clean-install" for a complete reinstallation');
