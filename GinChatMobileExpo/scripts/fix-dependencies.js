#!/usr/bin/env node

/**
 * This script fixes dependency issues, particularly with ajv and related packages
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();

console.log('🔧 Fixing dependency issues...');

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

// Remove problematic dependencies
console.log('\n🗑️ Removing problematic dependencies...');
try {
  // Remove ajv and related packages
  const packagesToRemove = [
    'ajv',
    'ajv-keywords',
    'schema-utils'
  ];
  
  for (const pkg of packagesToRemove) {
    const pkgPath = path.join(root, 'node_modules', pkg);
    if (fs.existsSync(pkgPath)) {
      fs.rmSync(pkgPath, { recursive: true, force: true });
      console.log(`✅ Removed ${pkg}`);
    }
  }
} catch (error) {
  console.error(`❌ Error removing dependencies: ${error.message}`);
}

// Install specific versions of dependencies
console.log('\n📦 Installing specific versions of dependencies...');
safeExec('npm install ajv@8.12.0 ajv-keywords@5.1.0 schema-utils@4.2.0 --save-dev');

// Fix package-lock.json
console.log('\n🔧 Fixing package-lock.json...');
safeExec('npm install --package-lock-only');

// Create a package.json override to ensure correct versions
console.log('\n📝 Creating package.json overrides...');
try {
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add overrides section if it doesn't exist
  if (!packageJson.overrides) {
    packageJson.overrides = {};
  }
  
  // Add specific overrides
  packageJson.overrides.ajv = '8.12.0';
  packageJson.overrides['ajv-keywords'] = '5.1.0';
  packageJson.overrides['schema-utils'] = '4.2.0';
  
  // Write the updated package.json
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2),
    'utf8'
  );
  console.log('✅ Updated package.json with overrides');
} catch (error) {
  console.error(`❌ Error updating package.json: ${error.message}`);
}

// Reinstall all dependencies to ensure consistency
console.log('\n📦 Reinstalling all dependencies...');
safeExec('npm install');

console.log('\n📋 Next steps:');
console.log('1. Run "npm start -- --reset-cache" to start the development server with a clean cache');
console.log('2. If issues persist, try "npm run clean-install" for a complete reinstallation');
