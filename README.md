# Chat App

Minimal chat application. Next.js + MongoDB.

## Requirements

- Node.js 18+
- Docker (for MongoDB)
- pnpm

## Setup

1. Start MongoDB:

```bash
docker compose up -d
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment:

Copy `.env.local` and update `NEXTAUTH_SECRET` for production.

```
MONGODB_URI=mongodb://localhost:27017/gigachat
NEXTAUTH_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

4. Run dev server:

```bash
pnpm dev
```

Open http://localhost:3000

## Usage

1. Register an account
2. Login
3. Start a chat by entering another user's username
4. Send messages

## Design Philosophy

Minimal UI. No gradients, no animations, no fluff. Function over form.
