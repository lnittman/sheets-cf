#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Building Sheets for deployment...');

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// List of static files (already in dist)
const staticFiles = [
  'index.html',
  'rules.html', 
  'docs.html',
  'style.css',
  'app.js',
  'rules.js'
];

// Verify all files exist
let allFilesExist = true;
staticFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing file: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✓ Found: ${file}`);
  }
});

if (allFilesExist) {
  console.log('\\n✅ Build complete! All files ready for deployment.');
  console.log('\\nNext steps:');
  console.log('1. Create a KV namespace in Cloudflare dashboard');
  console.log('2. Update wrangler.toml with your KV namespace ID and OpenRouter API key');
  console.log('3. Run: npm run deploy-worker');
  console.log('4. Run: npm run deploy-pages');
} else {
  console.error('\\n❌ Build failed! Some files are missing.');
  process.exit(1);
}
