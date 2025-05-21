#!/bin/bash

# Install dependencies
npm ci

# Build the Next.js app
npm run build

# Output success message and indicate where built files are
echo "Build completed successfully. Static files are in the 'out' directory."

# List the contents of the out directory so it's visible in logs
echo "Contents of the out directory:"
ls -la out/ 