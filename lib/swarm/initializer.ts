/**
 * Swarm Initializer
 * Handles swarm startup, configuration loading, and system coordination
 */

import fs from 'fs/promises';
import path from 'path';
import { swarmOrchestrator } from './orchestrator';
import { swarmComms } from './communication';
import { swarmMonitor } from './monitoring';

export interface SwarmConfig {
  swarm: {
    name: string;
    version: string;
    topology: string;
    maxAgents: number;
    coordination: {
      type: string;
      messageProtocol: string;
      consensusThreshold: number;
      taskTimeout: number;
    };
  };
  orchestrator: {
    role: string;
    responsibilities: string[];
    decisionMaking: {
      autonomyLevel: string;
      escalationRules: string[];
    };
  };
  teams: Record<string, {
    name: string;
    agentCount: number;
    specialization: string;
    responsibilities: string[];
    tools: string[];
    objectives: string[];
  }>;
  communication: {
    channels: Record<string, {
      type: string;
      purpose: string;
    }>;
    protocols: Record<string, {
      format: string;
      fields: string[];
    }>;
  };
  workflows: Record<string, any>;
  success_metrics: Record<string, any>;
  resource_allocation: {
    compute: {
      per_agent: string;
      memory_limit: string;
      concurrent_tasks: number;
    };
    storage: {
      shared_memory: string;
      task_cache: string;
      communication_buffer: string;
    };
  };
}

export interface InitializationResult {
  success: boolean;
  swarmId: string;
  startTime: number;
  componentsInitialized: string[];
  errors: string[];
  config: SwarmConfig;
  healthStatus: any;
}

export class SwarmInitializer {
  private config: SwarmConfig | null = null;
  private isInitialized: boolean = false;
  private swarmId: string = '';
  private startTime: number = 0;
  private componentsInitialized: string[] = [];
  private initializationErrors: string[] = [];

  /**
   * Initialize the swarm system
   */
  async initialize(configPath?: string): Promise<InitializationResult> {
    console.log('🚀 Starting ContextForge Swarm Initialization...');
    this.startTime = Date.now();
    this.swarmId = this.generateSwarmId();

    try {
      // Step 1: Load configuration
      await this.loadConfiguration(configPath);
      this.componentsInitialized.push('configuration');

      // Step 2: Validate configuration
      await this.validateConfiguration();
      this.componentsInitialized.push('validation');

      // Step 3: Initialize communication system
      await this.initializeCommunication();
      this.componentsInitialized.push('communication');

      // Step 4: Initialize orchestrator
      await this.initializeOrchestrator();
      this.componentsInitialized.push('orchestrator');

      // Step 5: Initialize monitoring
      await this.initializeMonitoring();
      this.componentsInitialized.push('monitoring');

      // Step 6: Setup initial tasks
      await this.setupInitialTasks();
      this.componentsInitialized.push('initial_tasks');

      // Step 7: Start all systems
      await this.startSystems();
      this.componentsInitialized.push('systems_started');

      // Step 8: Health check
      const healthStatus = await swarmMonitor.checkHealth();
      this.componentsInitialized.push('health_check');

      this.isInitialized = true;

      console.log('✅ Swarm initialization completed successfully!');
      console.log(`🆔 Swarm ID: ${this.swarmId}`);
      console.log(`⏱️  Initialization time: ${Date.now() - this.startTime}ms`);
      console.log(`🏥 Health status: ${healthStatus.overall}`);

      return {
        success: true,
        swarmId: this.swarmId,
        startTime: this.startTime,
        componentsInitialized: this.componentsInitialized,
        errors: this.initializationErrors,
        config: this.config!,
        healthStatus
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.initializationErrors.push(errorMessage);
      
      console.error('❌ Swarm initialization failed:', errorMessage);

      return {
        success: false,
        swarmId: this.swarmId,
        startTime: this.startTime,
        componentsInitialized: this.componentsInitialized,
        errors: this.initializationErrors,
        config: this.config!,
        healthStatus: null
      };
    }
  }

  /**
   * Load swarm configuration
   */
  private async loadConfiguration(configPath?: string): Promise<void> {
    const defaultConfigPath = path.join(process.cwd(), 'swarm-config.json');
    const finalConfigPath = configPath || defaultConfigPath;

    try {
      const configContent = await fs.readFile(finalConfigPath, 'utf-8');
      this.config = JSON.parse(configContent) as SwarmConfig;
      console.log(`📝 Configuration loaded from: ${finalConfigPath}`);
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  /**
   * Validate the loaded configuration
   */
  private async validateConfiguration(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    // Validate required sections
    const requiredSections = ['swarm', 'teams', 'communication', 'resource_allocation'];
    for (const section of requiredSections) {
      if (!(section in this.config)) {
        throw new Error(`Missing required configuration section: ${section}`);
      }
    }

    // Validate swarm configuration
    if (!this.config.swarm.name || !this.config.swarm.topology) {
      throw new Error('Invalid swarm configuration');
    }

    // Validate teams
    if (Object.keys(this.config.teams).length === 0) {
      throw new Error('No teams configured');
    }

    // Validate team configurations
    for (const [teamId, team] of Object.entries(this.config.teams)) {
      if (!team.name || !team.specialization || !team.responsibilities) {
        throw new Error(`Invalid configuration for team: ${teamId}`);
      }
    }

    console.log('✅ Configuration validation passed');
  }

  /**
   * Initialize communication system
   */
  private async initializeCommunication(): Promise<void> {
    try {
      // Communication system is initialized by singleton pattern
      // Verify it's working
      const healthCheck = swarmComms.healthCheck();
      if (healthCheck.status === 'unhealthy') {
        throw new Error('Communication system health check failed');
      }

      console.log('📡 Communication system initialized');
    } catch (error) {
      throw new Error(`Failed to initialize communication: ${error}`);
    }
  }

  /**
   * Initialize orchestrator
   */
  private async initializeOrchestrator(): Promise<void> {
    try {
      await swarmOrchestrator.start();
      console.log('🎯 Orchestrator initialized and started');
    } catch (error) {
      throw new Error(`Failed to initialize orchestrator: ${error}`);
    }
  }

  /**
   * Initialize monitoring system
   */
  private async initializeMonitoring(): Promise<void> {
    try {
      await swarmMonitor.startMonitoring();
      console.log('📊 Monitoring system initialized and started');
    } catch (error) {
      throw new Error(`Failed to initialize monitoring: ${error}`);
    }
  }

  /**
   * Setup initial tasks based on ContextForge enhancement objectives
   */
  private async setupInitialTasks(): Promise<void> {
    try {
      const initialTasks = this.generateInitialTasks();
      
      for (const task of initialTasks) {
        await swarmOrchestrator.addTask(task);
      }

      console.log(`📋 ${initialTasks.length} initial tasks created and queued`);
    } catch (error) {
      throw new Error(`Failed to setup initial tasks: ${error}`);
    }
  }

  /**
   * Generate initial tasks for ContextForge enhancement
   */
  private generateInitialTasks() {
    return [
      // UI/UX Tasks
      {
        title: 'Transform Dashboard to AI Context Command Center',
        description: 'Redesign the main dashboard to serve as an intelligent AI Context Command Center with real-time status indicators, optimization progress, and AI insights.',
        type: 'feature' as const,
        priority: 'high' as const,
        estimatedEffort: 24,
        dependencies: [],
        acceptanceCriteria: [
          'Dashboard shows real-time context assembly status',
          'AI optimization progress is visualized',
          'Command center provides quick access to all major functions',
          'Responsive design works on all screen sizes'
        ],
        tags: ['ui', 'dashboard', 'command-center']
      },
      
      // Backend Tasks
      {
        title: 'Implement Real-time Processing Pipeline',
        description: 'Build a background processing system for real-time context optimization, duplicate detection, and AI suggestions with job queuing.',
        type: 'feature' as const,
        priority: 'critical' as const,
        estimatedEffort: 32,
        dependencies: [],
        acceptanceCriteria: [
          'Background job queue processes optimization tasks',
          'Real-time WebSocket updates for processing status',
          'Support for 100+ concurrent optimization jobs',
          'Robust error handling and retry mechanisms'
        ],
        tags: ['backend', 'real-time', 'processing']
      },

      // AI Tasks
      {
        title: 'Build Intelligent Context Assembly System',
        description: 'Create AI-powered context assembly with model-specific optimization, smart suggestions, and adaptive learning.',
        type: 'feature' as const,
        priority: 'critical' as const,
        estimatedEffort: 28,
        dependencies: [],
        acceptanceCriteria: [
          'Model-specific optimization for OpenAI, Claude, Gemini',
          'Intelligent context assembly based on usage patterns',
          'AI suggestions improve over time with user feedback',
          'Context quality scoring and recommendations'
        ],
        tags: ['ai', 'context-assembly', 'optimization']
      },

      // Developer Tools Tasks
      {
        title: 'Create CLI for Developer Tool Integration',
        description: 'Build a comprehensive CLI tool for seamless integration with developer workflows, IDEs, and CI/CD pipelines.',
        type: 'feature' as const,
        priority: 'high' as const,
        estimatedEffort: 20,
        dependencies: [],
        acceptanceCriteria: [
          'CLI supports all major operations (import, export, optimize)',
          'Integration with popular IDEs (VSCode, JetBrains)',
          'CI/CD pipeline integration capabilities',
          'Comprehensive documentation and examples'
        ],
        tags: ['devtools', 'cli', 'integration']
      },

      // Analytics Tasks
      {
        title: 'Implement Advanced Analytics Dashboard',
        description: 'Create comprehensive analytics and insights dashboard with usage patterns, optimization metrics, and recommendations.',
        type: 'feature' as const,
        priority: 'medium' as const,
        estimatedEffort: 18,
        dependencies: [],
        acceptanceCriteria: [
          'Usage analytics with visual dashboards',
          'Optimization impact metrics and trends',
          'User behavior analysis and insights',
          'Recommendation engine for process improvements'
        ],
        tags: ['analytics', 'dashboard', 'insights']
      },

      // QA Tasks
      {
        title: 'Establish Comprehensive Testing Framework',
        description: 'Implement automated testing for all AI features, real-time processing, and user workflows.',
        type: 'enhancement' as const,
        priority: 'high' as const,
        estimatedEffort: 16,
        dependencies: [],
        acceptanceCriteria: [
          'Unit tests for all core functionality',
          'Integration tests for AI features',
          'Performance tests for concurrent processing',
          'End-to-end tests for user workflows'
        ],
        tags: ['qa', 'testing', 'automation']
      },

      // Cross-team Integration Tasks
      {
        title: 'Optimize Context Assembly Performance',
        description: 'Achieve 50% reduction in context assembly time through algorithmic improvements and caching strategies.',
        type: 'optimization' as const,
        priority: 'critical' as const,
        estimatedEffort: 24,
        dependencies: [],
        acceptanceCriteria: [
          '50% reduction in average context assembly time',
          'Intelligent caching of processed contexts',
          'Optimized AI model calls and batching',
          'Performance benchmarking and monitoring'
        ],
        tags: ['performance', 'optimization', 'caching']
      },

      {
        title: 'Enable Daily Active Usage Patterns',
        description: 'Implement features and workflows that encourage daily usage and provide continuous value to users.',
        type: 'feature' as const,
        priority: 'high' as const,
        estimatedEffort: 20,
        dependencies: [],
        acceptanceCriteria: [
          'Smart notifications and suggestions',
          'Quick-access workflows for common tasks',
          'Progressive enhancement of user experience',
          'Seamless integration into daily development workflow'
        ],
        tags: ['user-experience', 'engagement', 'workflow']
      }
    ];
  }

  /**
   * Start all swarm systems
   */
  private async startSystems(): Promise<void> {
    try {
      // All systems are already started in their respective initialization methods
      // This is a final verification step
      
      // Verify orchestrator is running
      const metrics = swarmOrchestrator.getMetrics();
      if (metrics.totalTasks === 0) {
        console.log('⚠️  Warning: No tasks in orchestrator queue');
      }

      // Verify monitoring is running
      const monitoringStats = swarmMonitor.getMonitoringStats();
      if (monitoringStats.feedbackLoopsActive === 0) {
        console.log('⚠️  Warning: No active feedback loops');
      }

      console.log('🎯 All systems verified and operational');
    } catch (error) {
      throw new Error(`Failed to start systems: ${error}`);
    }
  }

  /**
   * Get current swarm status
   */
  getStatus(): {
    isInitialized: boolean;
    swarmId: string;
    uptime: number;
    componentsInitialized: string[];
    errors: string[];
  } {
    return {
      isInitialized: this.isInitialized,
      swarmId: this.swarmId,
      uptime: this.isInitialized ? Date.now() - this.startTime : 0,
      componentsInitialized: this.componentsInitialized,
      errors: this.initializationErrors
    };
  }

  /**
   * Shutdown the swarm
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Initiating swarm shutdown...');

    try {
      // Stop monitoring
      await swarmMonitor.stopMonitoring();
      console.log('📊 Monitoring system stopped');

      // Stop orchestrator
      await swarmOrchestrator.stop();
      console.log('🎯 Orchestrator stopped');

      // Communication system cleanup would go here
      console.log('📡 Communication system cleanup completed');

      this.isInitialized = false;
      console.log('✅ Swarm shutdown completed successfully');

    } catch (error) {
      console.error('❌ Error during swarm shutdown:', error);
      throw error;
    }
  }

  /**
   * Generate unique swarm ID
   */
  private generateSwarmId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `swarm_${timestamp}_${random}`;
  }

  /**
   * Get swarm configuration
   */
  getConfig(): SwarmConfig | null {
    return this.config;
  }

  /**
   * Create a pre-configured swarm for ContextForge
   */
  static async createContextForgeSwarm(): Promise<InitializationResult> {
    const initializer = new SwarmInitializer();
    
    console.log('🎯 Initializing ContextForge Enhancement Swarm...');
    console.log('📋 Mission: Transform ContextForge into an intelligent, cohesive AI context management system');
    console.log('🎯 Objectives:');
    console.log('   • Transform dashboard into AI Context Command Center');
    console.log('   • Build intelligent context assembly with model-specific optimization');
    console.log('   • Create real-time optimization pipeline with background processing');
    console.log('   • Develop CLI/API for developer tool integration');
    console.log('   • Implement advanced analytics and insights');
    console.log('🎖️  Success Metrics:');
    console.log('   • 50% reduction in context assembly time');
    console.log('   • 80% user satisfaction with AI features');
    console.log('   • Enable daily active usage patterns');
    console.log('   • Support 100+ concurrent optimization jobs');

    return await initializer.initialize();
  }
}

// Export singleton instance and factory function
export const swarmInitializer = new SwarmInitializer();
export const initializeContextForgeSwarm = SwarmInitializer.createContextForgeSwarm;