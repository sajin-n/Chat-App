# Giga Chat App - Setup Guide

## Quick Start

The application is now fully functional! Here's what's working and what you need to do to enable all features.

### What's Working Right Now ✅

- ✅ **Chats** - Direct messaging between users
- ✅ **Groups** - Group chat functionality with CRUD operations
- ✅ **Blog/Feed** - Social feed to post content and interact
- ✅ **User Profiles** - Profile pages with user info
- ✅ **Messaging** - Real-time message sending and receiving
- ✅ **Unread Badges** - Tracks unread messages
- ✅ **Comments** - Like and comment on blog posts

### Optional: Enable Image Uploads

Image uploads are **optional**. The app works perfectly fine without them, but if you want to enable image uploads in chats and blogs, follow these steps:

#### Step 1: Create a Cloudinary Account (Free)
1. Go to https://cloudinary.com/
2. Click "Sign Up" and create a free account
3. Go to your **Dashboard** and copy your **Cloud Name** (it's displayed prominently)

#### Step 2: Create an Upload Preset
1. In Cloudinary dashboard, go to **Settings** → **Upload**
2. Scroll down to **Upload presets** section
3. Click **Add upload preset**
4. Set the following:
   - **Upload preset name**: `giga_chat` (exactly this name)
   - **Signing Mode**: Select "Unsigned"
   - Click **Save**

#### Step 3: Update Environment Variables
1. Open `.env.local` in your project root
2. Find the line: `# NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here`
3. Uncomment it and replace `your_cloud_name_here` with your actual Cloud Name
4. Save the file

Example:
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxy1a2b3c
```

#### Step 4: Restart Dev Server
The server will automatically reload and image upload buttons will appear in:
- Chat messages (+ button)
- Blog posts (Add Image button)
- User profiles (📷 button on profile picture)

### Running the App

```bash
pnpm dev
```

The app will run on `http://localhost:3000` (or the next available port if 3000 is in use).

### Disabling Tailwind Warnings (Optional)

The 186 warnings in the Problems panel are cosmetic Tailwind suggestions about using shorter class syntax. They don't affect functionality. If you want to disable them:

Edit `eslint.config.mjs` and comment out the Tailwind plugin section, or you can just ignore them - they won't affect the app at all.

## Architecture Overview

### Frontend
- **React 19** - UI framework with hooks
- **Next.js 16** - Framework with App Router and Turbopack
- **Tailwind CSS** - Styling with custom color scheme (white/black/grey)
- **Zustand** - State management
- **next-auth** - Authentication
- **next-cloudinary** - Image uploads (optional)

### Backend
- **Next.js API Routes** - REST API endpoints
- **MongoDB** - Database (already configured locally)
- **mongoose** - ODM for MongoDB
- **Zod** - Request validation

### Key Features
- Real-time chat with unread tracking
- Group chats with member management
- Social blog feed with likes/comments
- User profiles with customizable info
- Image uploads to Cloudinary (optional)
- Session-based authentication
- Responsive design with minimal UI

## Project Structure

```
app/
├── api/              # API routes
├── layout.tsx        # Root layout
├── page.tsx          # Home page
├── login/            # Auth page
└── globals.css       # Global styles

components/
├── ChatContainer.tsx # Main chat/blog/profile view
├── ChatWindow.tsx    # Message view
├── ChatList.tsx      # Chat list sidebar
├── BlogFeed.tsx      # Blog/social feed
├── UserProfile.tsx   # User profile view
├── GroupList.tsx     # Group list
├── GroupChatWindow.tsx # Group messages
└── ErrorBoundary.tsx # Error handling

lib/
├── models/           # MongoDB schemas
├── validations.ts    # Zod schemas
└── store.ts          # Zustand store
```

## Troubleshooting

### "Cloudinary Cloud name is required" Error
If you see this error, image uploads aren't configured yet. The app still works perfectly - just skip image uploads or follow the setup steps above.

### Port 3000 Already in Use
The app will automatically use port 3001 or the next available port. Check the terminal output for the actual port being used.

### MongoDB Connection Error
Make sure MongoDB is running locally on `mongodb://127.0.0.1:27017/gigachat`

### Messages Not Loading
Clear browser cache (Cmd/Ctrl + Shift + Del) and refresh the page.

## Features Guide

### Chats
- Click a username to start a chat
- Messages appear with timestamps
- Unread messages show a badge
- Delete individual messages or clear entire chat

### Groups
- Create new groups with multiple members
- Add/remove members
- Group-specific settings
- All members see the same messages

### Blog/Feed
- Post text content (optional with images)
- Like and unlike posts
- Comment on posts
- View your profile with all your posts
- Edit profile info

### Images (When Configured)
- Add images to chat messages
- Add images to blog posts
- Upload/change profile picture
- All images hosted on Cloudinary

## Performance Notes

- App uses Turbopack for fast development builds
- Real-time updates every 5 seconds for messages
- Optimized MongoDB queries with indexes
- CSS variables for instant theme switching

Enjoy using Giga Chat! 🚀
