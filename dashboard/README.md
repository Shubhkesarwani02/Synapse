# Recallhub Dashboard

AI-powered semantic search dashboard for your saved memories.

## Getting Started

### Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

The dashboard connects to your FastAPI backend. Update the API URL in `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Features

- 🔍 **Semantic Search**: Search using natural language
- 🧠 **Natural Language Search**: Advanced queries with filters
- 🖤 **Monochrome UI**: Professional black/white theme with a one-click toggle
- 🗂️ **Clean Cards**: Minimal memory cards focused on content, not chrome
- 📊 **Similarity Scores**: See how relevant each result is
- 🎯 **Smart Filters**: Automatically detect content types, dates, prices

## User ID

The app automatically syncs with the extension's user ID. It looks for a user ID in localStorage under these keys (in order):
1. `ai_mem_user_id` (extension's key - primary)
2. `recallhub_user_id` (fallback for backward compatibility)
3. `synapse_user_id` (fallback for backward compatibility)
4. Creates a new UUID if none exists

The extension automatically syncs its user ID to localStorage, so the dashboard will use the same user ID as the extension.

To manually set your user ID in browser console:
```javascript
localStorage.setItem('ai_mem_user_id', 'your_user_id');
```

## Theme

The dashboard supports a monochrome theme (Black or White):

- Toggle via the button in the header.
- Preference is saved in `localStorage` under `rh-theme`.
- Auto-detects system preference on first load.

If you want to force a theme during development, you can set it in DevTools:

```js
localStorage.setItem('rh-theme', 'dark'); // or 'light'
location.reload();
```
