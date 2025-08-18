/**
 * Swarm Monitoring and Feedback System
 * Continuous performance monitoring, feedback loops, and adaptive optimization
 */

import { swarmOrchestrator, SwarmMetrics } from './orchestrator';
import { swarmComms } from './communication';

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'throughput' | 'efficiency' | 'quality' | 'resource_utilization' | 'user_satisfaction';
  value: number;
  target: number;
  team?: string;
  task?: string;
  metadata: Record<string, any>;
}

export interface FeedbackLoop {
  id: string;
  name: string;
  trigger: 'schedule' | 'threshold' | 'event';
  condition: any;
  actions: FeedbackAction[];
  enabled: boolean;
  lastExecuted?: number;
  executionCount: number;
}

export interface FeedbackAction {
  type: 'adjust_capacity' | 'reassign_task' | 'optimize_workflow' | 'alert' | 'consensus_request';
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SwarmHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  components: {
    communication: 'healthy' | 'degraded' | 'critical';
    orchestration: 'healthy' | 'degraded' | 'critical';
    teams: Record<string, 'healthy' | 'degraded' | 'critical'>;
    resources: 'healthy' | 'degraded' | 'critical';
  };
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    component: string;
    suggestedActions: string[];
  }>;
}

export class SwarmMonitor {
  private metrics: PerformanceMetric[] = [];
  private feedbackLoops: Map<string, FeedbackLoop> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds: Map<string, number> = new Map();

  constructor() {
    this.initializeFeedbackLoops();
    this.initializeAlertThresholds();
  }

  private initializeFeedbackLoops() {
    // Task completion rate feedback loop
    this.addFeedbackLoop({
      id: 'task_completion_rate',
      name: 'Task Completion Rate Monitor',
      trigger: 'schedule',
      condition: { interval: 300000 }, // 5 minutes
      actions: [
        {
          type: 'adjust_capacity',
          parameters: { metric: 'completion_rate', threshold: 0.7 },
          priority: 'medium'
        }
      ],
      enabled: true,
      executionCount: 0
    });

    // Team utilization feedback loop
    this.addFeedbackLoop({
      id: 'team_utilization',
      name: 'Team Utilization Optimizer',
      trigger: 'threshold',
      condition: { metric: 'team_utilization', operator: '>', value: 0.9 },
      actions: [
        {
          type: 'adjust_capacity',
          parameters: { action: 'increase_capacity', amount: 1 },
          priority: 'high'
        }
      ],
      enabled: true,
      executionCount: 0
    });

    // Quality degradation feedback loop
    this.addFeedbackLoop({
      id: 'quality_degradation',
      name: 'Quality Degradation Monitor',
      trigger: 'threshold',
      condition: { metric: 'success_rate', operator: '<', value: 0.8 },
      actions: [
        {
          type: 'alert',
          parameters: { severity: 'critical', message: 'Quality degradation detected' },
          priority: 'critical'
        },
        {
          type: 'consensus_request',
          parameters: { 
            topic: 'quality_improvement',
            options: ['increase_testing', 'slow_down_development', 'add_qa_resources']
          },
          priority: 'high'
        }
      ],
      enabled: true,
      executionCount: 0
    });

    // Resource exhaustion feedback loop
    this.addFeedbackLoop({
      id: 'resource_exhaustion',
      name: 'Resource Exhaustion Monitor',
      trigger: 'threshold',
      condition: { metric: 'average_utilization', operator: '>', value: 0.95 },
      actions: [
        {
          type: 'optimize_workflow',
          parameters: { focus: 'resource_optimization' },
          priority: 'high'
        }
      ],
      enabled: true,
      executionCount: 0
    });

    // Blocked tasks feedback loop
    this.addFeedbackLoop({
      id: 'blocked_tasks',
      name: 'Blocked Tasks Monitor',
      trigger: 'threshold',
      condition: { metric: 'blocked_tasks', operator: '>', value: 3 },
      actions: [
        {
          type: 'reassign_task',
          parameters: { strategy: 'redistribute_blocked' },
          priority: 'high'
        }
      ],
      enabled: true,
      executionCount: 0
    });
  }

  private initializeAlertThresholds() {
    this.alertThresholds.set('throughput_low', 5); // tasks per day
    this.alertThresholds.set('completion_time_high', 48); // hours
    this.alertThresholds.set('success_rate_low', 0.8); // 80%
    this.alertThresholds.set('utilization_high', 0.9); // 90%
    this.alertThresholds.set('blocked_tasks_high', 3); // count
  }

  /**
   * Start the monitoring system
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('Swarm monitoring started');

    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.processFeedbackLoops();
      await this.checkHealth();
    }, 60000); // Every minute

    // Initial metrics collection
    await this.collectMetrics();
  }

  /**
   * Stop the monitoring system
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Swarm monitoring stopped');
  }

  /**
   * Collect current performance metrics
   */
  private async collectMetrics(): Promise<void> {
    const swarmMetrics = swarmOrchestrator.getMetrics();
    const timestamp = Date.now();

    // Throughput metric
    this.addMetric({
      id: `throughput_${timestamp}`,
      timestamp,
      type: 'throughput',
      value: swarmMetrics.throughput,
      target: 10, // Target: 10 tasks per day
      metadata: { period: '24h' }
    });

    // Efficiency metric (completion rate)
    this.addMetric({
      id: `efficiency_${timestamp}`,
      timestamp,
      type: 'efficiency',
      value: swarmMetrics.successRate,
      target: 0.9, // Target: 90% success rate
      metadata: { total_tasks: swarmMetrics.totalTasks }
    });

    // Resource utilization metrics for each team
    Object.entries(swarmMetrics.teamUtilization).forEach(([team, utilization]) => {
      this.addMetric({
        id: `utilization_${team}_${timestamp}`,
        timestamp,
        type: 'resource_utilization',
        value: utilization,
        target: 0.8, // Target: 80% utilization
        team,
        metadata: { team_name: team }
      });
    });

    // Quality metric (inverse of average completion time)
    const qualityScore = swarmMetrics.averageCompletionTime > 0 
      ? Math.max(0, 1 - (swarmMetrics.averageCompletionTime - 20) / 40) // Normalize around 20 hours
      : 1;

    this.addMetric({
      id: `quality_${timestamp}`,
      timestamp,
      type: 'quality',
      value: qualityScore,
      target: 0.8, // Target: 80% quality score
      metadata: { 
        average_completion_time: swarmMetrics.averageCompletionTime,
        blocked_tasks: swarmMetrics.blockedTasks
      }
    });
  }

  /**
   * Add a new performance metric
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check for threshold violations
    this.checkThresholds(metric);
  }

  /**
   * Check if metric violates alert thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const deviation = Math.abs(metric.value - metric.target) / metric.target;
    
    if (deviation > 0.2) { // 20% deviation threshold
      this.triggerAlert({
        severity: deviation > 0.5 ? 'critical' : 'medium',
        description: `${metric.type} metric deviation: ${(deviation * 100).toFixed(1)}%`,
        component: metric.team || 'swarm',
        suggestedActions: this.getSuggestedActions(metric)
      });
    }
  }

  /**
   * Get suggested actions for metric deviations
   */
  private getSuggestedActions(metric: PerformanceMetric): string[] {
    switch (metric.type) {
      case 'throughput':
        return metric.value < metric.target 
          ? ['Increase team capacity', 'Optimize task assignment', 'Remove blockers']
          : ['Consider taking on more complex tasks'];
      
      case 'efficiency':
        return metric.value < metric.target
          ? ['Review failed tasks', 'Improve testing procedures', 'Enhance team training']
          : ['Maintain current processes'];
      
      case 'resource_utilization':
        return metric.value > metric.target
          ? ['Add team members', 'Redistribute workload', 'Defer non-critical tasks']
          : metric.value < 0.5 
            ? ['Assign more tasks', 'Cross-train team members']
            : ['Optimal utilization'];
      
      case 'quality':
        return metric.value < metric.target
          ? ['Increase testing coverage', 'Slow down development pace', 'Review processes']
          : ['Maintain quality standards'];
      
      default:
        return ['Monitor closely', 'Investigate root cause'];
    }
  }

  /**
   * Process all enabled feedback loops
   */
  private async processFeedbackLoops(): Promise<void> {
    for (const [id, loop] of this.feedbackLoops) {
      if (!loop.enabled) continue;

      let shouldExecute = false;

      switch (loop.trigger) {
        case 'schedule':
          const interval = loop.condition.interval || 300000; // Default 5 minutes
          const timeSinceLastExecution = Date.now() - (loop.lastExecuted || 0);
          shouldExecute = timeSinceLastExecution >= interval;
          break;

        case 'threshold':
          shouldExecute = this.checkThresholdCondition(loop.condition);
          break;

        case 'event':
          // Event-based triggers would be handled separately
          break;
      }

      if (shouldExecute) {
        await this.executeFeedbackLoop(loop);
      }
    }
  }

  /**
   * Check if threshold condition is met
   */
  private checkThresholdCondition(condition: any): boolean {
    const latestMetrics = this.getLatestMetricsByType(condition.metric);
    if (latestMetrics.length === 0) return false;

    const value = latestMetrics[0].value;
    const threshold = condition.value;

    switch (condition.operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      default: return false;
    }
  }

  /**
   * Execute a feedback loop
   */
  private async executeFeedbackLoop(loop: FeedbackLoop): Promise<void> {
    console.log(`Executing feedback loop: ${loop.name}`);

    for (const action of loop.actions) {
      await this.executeFeedbackAction(action, loop);
    }

    loop.lastExecuted = Date.now();
    loop.executionCount++;
  }

  /**
   * Execute a specific feedback action
   */
  private async executeFeedbackAction(action: FeedbackAction, loop: FeedbackLoop): Promise<void> {
    switch (action.type) {
      case 'adjust_capacity':
        await this.adjustTeamCapacity(action.parameters);
        break;

      case 'reassign_task':
        await this.reassignTasks(action.parameters);
        break;

      case 'optimize_workflow':
        await this.optimizeWorkflow(action.parameters);
        break;

      case 'alert':
        await this.sendAlert(action.parameters);
        break;

      case 'consensus_request':
        await this.requestConsensus(action.parameters);
        break;
    }
  }

  /**
   * Adjust team capacity based on feedback
   */
  private async adjustTeamCapacity(parameters: any): Promise<void> {
    // Implementation would depend on specific parameters
    console.log('Adjusting team capacity:', parameters);
    
    // Example: Increase capacity for overloaded teams
    if (parameters.action === 'increase_capacity') {
      const swarmMetrics = swarmOrchestrator.getMetrics();
      
      // Find teams with high utilization
      Object.entries(swarmMetrics.teamUtilization).forEach(([team, utilization]) => {
        if (utilization > 0.9) {
          // Simulate capacity increase (in real implementation, this would scale resources)
          console.log(`Increasing capacity for team ${team} due to ${(utilization * 100).toFixed(1)}% utilization`);
        }
      });
    }
  }

  /**
   * Reassign tasks based on feedback
   */
  private async reassignTasks(parameters: any): Promise<void> {
    console.log('Reassigning tasks:', parameters);
    
    if (parameters.strategy === 'redistribute_blocked') {
      const activeTasks = swarmOrchestrator.getActiveTasks();
      const blockedTasks = activeTasks.filter(task => task.status === 'blocked');
      
      for (const task of blockedTasks) {
        console.log(`Attempting to reassign blocked task: ${task.id}`);
        // In real implementation, would use orchestrator to reassign
      }
    }
  }

  /**
   * Optimize workflow based on feedback
   */
  private async optimizeWorkflow(parameters: any): Promise<void> {
    console.log('Optimizing workflow:', parameters);
    
    if (parameters.focus === 'resource_optimization') {
      // Implement workflow optimization logic
      console.log('Implementing resource optimization strategies');
    }
  }

  /**
   * Send alert
   */
  private async sendAlert(parameters: any): Promise<void> {
    console.log(`ALERT [${parameters.severity}]: ${parameters.message}`);
    
    // In real implementation, would send notifications
    await swarmComms.sendMessage({
      from: 'monitor',
      to: 'broadcast',
      type: 'broadcast',
      payload: {
        event: 'alert',
        severity: parameters.severity,
        message: parameters.message,
        timestamp: Date.now()
      },
      priority: parameters.severity === 'critical' ? 'critical' : 'high'
    });
  }

  /**
   * Request consensus for decision making
   */
  private async requestConsensus(parameters: any): Promise<void> {
    await swarmComms.requestConsensus({
      proposalId: `feedback_${Date.now()}`,
      description: `Feedback-driven decision: ${parameters.topic}`,
      options: parameters.options,
      votes: {},
      threshold: 0.67,
      deadline: Date.now() + (2 * 3600000), // 2 hours
      requiredParticipants: ['uiux', 'backend', 'ai', 'devtools', 'analytics', 'qa']
    });
  }

  /**
   * Add a new feedback loop
   */
  addFeedbackLoop(loop: FeedbackLoop): void {
    this.feedbackLoops.set(loop.id, loop);
  }

  /**
   * Remove a feedback loop
   */
  removeFeedbackLoop(id: string): boolean {
    return this.feedbackLoops.delete(id);
  }

  /**
   * Get latest metrics by type
   */
  getLatestMetricsByType(type: string, limit: number = 10): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Check overall swarm health
   */
  async checkHealth(): Promise<SwarmHealth> {
    const commHealth = swarmComms.healthCheck();
    const swarmMetrics = swarmOrchestrator.getMetrics();
    
    const issues: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      component: string;
      suggestedActions: string[];
    }> = [];

    // Check communication health
    let communicationStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (commHealth.status === 'degraded') {
      communicationStatus = 'degraded';
      issues.push({
        severity: 'medium',
        description: 'Communication system degraded',
        component: 'communication',
        suggestedActions: ['Monitor message queue', 'Check subscriber health']
      });
    } else if (commHealth.status === 'unhealthy') {
      communicationStatus = 'critical';
      issues.push({
        severity: 'critical',
        description: 'Communication system critical',
        component: 'communication',
        suggestedActions: ['Restart communication system', 'Check network connectivity']
      });
    }

    // Check orchestration health
    let orchestrationStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (swarmMetrics.blockedTasks > 5) {
      orchestrationStatus = 'degraded';
      issues.push({
        severity: 'medium',
        description: `${swarmMetrics.blockedTasks} tasks blocked`,
        component: 'orchestration',
        suggestedActions: ['Review task dependencies', 'Reassign blocked tasks']
      });
    }

    if (swarmMetrics.successRate < 0.7) {
      orchestrationStatus = 'critical';
      issues.push({
        severity: 'critical',
        description: `Low success rate: ${(swarmMetrics.successRate * 100).toFixed(1)}%`,
        component: 'orchestration',
        suggestedActions: ['Review failed tasks', 'Improve quality processes']
      });
    }

    // Check team health
    const teamHealth: Record<string, 'healthy' | 'degraded' | 'critical'> = {};
    Object.entries(swarmMetrics.teamUtilization).forEach(([team, utilization]) => {
      if (utilization > 0.95) {
        teamHealth[team] = 'critical';
        issues.push({
          severity: 'high',
          description: `Team ${team} overloaded: ${(utilization * 100).toFixed(1)}%`,
          component: team,
          suggestedActions: ['Increase team capacity', 'Redistribute workload']
        });
      } else if (utilization > 0.9) {
        teamHealth[team] = 'degraded';
      } else {
        teamHealth[team] = 'healthy';
      }
    });

    // Check resource health
    let resourceStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const avgUtilization = Object.values(swarmMetrics.teamUtilization).reduce((sum, util) => sum + util, 0) / Object.keys(swarmMetrics.teamUtilization).length;
    
    if (avgUtilization > 0.9) {
      resourceStatus = avgUtilization > 0.95 ? 'critical' : 'degraded';
      issues.push({
        severity: avgUtilization > 0.95 ? 'critical' : 'medium',
        description: `High resource utilization: ${(avgUtilization * 100).toFixed(1)}%`,
        component: 'resources',
        suggestedActions: ['Scale up resources', 'Optimize task distribution']
      });
    }

    // Determine overall health
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalIssues > 0) {
      overall = 'critical';
    } else if (highIssues > 2 || issues.length > 5) {
      overall = 'degraded';
    }

    return {
      overall,
      components: {
        communication: communicationStatus,
        orchestration: orchestrationStatus,
        teams: teamHealth,
        resources: resourceStatus
      },
      issues
    };
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(issue: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    component: string;
    suggestedActions: string[];
  }): void {
    console.log(`SWARM ALERT [${issue.severity.toUpperCase()}] ${issue.component}: ${issue.description}`);
    console.log('Suggested actions:', issue.suggestedActions.join(', '));
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    metricsCollected: number;
    feedbackLoopsActive: number;
    alertsTriggered: number;
    averageResponseTime: number;
  } {
    return {
      metricsCollected: this.metrics.length,
      feedbackLoopsActive: Array.from(this.feedbackLoops.values()).filter(l => l.enabled).length,
      alertsTriggered: Array.from(this.feedbackLoops.values()).reduce((sum, l) => sum + l.executionCount, 0),
      averageResponseTime: 0 // Would be calculated from actual response times
    };
  }
}

// Singleton instance
export const swarmMonitor = new SwarmMonitor();