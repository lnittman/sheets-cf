# Sheets CF - AI-Powered GitHub Analysis Hub

A beautiful, mobile-first web app for analyzing GitHub repositories, discovering patterns, and generating AI-powered documentation sheets. Built with Cloudflare Workers, Pages, and Groq AI.

![Sheets CF](https://img.shields.io/badge/Cloudflare-Workers-orange) ![Groq AI](https://img.shields.io/badge/AI-Groq-blue) ![Mobile First](https://img.shields.io/badge/Mobile-First-green)

## ✨ Features

### AI-Native Experience
- **Smart Repository Analysis** - Deep dive into any GitHub repo with AI-powered insights
- **Pattern Extraction** - Automatically identify and extract reusable patterns
- **Security Audits** - Comprehensive vulnerability analysis and recommendations
- **Product Vision** - Reimagine products with transformative AI experiences
- **Context-Aware Generation** - Upload your coding standards for personalized outputs

### Beautiful Mobile-First UI
- **Native App Feel** - Smooth animations, gestures, and transitions
- **Dark Theme** - Easy on the eyes with thoughtful contrast
- **Thumb-Friendly** - All controls within easy reach on mobile
- **Responsive Design** - Scales beautifully from phone to desktop

### GitHub Integration
- **OAuth Authentication** - Secure GitHub sign-in
- **Repository Access** - Analyze your private repos
- **Smart Search** - Find repos by tech stack or patterns
- **Collaboration** - Share sheets with your team

### Developer Experience
- **Stream Responses** - Real-time AI generation with SSE
- **Markdown Support** - Beautiful formatted documentation
- **Export Options** - Copy, download, or share sheets
- **Template System** - Save and reuse analysis templates

## 🚀 Quick Start

### Prerequisites
- Cloudflare account
- GitHub account (for OAuth)
- Node.js 16+

### Installation

```bash
# Clone the repository
git clone https://github.com/lnittman/sheets-cf.git
cd sheets-cf

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your keys
```

### Configuration

1. **Create GitHub OAuth App**
   - Go to https://github.com/settings/applications/new
   - Homepage URL: `https://your-app.pages.dev`
   - Callback URL: `https://your-app.pages.dev/api/github/callback`
   - Save Client ID and Secret

2. **Update Configuration**
   ```toml
   # wrangler.toml
   [vars]
   GROQ_API_KEY = "your-groq-api-key"
   GITHUB_CLIENT_ID = "your-github-client-id"
   GITHUB_CLIENT_SECRET = "your-github-client-secret"
   APP_URL = "https://your-app.pages.dev"
   ```

### Deployment

```bash
# Deploy everything
npm run deploy

# Or deploy separately
npm run deploy-worker  # Backend API
npm run deploy-pages   # Frontend
```

## 📱 Usage

### Analyzing Repositories
1. Paste any GitHub URL or type `owner/repo`
2. Select analysis type (overview, security, patterns, etc.)
3. Include context files with `#filename`
4. Generate beautiful markdown sheets

### Commands
- **analyze** - Deep repository analysis
- **compare** - Compare two codebases
- **extract** - Extract reusable patterns
- **audit** - Security vulnerability scan
- **document** - Generate documentation
- **vision** - Reimagine with AI

### Context Files
Upload your coding standards, patterns, and guidelines:
1. Navigate to Context tab
2. Upload `.md` files with your standards
3. Reference them with `#filename` in prompts

## 🏗️ Architecture

```
sheets-cf/
├── src/
│   └── worker.js        # Cloudflare Worker (API)
├── dist/
│   ├── index.html       # Mobile-first UI
│   ├── style.css        # Beautiful dark theme
│   └── app.js           # Client-side logic
├── wrangler.toml        # Cloudflare config
└── schema.sql           # D1 database schema
```

### Tech Stack
- **Backend**: Cloudflare Workers
- **Frontend**: Vanilla JS with mobile-first design
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV
- **AI**: Groq API (kimi-k2 model)
- **Auth**: GitHub OAuth

## 🎨 Design Philosophy

### Mobile-First
- Touch-optimized interactions
- Thumb-friendly navigation
- Native app-like experience
- Smooth 60fps animations

### AI-Native
- Stream-first architecture
- Context-aware responses
- Intelligent command system
- Natural language interface

### Minimalist
- Focus on content
- Reduce cognitive load
- Every pixel has purpose
- Beautiful constraints

## 🔧 Development

### Local Development
```bash
# Install Wrangler CLI
npm install -g wrangler

# Run locally
wrangler dev

# Run with local D1
wrangler d1 execute sheets-db --local --file=schema.sql
```

### Adding Features
1. **New Command**: Add to `/api/commands` endpoint
2. **New Analysis**: Extend `buildAnalysisPrompt()`
3. **New UI**: Follow mobile-first patterns
4. **New Context**: Use KV storage pattern

## 🌟 Pro Tips

### Effective Prompts
- Be specific about what you want
- Reference context files with `#`
- Combine multiple repos for comparison
- Use commands for focused analysis

### Performance
- Sheets stream in real-time
- Context files are cached
- GitHub data is fetched in parallel
- UI renders progressively

### Mobile Usage
- Swipe between views
- Long-press for actions
- Pull to refresh
- Shake to report bugs

## 🤝 Contributing

We love contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Follow the code style
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- Built with Cloudflare's amazing edge platform
- Powered by Groq's lightning-fast AI
- Inspired by minimalist design principles
- Created for developers who love beautiful tools

---

Made with ❤️ by developers, for developers