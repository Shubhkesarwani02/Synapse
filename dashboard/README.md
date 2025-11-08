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
- 🎨 **Rich Memory Cards**: Different layouts for articles, videos, products, books, etc.
- 📊 **Similarity Scores**: See how relevant each result is
- 🎯 **Smart Filters**: Automatically detect content types, dates, prices

## User ID

The app looks for a user ID in localStorage under these keys (in order):
1. `recallhub_user_id`
2. `synapse_user_id`
3. Falls back to `demo_user`

Set your user ID in browser console:
```javascript
localStorage.setItem('recallhub_user_id', 'your_user_id');
```
