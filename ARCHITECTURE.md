# ContextForge Architecture

## Project Structure Overview

This document outlines the clean, consolidated project structure after the 2025-09-10 reorganization.

### Directory Structure

```
contextforge-app/
├── app/                        # Next.js App Router
│   ├── api/                   # API routes
│   ├── dashboard/             # Dashboard pages
│   ├── login/                 # Authentication pages
│   ├── register/              # Registration pages
│   └── shared/                # Shared page components
├── components/                # All React components (consolidated)
│   ├── features/              # Feature-specific components
│   │   ├── editor/           # Editor-related components
│   │   ├── llm/              # LLM integration components
│   │   ├── playground/       # AI playground components
│   │   ├── prompt-editor/    # Prompt editing components
│   │   ├── specialized-editors/ # Type-specific editors
│   │   └── functions/        # Function attachment components
│   ├── ui/                   # Base UI components (shadcn/ui)
│   └── *.tsx                 # General application components
├── lib/                      # Application libraries
│   ├── specialized/          # Specialized/advanced libraries
│   └── *.ts                  # Core application logic
├── docker/                   # Docker configuration (consolidated)
│   ├── compose/              # Docker Compose files
│   │   ├── docker-compose.yml      # Main compose
│   │   └── docker-compose.dev.yml  # Development overrides
│   ├── services/             # Service-specific configurations
│   │   ├── grafana/          # Grafana configuration
│   │   ├── nginx/            # Nginx configuration
│   │   └── postgres/         # PostgreSQL configuration
│   ├── Dockerfile            # Main application Dockerfile
│   └── .env.docker           # Docker environment variables
├── prisma/                   # Database schema and migrations
├── cli/                      # Command-line interface
└── docs/                     # Documentation
```

## Component Organization

### UI Components (`/components/ui/`)
- Base components from shadcn/ui
- Reusable UI primitives
- No business logic

### Feature Components (`/components/features/`)
- **editor/**: Main editor interface and layout
- **llm/**: LLM model selection and integration
- **playground/**: AI testing and experimentation
- **prompt-editor/**: Prompt creation and editing
- **specialized-editors/**: Type-specific content editors
- **functions/**: Function attachment system

### Application Components (`/components/*.tsx`)
- High-level application components
- Dashboard components
- Analytics and metrics
- Import/export functionality

## Import Patterns

### Standard Patterns
```typescript
// UI Components
import { Button } from '@/components/ui/button';

// Feature Components
import { ModelSelector } from '@/components/features/llm/model-selector';

// Application Components
import { AnalyticsDashboard } from '@/components/analytics-dashboard';

// Libraries
import { someLib } from '@/lib/some-lib';
import { specializedLib } from '@/lib/specialized/specialized-lib';
```

## Docker Organization

### Development
```bash
# All Docker configurations are now centralized
docker-compose -f docker/compose/docker-compose.yml -f docker/compose/docker-compose.dev.yml up
```

### Production
```bash
# Production deployment
docker-compose -f docker/compose/docker-compose.yml up
```

## Key Architectural Decisions

1. **Single Components Directory**: All components consolidated under `/components/` for simplicity
2. **Feature-based Organization**: Specialized components grouped by feature domain
3. **Clean Structure**: All Docker configurations centralized in `/docker/` directory
4. **Clean Separation**: Clear distinction between UI, features, and application components
5. **Path Consistency**: Standardized import patterns across the application

## Migration Notes

- All `@/src/components/` imports have been updated to `@/components/features/`
- All `@/src/lib/` imports have been updated to `@/lib/specialized/`
- Docker configuration is now organized but maintains backward compatibility
- No breaking changes to existing functionality

## Development Workflow

1. **UI Components**: Place reusable UI components in `/components/ui/`
2. **Feature Development**: Create feature-specific components in `/components/features/[feature]/`
3. **Application Logic**: Place high-level components in `/components/`
4. **Libraries**: Core logic in `/lib/`, specialized logic in `/lib/specialized/`

This structure supports scalability while maintaining clarity and ease of navigation.