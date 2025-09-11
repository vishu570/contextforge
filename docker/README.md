# Docker Setup for ContextForge

## Quick Start

### 1. Environment Configuration
```bash
# Copy the template and fill in your API keys
cp docker/.env.docker.template docker/.env.docker
# Edit docker/.env.docker with your actual API keys
```

### 2. Development
```bash
# Start development environment with hot reload
docker-compose -f docker/compose/docker-compose.yml -f docker/compose/docker-compose.dev.yml up

# Stop development environment
docker-compose -f docker/compose/docker-compose.yml -f docker/compose/docker-compose.dev.yml down
```

### 3. Production
```bash
# Start production environment
docker-compose -f docker/compose/docker-compose.yml up

# Stop production environment
docker-compose -f docker/compose/docker-compose.yml down
```

## Services Included

### Development Mode
- **ContextForge App**: Main application with hot reload
- **Redis**: Caching and queue management
- **RedisInsight**: Redis management UI (http://localhost:8001)
- **MailHog**: Email testing (http://localhost:8025)
- **Qdrant**: Vector database for embeddings

### Production Mode
- **ContextForge App**: Production-ready application
- **PostgreSQL**: Production database
- **Redis**: Caching and queue management
- **Nginx**: Reverse proxy and static file serving
- **Grafana**: Monitoring dashboard

## Port Mapping

| Service | Development Port | Production Port | Purpose |
|---------|------------------|-----------------|---------|
| ContextForge | 3000 | 3000 | Main application |
| Prisma Studio | 5555 | - | Database management |
| Redis | 6379 | 6379 | Cache/Queue |
| RedisInsight | 8001 | - | Redis GUI |
| MailHog SMTP | 1025 | - | Email testing |
| MailHog UI | 8025 | - | Email UI |
| Qdrant | 6333-6334 | 6333-6334 | Vector DB |
| PostgreSQL | - | 5432 | Production DB |
| Grafana | - | 3001 | Monitoring |

## Environment Variables

Required variables in `docker/.env.docker`:

```bash
# AI API Keys (required)
OPENAI_API_KEY="your-key-here"
ANTHROPIC_API_KEY="your-key-here" 
GOOGLE_AI_API_KEY="your-key-here"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
JWT_SECRET="your-jwt-secret"

# Database
DATABASE_URL="your-database-url"
```

## Troubleshooting

### Common Issues

1. **"no such file or directory: Dockerfile"**
   - Make sure you're running commands from the project root
   - Verify `docker/Dockerfile` exists

2. **Missing environment variables**
   - Copy `.env.docker.template` to `.env.docker`
   - Fill in your actual API keys

3. **Port conflicts**
   - Stop other services using the same ports
   - Or modify port mappings in compose files

4. **Permission issues**
   - Ensure Docker daemon is running
   - Try running with sudo (Linux)

### Logs and Debugging

```bash
# View logs for all services
docker-compose -f docker/compose/docker-compose.yml -f docker/compose/docker-compose.dev.yml logs

# View logs for specific service
docker-compose -f docker/compose/docker-compose.yml logs contextforge-dev

# Follow logs in real-time
docker-compose -f docker/compose/docker-compose.yml logs -f
```

## Data Persistence

- **Development**: Data stored in named Docker volumes
- **Production**: Data stored in named volumes + bind mounts for backups

## Security Notes

- Never commit `.env.docker` with real API keys
- Change default passwords in production
- Use proper SSL certificates in production
- Restrict network access appropriately