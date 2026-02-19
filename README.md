# RAG Explorer UI

Web interface for browsing and searching the RAG (Chroma) database.

## Features

- **Search** — Query the knowledge base with natural language
- **Browse** — View collections and their documents
- **Synthpunk UI** — Dark theme with neon accents

## Deployment

This is designed for Cloudflare Pages with Functions.

### 1. Connect to GitHub

Link this repo to Cloudflare Pages.

### 2. Set Environment Variables

In Pages Settings → Environment variables, add:

| Variable | Value |
|----------|-------|
| `RAG_API_URL` | `https://rag.adamhollister.com` |
| `CF_ACCESS_CLIENT_ID` | Your service token Client ID |
| `CF_ACCESS_CLIENT_SECRET` | Your service token Client Secret |

**Important:** Mark the secret as "Encrypted" in Cloudflare.

### 3. Deploy

Push to main branch. Cloudflare Pages will build and deploy automatically.

## Architecture

```
Browser → Cloudflare Pages (static files)
              ↓
         Pages Function (/api/*) — adds auth headers
              ↓
         rag.adamhollister.com (Chroma API)
```

The service token is stored server-side in Pages Functions, keeping it secure.

## Local Development

For local dev, you'd need to run a local proxy or use wrangler:

```bash
npx wrangler pages dev . --binding RAG_API_URL=https://rag.adamhollister.com ...
```

## Collections

- `memory` — Memory files from daily logs
- `projects` — Project metadata and READMEs
- `documents` — Reference documentation
- `decisions` — Archived decisions and context
