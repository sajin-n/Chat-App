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

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(2000, "Message too long"),
  clientId: z.string().optional(),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
