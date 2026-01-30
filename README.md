# Chat App

Minimal chat application. Next.js + MongoDB.

## Requirements

- Node.js 20+
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

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
MONGODB_URI=mongodb://127.0.0.1:27017/gigachat
NEXTAUTH_SECRET=generate-a-random-secret
NEXTAUTH_URL=http://localhost:3000
```

4. Run dev server:

```bash
pnpm dev
```

Open http://localhost:3000

## Scripts

```bash
pnpm dev        # Development server
pnpm build      # Production build
pnpm start      # Production server
pnpm test       # Run tests (watch mode)
pnpm test:run   # Run tests once
pnpm lint       # Lint code
```

## Usage

1. Register an account
2. Login
3. Start a chat by entering another user's username
4. Send messages

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/gigachat` |
| `NEXTAUTH_SECRET` | Secret for session encryption | Random 32+ char string |
| `NEXTAUTH_URL` | Base URL of your app | `http://localhost:3000` |

## Docker Production Deployment

Build and run with Docker:

```bash
docker build -t chat-app .
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://host:27017/gigachat \
  -e NEXTAUTH_SECRET=your-secret \
  -e NEXTAUTH_URL=https://your-domain.com \
  chat-app
```

Or use docker-compose for both app and MongoDB:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | Create new user |
| GET | `/api/chats` | List user's chats |
| POST | `/api/chats` | Create/find chat with user |
| GET | `/api/chats/[id]/messages` | Get chat messages (paginated) |
| POST | `/api/chats/[id]/messages` | Send message |
| GET | `/api/users/search` | Search users |
| GET | `/api/health` | Health check |

## Design Decisions

### Architecture
- **Polling over WebSockets**: Simpler deployment, good enough for MVP
- **MongoDB**: Flexible schema, good for chat data
- **NextAuth**: Battle-tested auth with minimal setup

### Tradeoffs
- 2s polling interval balances freshness vs server load
- No message editing/deletion (keeps it simple)
- No read receipts (optional enhancement)

### Known Limitations
- Rate limiting is in-memory (resets on restart)
- No file/image uploads
- No group chats (1:1 only)
- Polling doesn't scale to thousands of concurrent users

## Design Philosophy

Minimal UI. No gradients, no animations, no fluff. Function over form.
