// Quick migration script to update all files at once
const fs = require('fs');
const path = require('path');

console.log('🚀 Migrating Sheets CF to new version...\n');

const fileMappings = [
  { from: 'src/worker-new.js', to: 'src/worker.js' },
  { from: 'dist/index-new.html', to: 'dist/index.html' },
  { from: 'dist/style-new.css', to: 'dist/style.css' },
  { from: 'dist/app-new.js', to: 'dist/app.js' },
];

fileMappings.forEach(({ from, to }) => {
  try {
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, to);
      console.log(`✅ Copied ${from} → ${to}`);
    } else {
      console.log(`⚠️  Source file ${from} not found`);
    }
  } catch (error) {
    console.error(`❌ Error copying ${from}: ${error.message}`);
  }
});

console.log('\n📝 Migration complete! Next steps:');
console.log('1. Run: npm run deploy-worker');
console.log('2. Run: npm run deploy-pages');
console.log('3. Set up GitHub OAuth (see UPGRADE-GUIDE.md)');
console.log('\n🎉 Your app will be live at: https://30c8845b.sheets-cf.pages.dev');