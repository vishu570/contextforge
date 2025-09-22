#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Define placeholder items for each category
const placeholderItems = [
  // PROMPTS Category
  {
    name: 'Business Strategy Planning',
    type: 'prompt',
    content: `# Business Strategy Planning Prompt

You are a strategic business planning expert. Help develop comprehensive business strategies by:

## Key Areas to Address:
1. **Market Analysis**
   - Current market position
   - Competitive landscape
   - Market opportunities and threats

2. **Strategic Objectives**
   - Short-term goals (1 year)
   - Medium-term goals (3 years)
   - Long-term vision (5+ years)

3. **Resource Allocation**
   - Budget planning
   - Human resources
   - Technology investments

4. **Risk Assessment**
   - Identify potential risks
   - Mitigation strategies
   - Contingency planning

## Output Format:
Provide a structured strategic plan with actionable recommendations, timelines, and success metrics.`,
    tags: ['business', 'strategy', 'planning', 'analysis'],
    metadata: {
      complexity: 'intermediate',
      domain: 'business',
      subcategory: 'strategy'
    }
  },
  {
    name: 'Frontend Code Review',
    type: 'prompt',
    content: `# Frontend Code Review Prompt

You are a senior frontend developer conducting code reviews. Analyze the provided code for:

## Review Criteria:
1. **Code Quality**
   - Clean code principles
   - Readability and maintainability
   - Proper naming conventions

2. **Performance**
   - Bundle size optimization
   - Rendering performance
   - Memory usage

3. **Best Practices**
   - Framework-specific patterns
   - Accessibility compliance
   - Security considerations

4. **Testing**
   - Test coverage
   - Test quality
   - Edge case handling

## Review Format:
- Provide specific feedback with line references
- Suggest improvements with examples
- Rate overall quality (1-10)
- Highlight critical issues that must be fixed`,
    tags: ['development', 'frontend', 'code-review', 'quality'],
    metadata: {
      complexity: 'advanced',
      domain: 'development',
      subcategory: 'frontend'
    }
  },
  {
    name: 'Content Marketing Strategy',
    type: 'prompt',
    content: `# Content Marketing Strategy Prompt

You are a content marketing strategist. Create comprehensive content marketing plans that:

## Strategy Components:
1. **Audience Analysis**
   - Target persona definition
   - Content preferences
   - Platform usage patterns

2. **Content Planning**
   - Content pillars and themes
   - Editorial calendar
   - Content formats and types

3. **Distribution Strategy**
   - Channel selection
   - Publishing schedule
   - Cross-platform optimization

4. **Performance Metrics**
   - KPI definition
   - Tracking methods
   - Success benchmarks

## Deliverables:
Provide actionable content strategy with specific recommendations for content creation, distribution, and measurement.`,
    tags: ['marketing', 'content', 'strategy', 'digital-marketing'],
    metadata: {
      complexity: 'intermediate',
      domain: 'marketing',
      subcategory: 'content'
    }
  },
  {
    name: 'Data Analysis & Insights',
    type: 'prompt',
    content: `# Data Analysis & Insights Prompt

You are a data analyst expert. Analyze datasets and provide actionable insights by:

## Analysis Framework:
1. **Data Exploration**
   - Data quality assessment
   - Statistical summaries
   - Pattern identification

2. **Visualization**
   - Chart and graph recommendations
   - Dashboard design
   - Interactive elements

3. **Statistical Analysis**
   - Hypothesis testing
   - Correlation analysis
   - Trend analysis

4. **Business Insights**
   - Key findings summary
   - Actionable recommendations
   - Impact assessment

## Output Requirements:
Present findings in executive summary format with supporting visualizations and detailed methodology.`,
    tags: ['data', 'analytics', 'insights', 'visualization'],
    metadata: {
      complexity: 'advanced',
      domain: 'data',
      subcategory: 'analytics'
    }
  },

  // RULES Category
  {
    name: 'React Hooks Guidelines',
    type: 'rule',
    content: `# React Hooks Guidelines

## Core Rules

### 1. Always Call Hooks at the Top Level
- Never call hooks inside loops, conditions, or nested functions
- Hooks must be called in the same order every time

### 2. Custom Hook Naming
- Custom hooks must start with "use" prefix
- Use descriptive names: \`useUserData\`, \`useApiCall\`

### 3. Dependency Arrays
- Always include all dependencies in useEffect dependency arrays
- Use ESLint rule: \`react-hooks/exhaustive-deps\`

### 4. State Updates
- Use functional updates for state that depends on previous state
- Batch state updates when possible

## Best Practices

### useState
- Initialize state with the correct type
- Use multiple useState calls for unrelated state
- Consider useReducer for complex state logic

### useEffect
- Separate concerns into different useEffect calls
- Clean up subscriptions and timeouts
- Return cleanup functions when needed

### Performance Optimization
- Use useMemo for expensive calculations
- Use useCallback for function memoization
- Only optimize when performance issues are identified`,
    tags: ['react', 'hooks', 'javascript', 'guidelines'],
    metadata: {
      complexity: 'intermediate',
      domain: 'development',
      subcategory: 'frontend'
    }
  },
  {
    name: 'API Security Guidelines',
    type: 'rule',
    content: `# API Security Guidelines

## Authentication & Authorization

### 1. Authentication Requirements
- Use strong authentication mechanisms (OAuth 2.0, JWT)
- Implement proper session management
- Enforce password complexity requirements

### 2. Authorization Controls
- Implement role-based access control (RBAC)
- Use principle of least privilege
- Validate permissions on every request

## Data Protection

### 3. Input Validation
- Validate all input data
- Use parameterized queries to prevent SQL injection
- Sanitize data before processing

### 4. Data Transmission
- Use HTTPS for all API communications
- Implement proper CORS policies
- Encrypt sensitive data in transit

## Monitoring & Logging

### 5. Security Monitoring
- Log all security-relevant events
- Monitor for suspicious activity patterns
- Implement rate limiting and throttling

### 6. Error Handling
- Don't expose sensitive information in error messages
- Log detailed errors server-side only
- Return generic error messages to clients`,
    tags: ['security', 'api', 'guidelines', 'authentication'],
    metadata: {
      complexity: 'advanced',
      domain: 'security',
      subcategory: 'api'
    }
  },
  {
    name: 'Agile Sprint Guidelines',
    type: 'rule',
    content: `# Agile Sprint Guidelines

## Sprint Planning

### 1. Sprint Duration
- Standard sprint length: 2 weeks
- Consistent sprint duration across team
- No changes to sprint length mid-sprint

### 2. Capacity Planning
- Account for team member availability
- Reserve 20% capacity for unexpected work
- Consider holidays and time off

## Daily Standups

### 3. Standup Format
- What did I complete yesterday?
- What will I work on today?
- Are there any blockers?

### 4. Standup Rules
- Keep updates under 2 minutes per person
- Focus on progress toward sprint goal
- Take detailed discussions offline

## Sprint Review & Retrospective

### 5. Review Criteria
- Demonstrate completed user stories
- Gather stakeholder feedback
- Update product backlog based on feedback

### 6. Retrospective Actions
- Identify what went well
- Discuss areas for improvement
- Commit to specific action items`,
    tags: ['agile', 'scrum', 'project-management', 'process'],
    metadata: {
      complexity: 'basic',
      domain: 'management',
      subcategory: 'agile'
    }
  },

  // TEMPLATES Category
  {
    name: 'React Functional Component',
    type: 'template',
    content: `# React Functional Component Template

\`\`\`typescript
import React, { useState, useEffect } from 'react';

interface {{ComponentName}}Props {
  // Define props interface
  className?: string;
  children?: React.ReactNode;
}

const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({
  className = '',
  children,
  ...props
}) => {
  // State declarations
  const [state, setState] = useState(initialState);

  // Effects
  useEffect(() => {
    // Side effects
    return () => {
      // Cleanup
    };
  }, []);

  // Event handlers
  const handleEvent = (event: React.Event) => {
    // Handle event
  };

  // Render
  return (
    <div
      className={\`component-name \${className}\`}
      {...props}
    >
      {children}
    </div>
  );
};

export default {{ComponentName}};
\`\`\`

## Usage
\`\`\`typescript
import {{ComponentName}} from './{{ComponentName}}';

<{{ComponentName}} className="custom-class">
  Content here
</{{ComponentName}}>
\`\`\``,
    tags: ['react', 'component', 'typescript', 'template'],
    metadata: {
      complexity: 'basic',
      domain: 'development',
      subcategory: 'frontend'
    }
  },
  {
    name: 'REST API Documentation',
    type: 'template',
    content: `# {{API_NAME}} REST API Documentation

## Overview
Brief description of what this API does and its purpose.

## Base URL
\`\`\`
{{BASE_URL}}
\`\`\`

## Authentication
This API uses {{AUTH_METHOD}} authentication.

### Headers
\`\`\`
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
\`\`\`

## Endpoints

### GET {{ENDPOINT_PATH}}
Retrieve {{RESOURCE_NAME}} data.

**Parameters:**
- \`param1\` (string, required): Description
- \`param2\` (number, optional): Description

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
\`\`\`

### POST {{ENDPOINT_PATH}}
Create new {{RESOURCE_NAME}}.

**Request Body:**
\`\`\`json
{
  "name": "string",
  "description": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "string",
    "message": "Created successfully"
  }
}
\`\`\`

## Error Responses
\`\`\`json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Error description"
  }
}
\`\`\``,
    tags: ['api', 'documentation', 'rest', 'template'],
    metadata: {
      complexity: 'intermediate',
      domain: 'documentation',
      subcategory: 'api'
    }
  },
  {
    name: 'Project README Template',
    type: 'template',
    content: `# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
# Clone the repository
git clone {{REPOSITORY_URL}}

# Navigate to project directory
cd {{PROJECT_NAME}}

# Install dependencies
npm install
\`\`\`

## Usage

\`\`\`bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
\`\`\`

## Configuration

Create a \`.env\` file in the root directory:

\`\`\`
API_URL=your_api_url
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the {{LICENSE}} License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email {{SUPPORT_EMAIL}} or create an issue on GitHub.`,
    tags: ['documentation', 'readme', 'project', 'template'],
    metadata: {
      complexity: 'basic',
      domain: 'documentation',
      subcategory: 'project'
    }
  },

  // COMMANDS Category
  {
    name: 'Git Workflow Commands',
    type: 'snippet',
    content: `# Git Workflow Commands

## Basic Workflow

### Start New Feature
\`\`\`bash
# Create and switch to new feature branch
git checkout -b feature/feature-name

# Or using newer syntax
git switch -c feature/feature-name
\`\`\`

### Daily Development
\`\`\`bash
# Check status
git status

# Add changes
git add .
# Or add specific files
git add file1.js file2.css

# Commit changes
git commit -m "feat: add new feature description"

# Push to remote
git push origin feature/feature-name
\`\`\`

### Merging Feature
\`\`\`bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge feature branch
git merge feature/feature-name

# Push merged changes
git push origin main

# Delete feature branch
git branch -d feature/feature-name
git push origin --delete feature/feature-name
\`\`\`

## Advanced Commands

### Rebasing
\`\`\`bash
# Interactive rebase last 3 commits
git rebase -i HEAD~3

# Rebase feature branch onto main
git rebase main
\`\`\`

### Stashing
\`\`\`bash
# Stash current changes
git stash

# Apply latest stash
git stash pop

# List all stashes
git stash list
\`\`\``,
    tags: ['git', 'workflow', 'commands', 'version-control'],
    metadata: {
      complexity: 'intermediate',
      domain: 'development',
      subcategory: 'git'
    }
  },
  {
    name: 'Docker Development Commands',
    type: 'snippet',
    content: `# Docker Development Commands

## Container Management

### Build and Run
\`\`\`bash
# Build image from Dockerfile
docker build -t app-name:tag .

# Run container
docker run -d -p 3000:3000 --name app-container app-name:tag

# Run with environment variables
docker run -d -p 3000:3000 -e NODE_ENV=development app-name:tag

# Run with volume mount
docker run -d -p 3000:3000 -v $(pwd):/app app-name:tag
\`\`\`

### Container Operations
\`\`\`bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop container
docker stop app-container

# Remove container
docker rm app-container

# View container logs
docker logs app-container

# Execute command in running container
docker exec -it app-container bash
\`\`\`

## Image Management
\`\`\`bash
# List images
docker images

# Remove image
docker rmi app-name:tag

# Pull image from registry
docker pull node:18-alpine

# Push image to registry
docker push username/app-name:tag
\`\`\`

## Docker Compose
\`\`\`bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Rebuild services
docker-compose up --build

# View logs
docker-compose logs service-name
\`\`\``,
    tags: ['docker', 'containers', 'commands', 'devops'],
    metadata: {
      complexity: 'intermediate',
      domain: 'devops',
      subcategory: 'containerization'
    }
  },

  // CONFIGURATIONS Category
  {
    name: 'Next.js Configuration',
    type: 'template',
    content: `# Next.js Configuration Template

## next.config.js
\`\`\`javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // React configuration
  reactStrictMode: true,
  swcMinify: true,

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Image optimization
  images: {
    domains: ['example.com', 'cdn.example.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Internationalization
  i18n: {
    locales: ['en', 'es', 'fr'],
    defaultLocale: 'en',
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true,
      },
    ];
  },

  // Rewrites
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.example.com/:path*',
      },
    ];
  },

  // Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Custom webpack config
    return config;
  },

  // Experimental features
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['package-name'],
  },
};

module.exports = nextConfig;
\`\`\`

## TypeScript Configuration (tsconfig.json)
\`\`\`json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
\`\`\``,
    tags: ['nextjs', 'configuration', 'typescript', 'react'],
    metadata: {
      complexity: 'intermediate',
      domain: 'development',
      subcategory: 'configuration'
    }
  },
  {
    name: 'ESLint Configuration',
    type: 'template',
    content: `# ESLint Configuration Template

## .eslintrc.js
\`\`\`javascript
module.exports = {
  // Environment settings
  env: {
    browser: true,
    es2021: true,
    node: true,
  },

  // Parser configuration
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
    project: './tsconfig.json',
  },

  // Plugin configuration
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'import',
    'jsx-a11y',
  ],

  // Extended configurations
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],

  // Rule configuration
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',

    // React rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',

    // Import rules
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
      },
    ],

    // General rules
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },

  // Settings
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {},
    },
  },

  // Overrides for specific files
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true,
      },
    },
  ],
};
\`\`\`

## .eslintignore
\`\`\`
node_modules
dist
build
.next
coverage
*.config.js
\`\`\``,
    tags: ['eslint', 'configuration', 'linting', 'javascript'],
    metadata: {
      complexity: 'intermediate',
      domain: 'development',
      subcategory: 'tooling'
    }
  }
];

async function createPlaceholderItems() {
  console.log('🎯 Creating placeholder context items for all categories...')

  try {
    let createdCount = 0

    for (const item of placeholderItems) {
      // Check if item already exists to avoid duplicates
      const existing = await prisma.item.findFirst({
        where: {
          name: item.name,
          type: item.type
        }
      })

      if (!existing) {
        // Create the item
        const createdItem = await prisma.item.create({
          data: {
            name: item.name,
            type: item.type,
            content: item.content,
            format: 'markdown',
            metadata: JSON.stringify(item.metadata),
            author: 'ContextForge System',
            language: 'en',
            userId: 'cmfe3rost00001lqzawddvw7a' // Use the actual user ID from database
          }
        })

        // Create tags and associate them
        for (const tagName of item.tags) {
          const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName }
          })

          await prisma.itemTag.create({
            data: {
              itemId: createdItem.id,
              tagId: tag.id
            }
          })
        }

        console.log(`✅ Created ${item.type}: "${item.name}"`)
        createdCount++
      } else {
        console.log(`⏭️  Skipped existing ${item.type}: "${item.name}"`)
      }
    }

    console.log(`\n🎉 Placeholder item creation completed!`)
    console.log(`📊 Summary:`)
    console.log(`   - Created ${createdCount} new items`)
    console.log(`   - Total categories covered: Prompts, Rules, Templates, Commands, Configurations`)

  } catch (error) {
    console.error('❌ Error creating placeholder items:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  createPlaceholderItems().catch((error) => {
    console.error('Failed to create placeholder items:', error)
    process.exit(1)
  })
}

export { createPlaceholderItems }