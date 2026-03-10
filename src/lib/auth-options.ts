import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

const isEnabled = (value: string | undefined) => (value ?? '').toLowerCase() === 'true';

const providers: NonNullable<NextAuthOptions["providers"]> = [];

if (isEnabled(process.env.AUTH_ENABLE_GITHUB) && process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

if (isEnabled(process.env.AUTH_ENABLE_GOOGLE) && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials");
        }

        const isValid = await verifyPassword(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        // Existing-user safety: users created before email verification was deployed
        // are automatically trusted. Only new registrations require verification.
        const VERIFICATION_GATE_DATE = new Date('2026-03-10T00:00:00Z');
        const isPreGateUser = user.createdAt < VERIFICATION_GATE_DATE;

        if (!user.emailVerifiedAt && !isPreGateUser) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          image: user.image ?? null,
        };
      },
    })
  );

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  useSecureCookies: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
  },
  providers,
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
};
