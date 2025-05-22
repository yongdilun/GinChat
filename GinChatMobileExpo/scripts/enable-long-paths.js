/**
 * This script helps enable long path support in Windows
 * It provides instructions for the user to follow
 */

console.log(`
===============================================================
  WINDOWS LONG PATH SUPPORT
===============================================================

To fix the TAR_ENTRY_ERROR warnings during npm install, you need
to enable long path support in Windows:

1. Run PowerShell as Administrator
2. Execute this command:
   Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" -Name "LongPathsEnabled" -Value 1

3. Restart your computer

After enabling long paths, try reinstalling with:
npm cache clean --force
npm install

===============================================================
`);

// Check if we're on Windows
if (process.platform === 'win32') {
  console.log('You are on Windows. The above steps are recommended.');
  
  // Try to check if long paths are already enabled
  try {
    const { execSync } = require('child_process');
    const output = execSync('powershell -Command "Get-ItemProperty -Path \\"HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem\\" -Name \\"LongPathsEnabled\\" | Select-Object -ExpandProperty LongPathsEnabled"', { encoding: 'utf8' });
    
    if (output.trim() === '1') {
      console.log('✅ Long paths are already enabled on your system.');
    } else {
      console.log('❌ Long paths are NOT enabled on your system. Please follow the steps above.');
    }
  } catch (error) {
    console.log('Could not determine if long paths are enabled. Please follow the steps above to be sure.');
  }
} else {
  console.log('You are not on Windows. Long path issues should not affect you.');
}

console.log(`
Alternative: Use a different package manager
---------------------------------------------------------------
You can also try using Yarn or pnpm which handle long paths better:

Install Yarn:
npm install -g yarn

Then use Yarn to install dependencies:
yarn install

Or install pnpm:
npm install -g pnpm

Then use pnpm to install dependencies:
pnpm install
===============================================================
`);
