# Sheets: Cloudflare-Pilled Dev Report Generator

## Overview
A minimalist webapp for generating AI-driven developer reports from URLs/prompts. Pure Cloudflare stack: Pages for frontend, Workers for backend. Uses OpenRouter with moonshotai/kimi-k2 for LLM capabilities.

## Features
- **Main Page** (`/`): Console-like UI for entering prompts with URLs
- **Rules Page** (`/rules`): Interactive filetree for managing developer context
- **Prompt Tagging**: Use `#file/path` to reference context files in prompts
- **GitHub Integration**: Special handling for GitHub URLs with codebase analysis
- **Streaming**: Long-running analysis with real-time output

## Patterns
- All backend logic in `worker.js`
- KV for storing rules/context files
- Streaming responses for long-running analysis
- Prompt parsing for #tags to inject context
- OpenRouter integration for LLM capabilities
- Dark mode, terminal-style UI

## Deployment
1. Create KV namespace in Cloudflare dashboard
2. Update `wrangler.toml` with your KV namespace ID and OpenRouter API key
3. `npm install`
4. `npm run deploy-worker`
5. `npm run deploy-pages`

## API Endpoints
- `GET /api/rules`: List all context files
- `GET /api/rules/:path`: Get specific file content
- `POST /api/rules`: Upload new context file
- `DELETE /api/rules/:path`: Delete context file
- `POST /api/generate`: Process prompt and generate report
- `GET /api/autocomplete`: Get file paths for autocomplete

## Configuration
Set environment variables in `wrangler.toml`:
- `OPENROUTER_API_KEY`: Your OpenRouter API key
- KV namespace binding for context storage

## Tech Stack
- Cloudflare Workers for backend
- Cloudflare Pages for frontend hosting
- Cloudflare KV for context storage
- OpenRouter + moonshotai/kimi-k2 for AI
- Vanilla JS (no frameworks)
- Terminal-style UI inspired by OpenCode
