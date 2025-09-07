# ContextForge

An AI-powered context management platform for organizing, optimizing, and collaborating on prompts, agents, rules, and templates.

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js 18+** (recommended: use `corepack` for package manager)
- **pnpm** (managed via corepack)
- **AI API Keys** (optional for basic functionality)

### 📦 Installation

1. **Enable corepack and install dependencies:**

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
cd contextforge-app
pnpm install
```

2. **Setup environment variables:**

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys (optional for testing)
# At minimum, you need to set secure secrets for JWT and NextAuth
```

3. **Initialize the database:**

```bash
# Generate Prisma client
pnpm prisma generate

# Create/update database schema (SQLite by default)
pnpm prisma db push

# (Optional) Seed with test data
node scripts/seed-test-data.js
```

### 🏃‍♂️ Running ContextForge

#### Option 1: Simple Development (Recommended for testing)

```bash
# Start the Next.js development server
pnpm dev
```

Access at: <http://localhost:3000>

#### Option 2: Full Development (with background services)

```bash
# Start app + background workers concurrently
pnpm server:dev
```

This starts both the web app and background processing services.

#### Option 3: Docker Compose (Full stack)

```bash
# Copy Docker environment file
cp .env.docker .env

# Edit .env with your API keys, then start all services
docker compose up --build
```

Includes: PostgreSQL, Redis, monitoring, and more.

### 🔧 Configuration Options

#### Database Options

**Option 1: SQLite (Default - Simple)**

```bash
# In your .env file:
DATABASE_URL="file:./dev.db"
```

**Option 2: PostgreSQL (Recommended for production)**

```bash
# In your .env file:
DATABASE_URL="postgresql://user:password@localhost:5432/contextforge"

# Or use Docker Compose which includes PostgreSQL
docker compose up postgres
```

#### Feature Configuration

Edit your `.env` file to enable/disable features:

```bash
# AI-powered features (require API keys)
ENABLE_AUTO_CLASSIFICATION="false"  # Auto-categorize content
ENABLE_AUTO_OPTIMIZATION="false"    # AI content optimization
ENABLE_QUALITY_ASSESSMENT="false"   # Quality scoring

# Non-AI features (work without API keys)
ENABLE_DUPLICATE_DETECTION="true"   # Find duplicate content
```

### 🔑 API Keys Setup

To use AI features, add your API keys to `.env`:

```bash
# Get these from your AI provider dashboards
OPENAI_API_KEY="sk-..."           # OpenAI GPT models
ANTHROPIC_API_KEY="sk-ant-..."    # Claude models
GOOGLE_AI_API_KEY="AIza..."       # Gemini models
GITHUB_TOKEN="ghp_..."            # For GitHub imports
```

**Where to get API keys:**

- OpenAI: <https://platform.openai.com/api-keys>
- Anthropic: <https://console.anthropic.com/>
- Google AI: <https://aistudio.google.com/app/apikey>
- GitHub: <https://github.com/settings/tokens>

### 📂 Project Structure

```
contextforge-app/
├── app/              # Next.js App Router pages and API routes
├── components/       # Reusable React components
├── lib/              # Utilities, database, AI integrations
├── prisma/           # Database schema and migrations
├── public/           # Static assets
├── scripts/          # Database seeding and utility scripts
└── docs/             # Additional documentation
```

### 🛠️ Development Commands

```bash
# Development
pnpm dev              # Start development server
pnpm server:dev       # Start with background services

# Database
pnpm prisma generate  # Generate Prisma client
pnpm prisma db push   # Apply schema changes
pnpm prisma studio    # Database admin UI

# Building
pnpm build           # Build for production
pnpm start           # Start production server

# Code Quality
pnpm lint            # ESLint
pnpm typecheck       # TypeScript check
pnpm test            # Run tests
```

### 🐳 Docker Usage

#### Development Stack

```bash
# Start with PostgreSQL, Redis, and monitoring
docker compose -f docker-compose.dev.yml up --build
```

#### Production Stack

```bash
# Copy and edit environment
cp .env.docker .env

# Start full production stack
docker compose up --build
```

**Services included:**

- **ContextForge App** (<http://localhost:3000>)
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **Nginx** (ports 80/443)
- **Qdrant** Vector DB (port 6333)
- **Prometheus** Monitoring (port 9090)
- **Grafana** Dashboards (<http://localhost:3001>)

### 📊 Monitoring & Analytics

#### Built-in Analytics

- Access analytics at <http://localhost:3000/dashboard/analytics>
- View API usage, costs, and performance metrics
- Export reports in multiple formats

#### External Monitoring (Docker only)

- **Grafana Dashboards**: <http://localhost:3001> (admin/admin123)
- **Prometheus Metrics**: <http://localhost:9090>

### 🔍 Troubleshooting

#### Common Issues

**1. Database Connection Errors**

```bash
# Reset database
pnpm prisma db push --force-reset
pnpm prisma generate
```

**2. Missing Dependencies**

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**3. Port Conflicts**

```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill -9
```

**4. AI Features Not Working**

- Verify API keys in `.env` file
- Check API key permissions and quotas
- Enable features in `.env`: `ENABLE_AUTO_CLASSIFICATION="true"`

### 🎯 Core Features

#### ✅ Working Features

- **Content Management**: Create, edit, organize prompts/agents/rules
- **Folder System**: Hierarchical organization with auto-suggestions
- **Search & Filter**: Find content by name, type, or tags
- **Import/Export**: File uploads and batch operations
- **Version Control**: Track changes and maintain history
- **Sharing**: Generate shareable links for content
- **Analytics**: Usage tracking and performance metrics

#### 🚧 Known Issues (Being Fixed)

- GitHub import may not process all file types correctly
- Sidebar organization needs improvement
- Prompt detail page could be more intuitive
- Some AI features require additional configuration

### 📚 Additional Documentation

- **API Documentation**: `/docs/api/openapi.yaml`
- **Architecture Guide**: `/docs/SYSTEM_ARCHITECTURE_DIAGRAM.md`
- **Development Guide**: `/docs/DEVELOPER_TOOLS.md`
- **Testing Guide**: `/docs/TESTING.md`

### 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Create a Pull Request

### 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

### 🆘 Support

- **Issues**: <https://github.com/yourusername/contextforge/issues>
- **Discussions**: <https://github.com/yourusername/contextforge/discussions>
- **Documentation**: <https://contextforge.docs.com>

---

**Need help getting started?**

1. Run `pnpm dev` to start the development server
2. Visit <http://localhost:3000>
3. Create your first prompt or agent to test the system
4. Add API keys in Settings > API Keys when you're ready for AI features
