import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db, withDbRetry } from "@/lib/db";

// Build providers list dynamically based on available env vars
const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

if (process.env.RESEND_API_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || "WayWork <noreply@waywork.com>",
    })
  );
}

// Demo/preview mode: allow credentials-based login when no OAuth is configured
const isDemo = providers.length === 0;
if (isDemo) {
  providers.push(
    Credentials({
      name: "Demo Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@waywork.com" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        if (!email) return null;

        // Find or create a demo user with the retry-safe DB helper so local auth
        // keeps working even when the underlying Prisma dev database restarts.
        const user = await withDbRetry(async (client) => {
          let existingUser = await client.user.findUnique({ where: { email } });
          if (!existingUser) {
            existingUser = await client.user.create({
              data: {
                email,
                name: email.split("@")[0],
                role: "GUEST",
              },
            });
          }
          return existingUser;
        });
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: isDemo ? "jwt" : "database",
  },
  providers,
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
    error: "/login",
  },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        if (user) {
          // Database strategy
          session.user.id = user.id;
          session.user.role = (user as unknown as Record<string, unknown>).role as string;
        } else if (token) {
          // JWT strategy (credentials/demo)
          session.user.id = token.sub!;
          const dbUser = await withDbRetry((client) =>
            client.user.findUnique({ where: { id: token.sub! } })
          );
          session.user.role = dbUser?.role || "GUEST";
        }
      }
      return session;
    },
  },
});
