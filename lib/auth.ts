import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const prisma = new PrismaClient()

const JWT_SECRET =
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "your-secret-key"
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "your-32-character-encryption-key"

export interface JWTPayload {
  userId: string
  email: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

// Note: API key encryption/decryption functions have been moved to lib/utils.ts
// to consolidate encryption logic and prevent inconsistencies

export async function createUser(
  email: string,
  password: string,
  name?: string
) {
  const hashedPassword = await hashPassword(password)

  return prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name,
    },
  })
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    return null
  }

  const isValid = await verifyPassword(password, user.passwordHash)

  if (!isValid) {
    return null
  }

  return user
}

export async function getUserFromToken(tokenOrRequest: string | any) {
  let token: string | undefined

  if (typeof tokenOrRequest === "string") {
    token = tokenOrRequest
  } else {
    // Handle NextRequest object
    token = tokenOrRequest.cookies?.get("auth-token")?.value
  }

  if (!token) {
    return null
  }

  const payload = verifyToken(token)

  if (!payload) {
    return null
  }

  return prisma.user.findUnique({
    where: { id: payload.userId },
  })
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await authenticateUser(
          credentials.email,
          credentials.password
        )

        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        }

        return null
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        ;(session.user as any).id = token.userId as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
