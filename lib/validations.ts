import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createChatSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(50, "Group name too long"),
  usernames: z.array(z.string()).min(1, "At least one member required"),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  addUsernames: z.array(z.string()).optional(),
  removeUserIds: z.array(z.string()).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().max(2000, "Message too long"),
  imageUrl: z.string().optional(),
  imagePublicId: z.string().optional(),
  clientId: z.string().optional(),
  replyToId: z.string().optional(),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const createBlogSchema = z.object({
  content: z.string().min(1, "Content cannot be empty").max(2000, "Content too long"),
});

export const updateUserSchema = z.object({
  username: z.string().min(3).max(20).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(500, "Comment too long"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
