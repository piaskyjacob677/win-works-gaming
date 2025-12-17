import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// This would connect to your database in production
// For now, we'll use a simple in-memory store
const users = new Map<string, { id: string; email: string; password: string; name: string; balance: number }>();

// Initialize with demo users - password is hashed with bcryptjs
const hashedPassword = bcrypt.hashSync("demo123", 10);

// Private demo account
users.set("tony@demo.com", {
  id: "1",
  email: "tony@demo.com",
  password: hashedPassword,
  name: "Tony",
  balance: 5000
});

// Public demo account
users.set("demo@winworks.com", {
  id: "2",
  email: "demo@winworks.com",
  password: hashedPassword,
  name: "Demo User",
  balance: 5000
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = users.get(credentials.email);
        
        if (!user) {
          throw new Error("No user found");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          balance: user.balance
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.balance = (user as any).balance;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).balance = token.balance;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt"
  }
};

export const getUserBalance = (email: string): number => {
  const user = users.get(email);
  return user?.balance || 0;
};

export const updateUserBalance = (email: string, newBalance: number): void => {
  const user = users.get(email);
  if (user) {
    user.balance = newBalance;
  }
};

