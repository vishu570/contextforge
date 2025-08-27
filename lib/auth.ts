import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key';

export interface JWTPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function encryptApiKey(apiKey: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptApiKey(encryptedApiKey: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const [ivHex, encrypted] = encryptedApiKey.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await hashPassword(password);
  
  return prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name,
    },
  });
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  
  if (!user) {
    return null;
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    return null;
  }
  
  return user;
}

export async function getUserFromToken(tokenOrRequest: string | any) {
  let token: string | undefined;
  
  if (typeof tokenOrRequest === 'string') {
    token = tokenOrRequest;
  } else {
    // Handle NextRequest object
    token = tokenOrRequest.cookies?.get('auth-token')?.value;
  }
  
  if (!token) {
    return null;
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return null;
  }
  
  return prisma.user.findUnique({
    where: { id: payload.userId },
  });
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await authenticateUser(credentials.email, credentials.password);
        
        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        }
        
        return null;
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signUp: '/register',
  },
};