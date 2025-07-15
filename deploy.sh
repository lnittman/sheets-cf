#!/bin/bash

echo "🚀 Deploying Sheets to Cloudflare..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo -e "${RED}Error: wrangler.toml not found. Please run this script from the sheets-cf directory.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to install dependencies${NC}"
        exit 1
    fi
fi

# Create D1 database if needed
echo ""
echo "💾 Setting up D1 database..."
wrangler d1 create sheets-db --experimental-backend 2>/dev/null || echo "Database already exists"
if [ -f "schema.sql" ]; then
    echo "Applying database schema..."
    wrangler d1 execute sheets-db --file=schema.sql --local 2>/dev/null || true
fi
echo -e "${GREEN}✓ Database setup complete${NC}"

# Copy new files over old ones if they exist
echo ""
echo "📋 Updating files..."
if [ -f "src/worker-new.js" ]; then
    cp src/worker-new.js src/worker.js
    echo -e "${BLUE}Updated worker.js${NC}"
fi
if [ -f "dist/index-new.html" ]; then
    cp dist/index-new.html dist/index.html
    echo -e "${BLUE}Updated index.html${NC}"
fi
if [ -f "dist/style-new.css" ]; then
    cp dist/style-new.css dist/style.css
    echo -e "${BLUE}Updated style.css${NC}"
fi
if [ -f "dist/app-new.js" ]; then
    cp dist/app-new.js dist/app.js
    echo -e "${BLUE}Updated app.js${NC}"
fi

# Deploy Worker
echo ""
echo "☁️  Deploying Worker..."
npm run deploy-worker
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to deploy worker${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Worker deployed successfully${NC}"

# Deploy Pages
echo ""
echo "📄 Deploying Pages..."
npm run deploy-pages
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to deploy pages${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pages deployed successfully${NC}"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Your app should be available at:"
echo "  - Worker: https://sheets-cf-worker.{your-subdomain}.workers.dev"
echo "  - Pages: https://30c8845b.sheets-cf.pages.dev"
echo ""
echo "📱 Mobile-first UI with AI-native features is now live!"
echo ""
echo "Next steps:"
echo "1. Set up GitHub OAuth app at https://github.com/settings/applications/new"
echo "   - Homepage URL: https://30c8845b.sheets-cf.pages.dev"
echo "   - Authorization callback URL: https://30c8845b.sheets-cf.pages.dev/api/github/callback"
echo "2. Update GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in wrangler.toml"
echo "3. Redeploy the worker with: npm run deploy-worker"
echo "4. Visit your app and connect GitHub!"
echo ""
echo "Features:"
echo "  ✨ AI-powered repository analysis"
echo "  🔍 Smart code pattern extraction"
echo "  📚 Context-aware documentation generation"
echo "  🧘 Product vision reimagining"
echo "  📱 Beautiful mobile-first interface"