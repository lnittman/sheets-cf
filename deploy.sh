#!/bin/bash

echo "🚀 Deploying Sheets to Cloudflare..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
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
echo "  - Pages: https://sheets-cf.pages.dev"
echo ""
echo "Next steps:"
echo "1. Visit your Pages URL"
echo "2. Upload context files at /rules"
echo "3. Start generating reports!"
