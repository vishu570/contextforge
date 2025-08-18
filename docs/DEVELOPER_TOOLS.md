# ContextForge Developer Tools

Welcome to the ContextForge Developer Tools suite! This comprehensive toolkit enables seamless integration of ContextForge with your existing development workflows.

## 🚀 Quick Start

### 1. CLI Installation

```bash
# Install globally
npm install -g @contextforge/cli

# Or use with npx
npx @contextforge/cli@latest --help

# Verify installation
contextforge --version
```

### 2. Configuration

```bash
# Interactive setup wizard
contextforge config wizard

# Manual configuration
contextforge config set apiUrl https://api.contextforge.com
contextforge config set apiKey your-api-key-here

# Test connection
contextforge health
```

### 3. Basic Usage

```bash
# List all items
contextforge items list

# Search for content
contextforge search "database optimization tips"

# Import a directory
contextforge import directory ./prompts --classify --optimize

# Export content
contextforge export ./backup --format files
```

## 📚 CLI Commands Reference

### Core Commands

#### `contextforge config`
Manage CLI configuration settings.

```bash
# Set configuration values
contextforge config set apiUrl https://your-instance.com
contextforge config set apiKey sk-your-key-here
contextforge config set defaultFormat table

# View configuration
contextforge config get
contextforge config get apiKey

# Reset to defaults
contextforge config reset
```

#### `contextforge items`
Manage context items (prompts, rules, agents, collections).

```bash
# List items with filtering
contextforge items list --type prompt --folder "My Folder" --limit 20

# Get specific item
contextforge items get item-id-here

# Create new item
contextforge items create --name "SQL Optimization" --type prompt --interactive

# Edit existing item
contextforge items edit item-id --name "New Name" --content

# Delete item
contextforge items delete item-id
```

#### `contextforge folders`
Organize content in hierarchical folders.

```bash
# List folders
contextforge folders list --flat

# Create folder
contextforge folders create --name "Database" --icon "🗄️" --color blue

# Show folder tree
contextforge folders tree --icons
```

#### `contextforge search`
Semantic search across your content.

```bash
# Basic search
contextforge search "React performance optimization"

# Advanced search with filters
contextforge search "API design" --type prompt,rule --limit 10 --detailed

# Search in specific folder
contextforge search "testing" --folder folder-id-here
```

### Bulk Operations

#### `contextforge import`
Import content from various sources.

```bash
# Import single file
contextforge import file ./prompt.md --type prompt --classify

# Import directory
contextforge import directory ./contexts --recursive --batch-size 20

# Import from GitHub
contextforge import github owner/repo --branch main --pattern "**/*.md"
```

#### `contextforge export`
Export content to various formats.

```bash
# Export to files
contextforge export ./backup --format files --include-metadata

# Export to JSON
contextforge export ./data.json --format json --type prompt

# Export specific folder
contextforge export ./rules --folder "Business Rules" --format markdown
```

### AI-Powered Features

#### `contextforge optimize`
AI-powered content optimization.

```bash
# Optimize single item
contextforge optimize item item-id --creativity 0.8 --preview

# Batch optimization
contextforge optimize batch --type prompt --limit 50 --dry-run

# Analyze content quality
contextforge optimize analyze item-id --detailed
```

#### `contextforge classify`
Automatic content classification and organization.

```bash
# Classify single item
contextforge classify item item-id --auto-folder --preview

# Batch classification
contextforge classify batch --folder folder-id --confidence 0.8

# Get classification suggestions
contextforge classify suggest --sample-size 100
```

## 🔌 GitHub Actions Integration

ContextForge provides ready-to-use GitHub Actions workflows for CI/CD integration.

### Workflow Templates

#### 1. Sync Workflow
Automatically sync repository changes to ContextForge.

```yaml
# .github/workflows/contextforge-sync.yml
name: ContextForge Sync
on:
  push:
    paths: ['prompts/**', 'contexts/**']
  # Workflow automatically created - see template
```

#### 2. Quality Check Workflow
Automated content quality analysis on pull requests.

```yaml
# .github/workflows/contextforge-quality.yml
name: ContextForge Quality Check
on:
  pull_request:
    paths: ['prompts/**', 'contexts/**']
  # Workflow automatically created - see template
```

#### 3. Export Workflow
Scheduled exports and backups.

```yaml
# .github/workflows/contextforge-export.yml
name: ContextForge Export
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  # Workflow automatically created - see template
```

### Setup Instructions

1. Copy workflow files to `.github/workflows/`
2. Add repository secrets:
   ```
   CONTEXTFORGE_API_KEY=your-api-key
   ```
3. Configure repository variables:
   ```
   CONTEXTFORGE_API_URL=https://api.contextforge.com
   ```
4. Create `.contextforge/config.yaml`:
   ```yaml
   sync:
     enabled: true
     auto_classify: true
     auto_optimize: true
   default_folder: "GitHub Import"
   ```

## 🐳 Docker Self-Hosting

Deploy ContextForge in your own infrastructure.

### Quick Start

```bash
# Clone repository
git clone https://github.com/contextforge/contextforge-app.git
cd contextforge-app

# Copy environment file
cp .env.docker .env

# Edit configuration
nano .env

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Docker Compose Services

- **contextforge**: Main application server
- **redis**: Caching and job queue
- **postgres**: Database (optional, can use SQLite)
- **nginx**: Reverse proxy with SSL
- **qdrant**: Vector database for embeddings
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboards

### Development Environment

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Access services
# App: http://localhost:3000
# Prisma Studio: http://localhost:5555
# Redis Insight: http://localhost:8001
# Mailhog: http://localhost:8025
```

### Environment Configuration

```bash
# Required environment variables
NEXTAUTH_SECRET=your-secret-here
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
DATABASE_URL=postgresql://user:pass@postgres:5432/contextforge
REDIS_URL=redis://redis:6379
```

## 🔧 API Integration

### REST API

Complete OpenAPI/Swagger documentation available at `/docs/api/openapi.yaml`.

#### Authentication

```bash
# API Key authentication
curl -H "Authorization: Bearer your-api-key" \
     https://api.contextforge.com/v1/items

# Session-based authentication
curl -b "auth-token=session-token" \
     https://api.contextforge.com/v1/items
```

#### Common Endpoints

```bash
# List items
GET /api/items?type=prompt&limit=50

# Create item
POST /api/items
{
  "name": "SQL Optimization",
  "type": "prompt",
  "content": "..."
}

# Semantic search
POST /api/intelligence/search
{
  "query": "database performance",
  "limit": 10
}

# Optimize content
POST /api/intelligence/optimization
{
  "itemId": "item-id",
  "creativity": 0.7
}
```

### SDKs

Language-specific SDKs are available:

- **JavaScript/TypeScript**: `npm install @contextforge/sdk`
- **Python**: `pip install contextforge-sdk`
- **Go**: `go get github.com/contextforge/go-sdk`

```javascript
// JavaScript SDK example
import { ContextForge } from '@contextforge/sdk';

const cf = new ContextForge({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.contextforge.com'
});

// Search content
const results = await cf.search('React best practices');

// Create item
const item = await cf.items.create({
  name: 'React Component',
  type: 'prompt',
  content: 'Create a reusable React component...'
});
```

### Webhooks

Subscribe to real-time events:

```javascript
// Webhook endpoint
app.post('/webhooks/contextforge', (req, res) => {
  const { event, data } = req.body;
  
  switch (event) {
    case 'item.created':
      console.log('New item created:', data.item);
      break;
    case 'optimization.completed':
      console.log('Optimization finished:', data.job);
      break;
  }
  
  res.status(200).send('OK');
});
```

## 🔒 Security & Best Practices

### API Security

- Use environment variables for API keys
- Implement rate limiting (default: 100 req/hour)
- Enable HTTPS in production
- Regularly rotate API keys

### Content Security

- Scan for sensitive information before import
- Use folder permissions for access control
- Enable audit logging
- Regular backups with export workflows

### Production Deployment

```bash
# Production checklist
- [ ] Configure SSL certificates
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Implement access controls
- [ ] Set up logging aggregation
- [ ] Configure rate limiting
- [ ] Test disaster recovery
```

## 📖 Advanced Usage Examples

### 1. Automated Content Pipeline

```bash
#!/bin/bash
# content-pipeline.sh

# Import new content
contextforge import directory ./new-prompts --classify --optimize

# Quality check
contextforge optimize batch --type prompt --dry-run

# Export optimized content
contextforge export ./optimized --format files --type prompt
```

### 2. Content Analytics

```bash
# Get quality metrics
contextforge optimize analyze item-id --detailed > quality-report.json

# Classification suggestions
contextforge classify suggest --sample-size 200 > organization-plan.json
```

### 3. CI/CD Integration

```yaml
# ci-pipeline.yml
steps:
  - name: Quality Check
    run: |
      contextforge health
      contextforge optimize batch --dry-run --threshold 0.8
  
  - name: Deploy to Production
    if: success()
    run: |
      contextforge import directory ./prompts --folder "Production"
```

## 🆘 Troubleshooting

### Common Issues

#### Connection Problems
```bash
# Test API connectivity
contextforge health --verbose

# Check configuration
contextforge config get

# Reset configuration
contextforge config reset
```

#### Authentication Errors
```bash
# Verify API key
contextforge config set apiKey your-new-key

# Test authentication
contextforge items list --limit 1
```

#### Performance Issues
```bash
# Reduce batch size
contextforge import directory ./large-dataset --batch-size 10

# Use pagination
contextforge items list --limit 50 --offset 100
```

### Debug Mode

```bash
# Enable verbose logging
export VERBOSE=true
contextforge --verbose items list

# Check logs
tail -f ~/.config/contextforge/debug.log
```

## 🤝 Contributing

### Development Setup

```bash
# Clone and setup
git clone https://github.com/contextforge/contextforge-app.git
cd contextforge-app

# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test

# Build CLI
cd cli && npm run build
```

### Adding New Commands

```typescript
// src/commands/my-command.ts
import { Command } from 'commander';

export const myCommand = new Command('my-command')
  .description('My custom command')
  .action(async (options) => {
    // Command implementation
  });
```

### Submit Pull Requests

1. Fork the repository
2. Create feature branch
3. Add tests
4. Update documentation
5. Submit pull request

## 📞 Support

- **Documentation**: https://docs.contextforge.com
- **GitHub Issues**: https://github.com/contextforge/contextforge-app/issues
- **Discord Community**: https://discord.gg/contextforge
- **Email Support**: support@contextforge.com

---

Happy building with ContextForge! 🚀