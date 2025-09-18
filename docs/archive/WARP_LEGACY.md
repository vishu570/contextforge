# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ContextForge is an AI development context management platform designed to organize, import, and manage prompts, agents, rules, and templates for AI workflows. The application provides a centralized dashboard for developers to collect, categorize, and version control their AI context items from various sources including local files, GitHub repositories, and web URLs.

### Core Features

- **Context Item Management**: Store and organize prompts, agents, rules, templates, and code snippets
- **Multi-source Import**: Import from local files, GitHub repos, and URLs with intelligent parsing
- **Version Control**: Track changes and maintain item history with approval workflows
- **Collections**: Group related items into organized workspaces
- **AI Model Integration**: Support for OpenAI, Anthropic, and Google Generative AI
- **Advanced Parsing**: Extract context from various file formats with metadata preservation

## Technology Stack

### Frontend

- **Next.js 15.4.6** - React framework with App Router architecture
- **React 19.1.0** - UI library with server components
- **TypeScript 5.x** - Type safety and enhanced development experience
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Monaco Editor** - Code editor for content editing

### Backend & Database

- **Prisma 6.14.0** - ORM with SQLite database
- **SQLite** - Embedded database for development and deployment
- **JWT (jsonwebtoken)** - Authentication tokens
- **bcryptjs** - Password hashing

### AI & External Services

- **@anthropic-ai/sdk** - Claude API integration
- **@google/generative-ai** - Gemini API integration
- **openai** - GPT API integration
- **octokit** - GitHub API client for repository imports

### Parsing & Utilities

- **gray-matter** - YAML front matter parsing
- **yaml** - YAML file processing
- **xml2js** - XML parsing
- **formidable** - File upload handling
- **react-markdown** - Markdown rendering with syntax highlighting

## Project Structure

```
contextforge-app/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   └── import/               # Import endpoints
│   ├── dashboard/                # Dashboard pages
│   │   ├── import/               # Import interface
│   │   └── page.tsx              # Main dashboard
│   ├── login/                    # Authentication pages
│   ├── register/
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # Reusable UI components
│   ├── ui/                       # shadcn/ui components
│   └── dashboard-layout.tsx      # Main layout component
├── lib/                          # Utility libraries
│   ├── auth.ts                   # Authentication utilities
│   ├── db.ts                     # Database connection
│   ├── parsers.ts                # File parsing logic
│   └── utils.ts                  # General utilities
├── prisma/                       # Database configuration
│   └── schema.prisma             # Database schema
├── public/                       # Static assets
├── hooks/                        # Custom React hooks
├── middleware.ts                 # Next.js middleware for auth
├── package.json                  # Dependencies and scripts
├── tailwind.config.js            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── components.json               # shadcn/ui configuration
```

## Development Commands

### Initial Setup

```bash
# Install dependencies
pnpm install

# Set up database
pnpm prisma generate
pnpm prisma db push

# Start development server with Turbopack
pnpm dev
```

### Database Management

```bash
# Generate Prisma client after schema changes
pnpm prisma generate

# Push schema changes to database
pnpm prisma db push

# View database in Prisma Studio
pnpm prisma studio

# Reset database (development only)
pnpm prisma db push --force-reset
```

### Build & Deploy

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Database Architecture

The application uses a comprehensive database schema centered around the `Item` model:

### Core Models

**User Model**

- Authentication with email/password
- User preferences and settings
- API key storage for third-party services
- Automation level configuration

**Item Model** - Central entity for all context items

- `type`: prompt, agent, rule, template, snippet, other
- `format`: File format (.md, .json, .yaml, etc.)
- `content`: Main content body
- `metadata`: Structured metadata as JSON
- Version tracking and duplicate detection
- Source attribution and canonical relationships

**Collections & Organization**

- `Collection`: User-defined groupings of items
- `Tag`: Flexible tagging system with colors
- `Source`: Track import sources (file, GitHub, website)

**Version Control & Optimization**

- `Version`: Track content changes with approval workflow
- `Optimization`: AI-suggested improvements by target model
- `Conversion`: Format conversions between item types
- `AuditLog`: Complete activity tracking

**Import System**

- `Import`: Batch import tracking with status
- `WorkflowQueue`: Background job processing

## Authentication System

The application uses JWT-based authentication with the following components:

### Authentication Flow

1. **Login/Register**: `app/api/auth/` endpoints handle user creation and authentication
2. **Token Generation**: JWT tokens with 30-day expiration stored in httpOnly cookies
3. **Middleware Protection**: `middleware.ts` guards protected routes
4. **API Key Encryption**: Third-party API keys encrypted using AES-256-CBC

### Key Files

- `lib/auth.ts` - Core authentication utilities
- `middleware.ts` - Route protection and redirects
- `app/api/auth/` - Authentication API endpoints

## Import System & File Parsing

The import system supports multiple sources and formats with intelligent content extraction:

### Supported Formats

- **Markdown (.md)** - With frontmatter extraction and code block parsing
- **Cursor Rules (.mdc)** - Cursor-specific rule files with YAML frontmatter
- **JSON/YAML** - Structured data with metadata
- **XML** - Hierarchical data extraction
- **Agent Files (.af, .agent)** - AI agent definitions
- **Plain Prompts (.prompt)** - Direct prompt files

### Import Sources

1. **File Upload** - Drag-and-drop interface with multi-file support
2. **GitHub Integration** - Repository scanning with glob patterns
3. **URL Import** - Web content extraction and parsing

### Parser Logic (`lib/parsers.ts`)

- **Type Detection**: Automatic classification based on content and metadata
- **Metadata Extraction**: Preserve frontmatter, comments, and structured data
- **Content Segmentation**: Extract multiple items from single files (e.g., code blocks)
- **Error Handling**: Graceful fallback to raw content on parsing errors

## Development Workflows

### Adding New Item Types

1. Update `Item.type` enum in `prisma/schema.prisma`
2. Add type detection logic in `lib/parsers.ts`
3. Update UI components to handle new type
4. Add type-specific icons and styling

### Extending Parsers

1. Add new format handler in `lib/parsers.ts`
2. Update file extension detection
3. Add MIME type support in upload components
4. Test with sample files

### Creating API Endpoints

1. Create route handler in `app/api/[route]/route.ts`
2. Implement request validation with Zod schemas
3. Add authentication checks if required
4. Update TypeScript types

### Database Schema Changes

1. Modify `prisma/schema.prisma`
2. Run `pnpm prisma generate`
3. Push changes with `pnpm prisma db push`
4. Update related TypeScript types and API handlers

## UI Component System

The application uses **shadcn/ui** components built on Radix UI primitives:

### Key Components

- `DashboardLayout` - Main application shell with navigation
- `Card`, `Button`, `Input` - Basic UI primitives
- `Tabs`, `Dialog`, `DropdownMenu` - Interactive components
- `Badge`, `Progress`, `Alert` - Status and feedback components

### Styling System

- **Tailwind CSS** - Utility-first styling
- **CSS Variables** - Theme customization support
- **Dark Mode** - Built-in theme switching
- **Responsive Design** - Mobile-first approach

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="file:./dev.db"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
ENCRYPTION_KEY="your-32-character-encryption-key"

# Optional: API Keys for AI services
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"
GOOGLE_AI_API_KEY="your-google-key"

# Optional: GitHub integration
GITHUB_TOKEN="your-github-token"
```

## Troubleshooting

### Common Issues

**Database Connection**

- Ensure `DATABASE_URL` is correctly set
- Run `pnpm prisma generate` after schema changes
- Check file permissions for SQLite database

**Authentication Problems**

- Verify `NEXTAUTH_SECRET` is set
- Clear browser cookies if tokens are corrupted
- Check middleware configuration for route protection

**Import Parsing Errors**

- Review file format and encoding
- Check parser logs in browser console
- Validate JSON/YAML syntax before import

**Development Setup**

- Use Node.js version 20+ for compatibility
- Install dependencies with `pnpm install`
- Ensure TypeScript is properly configured with `tsc --noEmit`

### Debugging Commands

```bash
# Check database contents
pnpm prisma studio

# Type checking
pnpm tsc --noEmit

# Lint and format
pnpm lint

# Check build
pnpm build
```

## Key File References

- **Database Schema**: `prisma/schema.prisma`
- **Authentication**: `lib/auth.ts`, `middleware.ts`
- **File Parsing**: `lib/parsers.ts`
- **Main Dashboard**: `app/dashboard/page.tsx`
- **Import Interface**: `app/dashboard/import/page.tsx`
- **API Routes**: `app/api/auth/`, `app/api/import/`
- **UI Components**: `components/dashboard-layout.tsx`

---

_Last updated: January 2024_
_Next.js Version: 15.4.6_
_Node.js Compatibility: 20+_
