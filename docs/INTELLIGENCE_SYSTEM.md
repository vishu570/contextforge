# ContextForge Intelligence System

The ContextForge Intelligence System is a comprehensive AI-powered framework for semantic understanding, content analysis, and intelligent context assembly. This system transforms ContextForge from a simple file organization tool into an intelligent context management platform.

## 🎯 Overview

The Intelligence System provides:

- **Semantic Understanding**: Vector embeddings and similarity search
- **Content Analysis**: AI-powered summarization, tagging, and quality assessment
- **Intelligent Clustering**: Automatic content organization using machine learning
- **Model Optimization**: Content optimization for specific AI models
- **Context Assembly**: Intelligent context building based on user intent
- **Cost Intelligence**: Token counting and cost optimization

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Intelligence System                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Embeddings    │  │    Analysis     │  │   Clustering    │  │
│  │   Service       │  │    Service      │  │    Service      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Model         │  │    Context      │  │  Intelligence   │  │
│  │   Optimizer     │  │   Assembly      │  │  Coordinator    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Queue Workers                           │
├─────────────────────────────────────────────────────────────┤
│                    API Endpoints                           │
├─────────────────────────────────────────────────────────────┤
│                   Database Schema                          │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Extensions

The system extends the existing schema with:

- `ItemEmbedding`: Vector embeddings for semantic search
- `SemanticCluster`: Content clusters and relationships
- `ContextTemplate`: Reusable context templates
- `ContextGeneration`: Context assembly history
- `ModelOptimization`: Model-specific optimizations
- `ContentSummary`: AI-generated content summaries
- `SemanticSearch`: Search analytics

## 🚀 Features

### 1. Semantic Search and Embeddings

**What it does**: Generates vector embeddings for content to enable semantic similarity search.

**How to use**:

```bash
# Generate embeddings for an item
POST /api/intelligence/embeddings
{
  "itemId": "item_123",
  "content": "Your content here",
  "providerId": "openai-small"
}

# Semantic search
POST /api/intelligence/search
{
  "query": "machine learning tutorials",
  "limit": 10,
  "threshold": 0.7
}
```

**Benefits**:

- Find content by meaning, not just keywords
- Discover related items automatically
- Enable intelligent content recommendations

### 2. Content Analysis

**What it does**: AI-powered analysis providing summaries, quality scores, and automatic tags.

**How to use**:

```bash
# Analyze content
POST /api/intelligence/analysis
{
  "itemId": "item_123",
  "content": "Your content here"
}
```

**Provides**:

- AI-generated summaries
- Quality assessment with specific feedback
- Automatic tag generation
- Complexity analysis
- Readability scores

### 3. Semantic Clustering

**What it does**: Groups similar content using machine learning algorithms.

**How to use**:

```bash
# Run clustering analysis
POST /api/intelligence/clustering
{
  "algorithm": "kmeans",
  "numClusters": 5,
  "threshold": 0.7
}
```

**Algorithms supported**:

- K-Means clustering
- Hierarchical clustering
- DBSCAN density-based clustering

### 4. Model Optimization

**What it does**: Optimizes content for specific AI models to reduce tokens and costs.

**How to use**:

```bash
# Optimize content
POST /api/intelligence/optimization
{
  "content": "Your content here",
  "targetModel": "openai-gpt4o-mini",
  "maxTokenBudget": 4000,
  "prioritizeQuality": true
}
```

**Optimization strategies**:

- Whitespace and formatting cleanup
- Pattern compression
- Model-specific formatting
- Intelligent content trimming

### 5. Context Assembly

**What it does**: Intelligently assembles context based on user intent using multiple strategies.

**How to use**:

```bash
# Assemble context
POST /api/intelligence/assembly
{
  "intent": "Create a Python tutorial for beginners",
  "strategy": "hybrid",
  "targetModel": "openai-gpt4",
  "maxTokens": 8000
}
```

**Assembly strategies**:

- **Automatic**: AI-driven selection using multiple signals
- **Semantic**: Vector similarity-based selection
- **Manual**: User-specified items
- **Hybrid**: Combination of automatic and semantic

## 🔧 Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url

# Optional
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_KEY=your_google_key
```

### Model Configurations

The system supports multiple AI models with different cost and performance characteristics:

| Model           | Provider  | Input Cost/1K | Output Cost/1K | Context Window |
| --------------- | --------- | ------------- | -------------- | -------------- |
| GPT-4o Mini     | OpenAI    | $0.00015      | $0.0006        | 128K           |
| GPT-4o          | OpenAI    | $0.005        | $0.015         | 128K           |
| Claude 3 Haiku  | Anthropic | $0.00025      | $0.00125       | 200K           |
| Claude 3 Sonnet | Anthropic | $0.003        | $0.015         | 200K           |
| Gemini Pro      | Google    | $0.0005       | $0.0015        | 30K            |

## 📊 Monitoring and Analytics

### Intelligence Overview

```bash
GET /api/intelligence/overview
```

Provides comprehensive system health and usage analytics:

- Embedding coverage across your content
- Content analysis completion rates
- Clustering insights
- Cost optimization savings
- System health status

### Statistics Endpoint

```bash
GET /api/intelligence/stats?days=30
```

Returns detailed analytics for the specified time period.

## 🔄 Batch Processing

The system supports efficient batch processing for large datasets:

```bash
# Batch generate embeddings
POST /api/intelligence/batch
{
  "operation": "generate_embeddings",
  "itemIds": ["item1", "item2", "item3"],
  "options": {
    "providerId": "openai-small",
    "batchSize": 10
  }
}

# Batch content analysis
POST /api/intelligence/batch
{
  "operation": "analyze_content",
  "itemIds": ["item1", "item2", "item3"]
}
```

## 🎨 Templates and Context Generation

### Creating Templates

```bash
POST /api/intelligence/templates
{
  "name": "Code Review Template",
  "template": "# Code Review\n\n{{system}}\n\n## Code to Review\n{{context}}\n\n## Guidelines\n{{rules}}",
  "variables": {
    "system": "role instructions",
    "context": "code content",
    "rules": "review guidelines"
  },
  "category": "development"
}
```

### Using Templates

Templates can be used in context assembly to create consistent, structured contexts.

## 🔮 Advanced Features

### Cost Optimization

The system provides intelligent cost estimates and model recommendations:

```bash
# Get cost estimates for multiple models
POST /api/intelligence/cost-estimates
{
  "content": "Your content here",
  "models": ["openai-gpt4o-mini", "anthropic-claude3-haiku"]
}

# Get model recommendations
GET /api/intelligence/cost-estimates?content=...&maxCost=0.01&prioritizeQuality=true
```

### Workflow Automation

The Intelligence Coordinator can process items through complete pipelines:

```javascript
const coordinator = new IntelligenceCoordinator(userId)

// Process a single item through the full pipeline
const result = await coordinator.processItem(itemId, {
  includeEmbedding: true,
  includeAnalysis: true,
  includeClustering: true,
  includeOptimization: true,
  targetModels: ["openai-gpt4o-mini", "anthropic-claude3-haiku"],
})

// Smart context assembly with automatic optimization
const smartResult = await coordinator.smartAssembly(
  "Create a comprehensive guide for API development",
  {
    autoOptimize: true,
    targetModel: "openai-gpt4o-mini",
    maxTokens: 4000,
  }
)
```

## 🛠️ Development and Extension

### Adding New Providers

To add a new embedding provider:

1. Extend `EMBEDDING_PROVIDERS` in `/lib/embeddings/index.ts`
2. Implement the provider-specific logic in `EmbeddingService`
3. Update the API schemas and documentation

### Custom Analysis Features

The content analysis system is extensible:

1. Add new analysis methods to `ContentAnalysisService`
2. Extend the database schema for new data types
3. Update the API endpoints and job workers

### Integration with External Services

The system is designed to integrate with external AI services and tools through the worker pattern.

## 📈 Performance Considerations

### Scaling

- Use Redis for job queuing and caching
- Implement rate limiting for AI API calls
- Consider vector database solutions for large-scale deployments
- Batch processing for improved efficiency

### Cost Management

- Monitor AI API usage through the statistics endpoint
- Use cost-effective models for bulk operations
- Implement content optimization to reduce token usage
- Cache expensive operations when possible

## 🚨 Error Handling

The system includes comprehensive error handling:

- Graceful degradation when AI services are unavailable
- Fallback methods for content analysis
- Retry mechanisms for transient failures
- Detailed error logging and monitoring

## 🔐 Security

- All API endpoints require authentication
- User data isolation in multi-tenant environment
- API key encryption in database
- Rate limiting to prevent abuse

## 📚 API Reference

### Complete Endpoint List

| Endpoint                           | Method              | Purpose                           |
| ---------------------------------- | ------------------- | --------------------------------- |
| `/api/intelligence/overview`       | GET/POST            | System overview and quick actions |
| `/api/intelligence/embeddings`     | POST/GET/DELETE     | Embedding management              |
| `/api/intelligence/search`         | POST                | Semantic search                   |
| `/api/intelligence/clustering`     | POST/GET            | Content clustering                |
| `/api/intelligence/analysis`       | POST/GET            | Content analysis                  |
| `/api/intelligence/optimization`   | POST/GET            | Model optimization                |
| `/api/intelligence/assembly`       | POST/GET            | Context assembly                  |
| `/api/intelligence/templates`      | POST/GET/PUT/DELETE | Template management               |
| `/api/intelligence/cost-estimates` | POST/GET            | Cost analysis                     |
| `/api/intelligence/batch`          | POST/GET            | Batch operations                  |
| `/api/intelligence/stats`          | GET                 | Analytics and statistics          |

## 🎯 Use Cases

### Content Management

- Automatically organize imported content
- Find duplicate or similar items
- Generate folder structures based on content patterns

### AI Prompt Engineering

- Optimize prompts for specific models
- Assemble context from multiple sources
- Test prompt variations with quality scoring

### Knowledge Management

- Create searchable knowledge bases
- Generate content summaries and indexes
- Discover knowledge gaps and overlaps

### Cost Optimization

- Reduce AI API costs through content optimization
- Choose optimal models for specific tasks
- Monitor and track AI spending

## 🤝 Contributing

The Intelligence System is designed to be extensible. Key areas for contribution:

1. **New AI Providers**: Add support for additional AI services
2. **Analysis Features**: Implement domain-specific content analysis
3. **Optimization Strategies**: Develop new content optimization techniques
4. **UI Components**: Create frontend interfaces for intelligence features
5. **Performance**: Optimize algorithms and database queries

## 📖 Examples

See the `/examples` directory for complete implementation examples and use cases.

## 🆘 Troubleshooting

### Common Issues

1. **Embeddings not generating**: Check API keys and rate limits
2. **Low quality scores**: Review content formatting and structure
3. **Clustering failures**: Ensure sufficient content with embeddings
4. **High costs**: Enable optimization and use cost-effective models

### Debug Mode

Enable detailed logging:

```bash
DEBUG=contextforge:intelligence pnpm dev
```

### Health Checks

Use the overview endpoint to monitor system health and get actionable recommendations.

---

The ContextForge Intelligence System represents a complete AI integration that transforms simple content management into intelligent context assembly. It provides the foundation for advanced AI workflows while maintaining cost efficiency and user control.
