#!/usr/bin/env node

/**
 * This script specifically fixes issues with expo-router plugin resolution
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();

console.log('🔧 Fixing expo-router plugin resolution issues...');

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

// Check if expo-router is installed
const expoRouterPath = path.join(root, 'node_modules', 'expo-router');
if (!fs.existsSync(expoRouterPath)) {
  console.log('❌ expo-router is not installed or the directory is missing');
} else {
  console.log('✅ expo-router directory exists');
}

// Check if the plugin file exists
const pluginPath = path.join(expoRouterPath, 'plugin', 'build');
if (!fs.existsSync(pluginPath)) {
  console.log('❌ expo-router plugin directory is missing');
} else {
  console.log('✅ expo-router plugin directory exists');
}

console.log('\n🧹 Cleaning specific packages...');

// Remove expo-router
try {
  const expoRouterPath = path.join(root, 'node_modules', 'expo-router');
  if (fs.existsSync(expoRouterPath)) {
    fs.rmSync(expoRouterPath, { recursive: true, force: true });
    console.log('✅ Removed expo-router directory');
  }
} catch (error) {
  console.error(`❌ Error removing expo-router: ${error.message}`);
}

// Remove @expo directory
try {
  const expoPath = path.join(root, 'node_modules', '@expo');
  if (fs.existsSync(expoPath)) {
    fs.rmSync(expoPath, { recursive: true, force: true });
    console.log('✅ Removed @expo directory');
  }
} catch (error) {
  console.error(`❌ Error removing @expo directory: ${error.message}`);
}

// Remove expo directory
try {
  const expoPath = path.join(root, 'node_modules', 'expo');
  if (fs.existsSync(expoPath)) {
    fs.rmSync(expoPath, { recursive: true, force: true });
    console.log('✅ Removed expo directory');
  }
} catch (error) {
  console.error(`❌ Error removing expo directory: ${error.message}`);
}

// Clean npm cache for expo packages
console.log('\n🧹 Cleaning npm cache for expo packages...');
safeExec('npm cache clean --force');

// Reinstall specific packages
console.log('\n📦 Reinstalling expo packages...');
safeExec('npm install expo expo-router --save');

// Check if the installation was successful
const newExpoRouterPath = path.join(root, 'node_modules', 'expo-router');
if (!fs.existsSync(newExpoRouterPath)) {
  console.log('❌ expo-router is still not installed properly');
} else {
  console.log('✅ expo-router was reinstalled successfully');
}

// Check if the plugin file exists now
const newPluginPath = path.join(newExpoRouterPath, 'plugin', 'build');
if (!fs.existsSync(newPluginPath)) {
  console.log('❌ expo-router plugin directory is still missing');
} else {
  console.log('✅ expo-router plugin directory was created successfully');
}

console.log('\n📋 Next steps:');
console.log('1. Run "npm install" to reinstall any remaining dependencies');
console.log('2. Run "npm run reset" to reset the Metro bundler cache');
console.log('3. Run "npm start" to start the development server');
console.log('4. If issues persist, try "npm run clean-install" for a complete reinstallation');
