import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";

// Developer credentials
const DEV_EMAIL = "dev@chatapp.com";
const DEV_PASSWORD = "bababooy2005";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[Auth] Authorize called with:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("[Auth] Missing credentials");
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        console.log("[Auth] Checking email:", email);

        // Check if developer login
        if (email === DEV_EMAIL) {
          console.log("[Auth] Developer email detected, checking password...");
          if (password === DEV_PASSWORD) {
            console.log("[Auth] Developer login successful!");
            return {
              id: "developer",
              email: DEV_EMAIL,
              name: "Developer",
              role: "developer",
            };
          }
          console.log("[Auth] Developer password incorrect");
          return null;
        }

        // Regular user login
        try {
          await dbConnect();
          console.log("[Auth] DB connected, finding user...");

          const user = await User.findOne({ email });

          if (!user) {
            console.log("[Auth] User not found:", email);
            return null;
          }

          const isValid = await bcrypt.compare(password, user.password);

          if (!isValid) {
            console.log("[Auth] Invalid password for:", email);
            return null;
          }

          console.log("[Auth] Login successful:", user.email);
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.username,
            role: "user",
          };
        } catch (error) {
          console.error("[Auth] Error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
});
