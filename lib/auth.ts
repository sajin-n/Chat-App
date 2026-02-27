import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { authConfig } from "@/lib/auth.config";
import { logger } from "@/lib/logger";

// Developer credentials from environment - keep out of source code
const DEV_EMAIL = process.env.DEV_EMAIL || "dev@chatapp.com";
const DEV_PASSWORD = process.env.DEV_PASSWORD;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        // Check if developer login
        if (email === DEV_EMAIL && DEV_PASSWORD) {
          if (password === DEV_PASSWORD) {
            logger.info("Developer login successful");
            return {
              id: "developer",
              email: DEV_EMAIL,
              name: "Developer",
              role: "developer",
            };
          }
          logger.authFailure("Invalid developer password");
          return null;
        }

        // Regular user login
        try {
          await dbConnect();

          const user = await User.findOne({ email }).select("+password");

          if (!user) {
            logger.authFailure("User not found", { email });
            return null;
          }

          const isValid = await bcrypt.compare(password, user.password);

          if (!isValid) {
            logger.authFailure("Invalid password", { email });
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.username,
            role: "user",
          };
        } catch (error) {
          logger.error("Auth error", { error: String(error) });
          return null;
        }
      },
    }),
  ],
  trustHost: true,
});
