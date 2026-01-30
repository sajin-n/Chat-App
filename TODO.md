# 🗨️ Next.js Chat App – TODO

> Goal: Build a simple, functional chat application using Next.js + MongoDB (Dockerized).
> UI should be minimal, readable, and utilitarian. No flashy animations or AI-generated fluff.

---

## 1. Project Setup ✅
- [x] Initialize Next.js app
- [ ] Decide routing strategy (App Router recommended)
- [ ] Setup environment variables (`.env.local`)
- [ ] Setup ESLint / Prettier (optional but clean)

---

## 2. Docker & Database
### MongoDB
- [ ] Create `docker-compose.yml`
- [ ] Add MongoDB service
- [ ] Expose MongoDB port for local dev
- [ ] Setup volume for data persistence

### App ↔ DB Connection
- [ ] Install MongoDB client / ODM (`mongodb` or `mongoose`)
- [ ] Create reusable DB connection utility
- [ ] Ensure connection caching for Next.js (important)

---

## 3. Data Models
### User
- [ ] Define User schema
  - [ ] username
  - [ ] email (optional)
  - [ ] createdAt

### Message
- [ ] Define Message schema
  - [ ] senderId
  - [ ] receiverId / roomId
  - [ ] content (text only)
  - [ ] createdAt

### Chat / Room (optional but recommended)
- [ ] Define Chat schema
  - [ ] participants
  - [ ] lastMessage
  - [ ] updatedAt

---

## 4. Authentication (Keep It Simple)
- [ ] Choose auth strategy
  - [ ] NextAuth (credentials / email)
  - [ ] OR simple session-based auth
- [ ] Protect chat routes
- [ ] Store user session cleanly

> No OAuth clutter unless required.

---

## 5. API Layer (Server Actions or Route Handlers)
### Messages
- [ ] Create message
- [ ] Fetch messages for a chat
- [ ] Pagination / limit messages

### Chats
- [ ] Create or fetch existing chat
- [ ] Fetch user’s chat list

### Users
- [ ] Fetch basic user info
- [ ] Search users (optional)

---

## 6. Real-Time Messaging
- [ ] Decide approach:
  - [ ] WebSockets (Socket.IO)
  - [ ] OR polling (simpler, acceptable initially)
- [ ] Implement real-time message updates
- [ ] Handle message ordering + timestamps

---

## 7. Frontend UI (Minimal by Design)
### Principles
- Plain layout
- No gradients, no glassmorphism
- Neutral colors
- Function > aesthetics

### Pages / Components
- [ ] Login / Register page
- [ ] Chat list (left column)
- [ ] Chat window (right column)
- [ ] Message bubble (text-only)
- [ ] Input box + send button

### Styling
- [ ] Use Tailwind or basic CSS
- [ ] Avoid unnecessary animations
- [ ] Focus on spacing and readability

---

## 8. State Management
- [ ] Decide state strategy
  - [ ] React Context
  - [ ] Zustand (recommended)
- [ ] Handle current user
- [ ] Handle active chat
- [ ] Handle message list updates

---

## 9. Error Handling & Edge Cases
- [ ] Empty chats
- [ ] Message send failure
- [ ] User not authenticated
- [ ] DB connection errors
- [ ] Loading states (simple text-based)

---

## 10. Performance & Cleanup
- [ ] Avoid re-opening DB connections
- [ ] Optimize message queries
- [ ] Index MongoDB collections
- [ ] Remove unused components

---

## 11. README & Documentation
- [ ] Add setup instructions
- [ ] Document env variables
- [ ] Explain Docker usage
- [ ] Mention design philosophy:
  > “Minimal UI. No AI slop. Built for clarity.”

---

## 12. Optional Enhancements (Later)
- [ ] Typing indicator
- [ ] Message read receipts
- [ ] Dark mode (basic toggle)
- [ ] Delete messages (soft delete)

---

## Definition of Done
- Chat works end-to-end
- Messages persist
- UI is clean and boring (in a good way)
- Codebase is readable and modular
