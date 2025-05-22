#!/usr/bin/env node

/**
 * This script checks for conflicts between global and local Expo CLI installations
 * and provides guidance on how to fix them.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for Expo CLI conflicts...');

// Function to execute commands safely and return output
function safeExecWithOutput(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8',
      ...options
    }).toString().trim();
  } catch (error) {
    return null;
  }
}

// Check for global expo-cli
const globalExpoCli = safeExecWithOutput('npm list -g expo-cli --depth=0');
const hasGlobalExpoCli = globalExpoCli && globalExpoCli.includes('expo-cli');

// Check for global @expo/cli
const globalExpoCLI = safeExecWithOutput('npm list -g @expo/cli --depth=0');
const hasGlobalExpoCLI = globalExpoCLI && globalExpoCLI.includes('@expo/cli');

// Check for local expo
const localExpo = fs.existsSync(path.join(process.cwd(), 'node_modules', 'expo'));

// Check for local @expo/cli
const localExpoCLI = fs.existsSync(path.join(process.cwd(), 'node_modules', '@expo', 'cli'));

console.log('\n📊 Expo CLI Installation Status:');
console.log(`Global expo-cli: ${hasGlobalExpoCli ? '✅ Installed' : '❌ Not installed'}`);
console.log(`Global @expo/cli: ${hasGlobalExpoCLI ? '✅ Installed' : '❌ Not installed'}`);
console.log(`Local expo: ${localExpo ? '✅ Installed' : '❌ Not installed'}`);
console.log(`Local @expo/cli: ${localExpoCLI ? '✅ Installed' : '❌ Not installed'}`);

console.log('\n🔍 Analysis:');

// Check for potential conflicts
if (hasGlobalExpoCli && hasGlobalExpoCLI) {
  console.log('⚠️ CONFLICT: Both expo-cli and @expo/cli are installed globally.');
  console.log('   This can cause conflicts. The older expo-cli is deprecated.');
}

if (!hasGlobalExpoCLI && !localExpoCLI) {
  console.log('⚠️ ISSUE: No @expo/cli installation found (neither global nor local).');
  console.log('   This may cause problems with running Expo commands.');
}

if (!localExpo) {
  console.log('⚠️ ISSUE: Local expo package is not installed.');
  console.log('   This is required for your Expo project to work properly.');
}

console.log('\n📋 Recommendations:');

if (hasGlobalExpoCli) {
  console.log('1. Uninstall the deprecated global expo-cli:');
  console.log('   npm uninstall -g expo-cli');
}

if (!hasGlobalExpoCLI) {
  console.log('2. Install the new @expo/cli globally:');
  console.log('   npm install -g @expo/cli');
}

if (!localExpo || !localExpoCLI) {
  console.log('3. Reinstall local Expo packages:');
  console.log('   npm install expo @expo/cli --save');
}

console.log('\n4. After making these changes, run:');
console.log('   npm run fix-expo-router');
console.log('   npm run reset');
console.log('   npm start');

console.log('\n✨ For more information, visit: https://docs.expo.dev/more/expo-cli/');
