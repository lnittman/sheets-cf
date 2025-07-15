# Sheets - Developer Report Generator

A minimalist, Cloudflare-based web application for generating AI-driven developer reports from URLs and codebases.

![Sheets](https://img.shields.io/badge/Built%20with-Cloudflare-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

## Overview

Sheets is a developer tool that performs deep analysis on codebases and generates comprehensive reports using AI. It's built entirely on Cloudflare's platform (Workers, Pages, KV) and uses OpenRouter with moonshotai/kimi-k2 for intelligent analysis.

## Features

- 🔍 **Deep Codebase Analysis** - Analyze any URL or GitHub repository
- 📁 **Context Management** - Upload and manage your developer standards and practices
- 🏷️ **Smart Tagging** - Reference context files with `#file/path` syntax
- 🌊 **Streaming Responses** - Real-time output for long-running analysis
- 🎨 **Terminal UI** - Clean, dark-themed interface inspired by developer tools
- ⚡ **Pure Cloudflare** - No external dependencies, runs entirely on edge

## Quick Start

### Prerequisites

- Node.js and npm
- Cloudflare account
- OpenRouter API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lnittman/sheets-cf.git
cd sheets-cf
```

2. Install dependencies:
```bash
npm install
```

3. Configure your environment:
   - KV namespace already configured: `6981fea7f7334ae2a6016efe3d06265a`
   - OpenRouter API key is already set in `wrangler.toml`

4. Deploy:
```bash
npm run deploy-worker
npm run deploy-pages
```

## Usage

### 1. Upload Context Files

Visit `/rules` to upload your developer context:
- Coding standards
- Architecture patterns
- Best practices
- Project requirements

### 2. Generate Reports

On the main page, enter a prompt with at least one URL:

```
Analyze https://github.com/user/repo and suggest improvements based on #standards/react.md

Review this codebase for security issues: https://example.com/repo

Extract patterns from https://github.com/popular/library #architecture/microservices.md
```

### 3. Use File Tags

Type `#` in your prompt to reference uploaded context files. Autocomplete will help you find the right file.

## Project Structure

```
sheets-cf/
├── src/
│   └── worker.js          # Cloudflare Worker backend
├── dist/
│   ├── index.html         # Main page
│   ├── rules.html         # Context manager
│   ├── docs.html          # Documentation
│   ├── style.css          # Terminal-style CSS
│   ├── app.js             # Main app logic
│   └── rules.js           # Rules page logic
├── scripts/
│   └── build.js           # Build script
├── wrangler.toml          # Cloudflare config
├── package.json           # Project config
└── CLAUDE.md              # Development docs
```

## API Endpoints

- `POST /api/generate` - Generate developer report
- `GET /api/rules` - List context files
- `POST /api/rules` - Upload context file
- `GET /api/rules/:path` - Get file content
- `DELETE /api/rules/:path` - Delete file
- `GET /api/autocomplete` - File path autocomplete

## Development

Run locally with Wrangler:
```bash
npm run dev
```

The worker will be available at `http://localhost:8787`.

## Configuration

### Environment Variables

Set in `wrangler.toml`:
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `CONTEXT_KV` - KV namespace binding

### Customization

- Modify `style.css` for UI changes
- Update `worker.js` to add new endpoints
- Extend prompts in `worker.js` for different analysis types

## Keyboard Shortcuts

- `Ctrl + Enter` - Generate report
- `#` - Trigger file autocomplete
- `Esc` - Close file editor

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- AI powered by [OpenRouter](https://openrouter.ai/) and moonshotai/kimi-k2
- UI inspired by terminal aesthetics and developer tools

## Support

For issues and questions:
- Open an issue on GitHub
- Check the [documentation](/docs)
- Review `CLAUDE.md` for technical details
