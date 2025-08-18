/**
 * Swarm Orchestrator
 * Central coordinator for task distribution, resource allocation, and swarm management
 */

import { swarmComms, SwarmMessage, TaskAssignment, StatusUpdate } from './communication';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'enhancement' | 'bugfix' | 'optimization' | 'research';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: number; // hours
  deadline?: number;
  dependencies: string[];
  assignedTeam?: string;
  assignedAgent?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'blocked' | 'completed' | 'failed';
  progress: number; // 0-100
  acceptanceCriteria: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface TeamCapacity {
  teamId: string;
  maxConcurrentTasks: number;
  currentTasks: number;
  specializations: string[];
  availability: number; // 0-1 scale
  averageCompletionTime: number; // hours
}

export interface SwarmMetrics {
  totalTasks: number;
  completedTasks: number;
  averageCompletionTime: number;
  throughput: number; // tasks per day
  teamUtilization: Record<string, number>;
  successRate: number;
  blockedTasks: number;
}

export class SwarmOrchestrator {
  private tasks: Map<string, Task> = new Map();
  private teamCapacities: Map<string, TeamCapacity> = new Map();
  private taskQueue: string[] = [];
  private taskHistory: Task[] = [];
  private isRunning: boolean = false;

  constructor() {
    this.initializeTeamCapacities();
    this.setupCommunication();
  }

  private initializeTeamCapacities() {
    const teams = [
      {
        teamId: 'uiux',
        maxConcurrentTasks: 2,
        currentTasks: 0,
        specializations: ['user_interface', 'user_experience', 'design_systems'],
        availability: 1.0,
        averageCompletionTime: 16
      },
      {
        teamId: 'backend',
        maxConcurrentTasks: 3,
        currentTasks: 0,
        specializations: ['system_architecture', 'databases', 'apis', 'performance'],
        availability: 1.0,
        averageCompletionTime: 24
      },
      {
        teamId: 'ai',
        maxConcurrentTasks: 3,
        currentTasks: 0,
        specializations: ['ai_optimization', 'machine_learning', 'nlp', 'embeddings'],
        availability: 1.0,
        averageCompletionTime: 20
      },
      {
        teamId: 'devtools',
        maxConcurrentTasks: 2,
        currentTasks: 0,
        specializations: ['developer_experience', 'cli_tools', 'apis', 'integrations'],
        availability: 1.0,
        averageCompletionTime: 18
      },
      {
        teamId: 'analytics',
        maxConcurrentTasks: 2,
        currentTasks: 0,
        specializations: ['data_insights', 'metrics', 'visualization', 'monitoring'],
        availability: 1.0,
        averageCompletionTime: 14
      },
      {
        teamId: 'qa',
        maxConcurrentTasks: 4,
        currentTasks: 0,
        specializations: ['quality_control', 'testing', 'validation', 'security'],
        availability: 1.0,
        averageCompletionTime: 12
      }
    ];

    teams.forEach(team => {
      this.teamCapacities.set(team.teamId, team);
    });
  }

  private setupCommunication() {
    swarmComms.subscribe('orchestrator', this.handleMessage.bind(this));
  }

  private async handleMessage(message: SwarmMessage) {
    switch (message.type) {
      case 'status_update':
        await this.handleStatusUpdate(message.payload as StatusUpdate);
        break;
      case 'escalation':
        await this.handleEscalation(message);
        break;
      default:
        // Handle other message types
        break;
    }
  }

  private async handleStatusUpdate(update: StatusUpdate) {
    const task = this.tasks.get(update.taskId);
    if (!task) return;

    // Update task status
    task.status = update.status;
    task.progress = update.progress;
    task.updatedAt = Date.now();

    if (update.status === 'completed') {
      task.completedAt = Date.now();
      await this.handleTaskCompletion(task);
    } else if (update.status === 'blocked') {
      await this.handleTaskBlocked(task, update.blockers);
    }

    // Update team capacity
    if (update.status === 'completed' || update.status === 'failed') {
      const team = this.teamCapacities.get(task.assignedTeam!);
      if (team) {
        team.currentTasks = Math.max(0, team.currentTasks - 1);
      }
    }
  }

  private async handleTaskCompletion(task: Task) {
    // Move to history
    this.taskHistory.push({ ...task });
    
    // Check for dependent tasks
    const dependentTasks = Array.from(this.tasks.values())
      .filter(t => t.dependencies.includes(task.id) && t.status === 'pending');

    // Process dependent tasks that are now unblocked
    for (const dependentTask of dependentTasks) {
      const allDependenciesCompleted = dependentTask.dependencies.every(depId => {
        const dep = this.tasks.get(depId) || this.taskHistory.find(h => h.id === depId);
        return dep?.status === 'completed';
      });

      if (allDependenciesCompleted) {
        await this.assignTask(dependentTask.id);
      }
    }
  }

  private async handleTaskBlocked(task: Task, blockers: string[]) {
    // Escalate blocked tasks automatically
    await swarmComms.escalate('orchestrator', {
      type: 'blocker',
      description: `Task ${task.id} is blocked: ${blockers.join(', ')}`,
      affectedTasks: [task.id],
      urgency: task.priority === 'critical' ? 'critical' : 'high'
    });
  }

  private async handleEscalation(message: SwarmMessage) {
    const { type, description, affectedTasks, urgency } = message.payload;
    
    console.log(`Escalation received: ${type} - ${description}`);
    
    // Implement escalation handling logic based on type
    switch (type) {
      case 'conflict':
        await this.resolveConflict(affectedTasks, description);
        break;
      case 'resource_constraint':
        await this.reallocateResources(affectedTasks);
        break;
      case 'decision_required':
        await this.requestConsensusDecision(description, affectedTasks);
        break;
    }
  }

  /**
   * Start the swarm orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('Swarm Orchestrator started');

    // Start task processing loop
    this.processTaskQueue();
  }

  /**
   * Stop the swarm orchestrator
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('Swarm Orchestrator stopped');
  }

  /**
   * Add a new task to the swarm
   */
  async addTask(taskData: Omit<Task, 'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const task: Task = {
      ...taskData,
      id: this.generateTaskId(),
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.tasks.set(task.id, task);
    this.taskQueue.push(task.id);

    console.log(`Task added: ${task.id} - ${task.title}`);

    // Try to assign immediately if possible
    await this.assignTask(task.id);

    return task.id;
  }

  /**
   * Assign task to appropriate team
   */
  private async assignTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return false;

    // Check dependencies
    const dependenciesCompleted = task.dependencies.every(depId => {
      const dep = this.tasks.get(depId) || this.taskHistory.find(h => h.id === depId);
      return dep?.status === 'completed';
    });

    if (!dependenciesCompleted) {
      console.log(`Task ${taskId} waiting for dependencies`);
      return false;
    }

    // Find best team for the task
    const bestTeam = this.findBestTeam(task);
    if (!bestTeam) {
      console.log(`No available team for task ${taskId}`);
      return false;
    }

    // Assign task
    task.assignedTeam = bestTeam.teamId;
    task.status = 'assigned';
    task.updatedAt = Date.now();

    // Update team capacity
    bestTeam.currentTasks++;

    // Create task assignment
    const assignment: TaskAssignment = {
      taskId: task.id,
      priority: task.priority,
      assignedTeam: bestTeam.teamId,
      deadline: task.deadline || (Date.now() + (task.estimatedEffort * 3600000)), // hours to ms
      dependencies: task.dependencies,
      description: task.description,
      acceptanceCriteria: task.acceptanceCriteria,
      estimatedEffort: task.estimatedEffort
    };

    await swarmComms.assignTask(assignment);

    console.log(`Task ${taskId} assigned to team ${bestTeam.teamId}`);
    return true;
  }

  /**
   * Find the best team for a task based on specialization and capacity
   */
  private findBestTeam(task: Task): TeamCapacity | null {
    const availableTeams = Array.from(this.teamCapacities.values())
      .filter(team => team.currentTasks < team.maxConcurrentTasks && team.availability > 0);

    if (availableTeams.length === 0) return null;

    // Score teams based on specialization match and capacity
    const teamScores = availableTeams.map(team => {
      let score = 0;

      // Specialization match
      const taskTags = task.tags || [];
      const specializationMatch = team.specializations.some(spec => 
        taskTags.includes(spec) || task.type.includes(spec)
      );
      if (specializationMatch) score += 10;

      // Capacity utilization (prefer less loaded teams)
      const utilizationRatio = team.currentTasks / team.maxConcurrentTasks;
      score += (1 - utilizationRatio) * 5;

      // Availability
      score += team.availability * 3;

      // Performance history (faster teams get bonus)
      const avgTime = team.averageCompletionTime;
      score += (50 - Math.min(avgTime, 50)) / 10; // Bonus for faster teams

      return { team, score };
    });

    // Return the highest scoring team
    teamScores.sort((a, b) => b.score - a.score);
    return teamScores[0]?.team || null;
  }

  /**
   * Process the task queue continuously
   */
  private async processTaskQueue() {
    while (this.isRunning) {
      // Process pending tasks
      const pendingTasks = this.taskQueue.filter(taskId => {
        const task = this.tasks.get(taskId);
        return task?.status === 'pending';
      });

      for (const taskId of pendingTasks) {
        await this.assignTask(taskId);
      }

      // Remove completed tasks from queue
      this.taskQueue = this.taskQueue.filter(taskId => {
        const task = this.tasks.get(taskId);
        return task && !['completed', 'failed'].includes(task.status);
      });

      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  /**
   * Get swarm metrics and performance data
   */
  getMetrics(): SwarmMetrics {
    const allTasks = [...Array.from(this.tasks.values()), ...this.taskHistory];
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const blockedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'blocked');

    const teamUtilization: Record<string, number> = {};
    this.teamCapacities.forEach((capacity, teamId) => {
      teamUtilization[teamId] = capacity.currentTasks / capacity.maxConcurrentTasks;
    });

    const completionTimes = completedTasks
      .filter(t => t.completedAt)
      .map(t => (t.completedAt! - t.createdAt) / 3600000); // Convert to hours

    const averageCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
      : 0;

    // Calculate throughput (tasks completed in last 24 hours)
    const oneDayAgo = Date.now() - (24 * 3600000);
    const recentCompletions = completedTasks.filter(t => t.completedAt! > oneDayAgo);

    return {
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      averageCompletionTime,
      throughput: recentCompletions.length,
      teamUtilization,
      successRate: allTasks.length > 0 ? completedTasks.length / allTasks.length : 0,
      blockedTasks: blockedTasks.length
    };
  }

  /**
   * Get current task status
   */
  getTaskStatus(taskId: string): Task | null {
    return this.tasks.get(taskId) || this.taskHistory.find(t => t.id === taskId) || null;
  }

  /**
   * Get all active tasks
   */
  getActiveTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => 
      !['completed', 'failed'].includes(t.status)
    );
  }

  /**
   * Resolve conflicts between teams or tasks
   */
  private async resolveConflict(affectedTasks: string[], description: string) {
    // Implement conflict resolution logic
    console.log(`Resolving conflict affecting tasks: ${affectedTasks.join(', ')}`);
    
    // For now, escalate to consensus
    await swarmComms.requestConsensus({
      proposalId: `conflict_${Date.now()}`,
      description: `Conflict Resolution: ${description}`,
      options: ['pause_conflicting_tasks', 'prioritize_critical', 'reassign_resources'],
      votes: {},
      threshold: 0.67,
      deadline: Date.now() + (2 * 3600000), // 2 hours
      requiredParticipants: ['uiux', 'backend', 'ai', 'devtools']
    });
  }

  /**
   * Reallocate resources when constrained
   */
  private async reallocateResources(affectedTasks: string[]) {
    console.log(`Reallocating resources for tasks: ${affectedTasks.join(', ')}`);
    
    // Find overloaded teams
    const overloadedTeams = Array.from(this.teamCapacities.values())
      .filter(team => team.currentTasks >= team.maxConcurrentTasks);

    // Implement resource reallocation logic
    for (const team of overloadedTeams) {
      // Temporarily increase capacity if needed
      team.maxConcurrentTasks += 1;
      console.log(`Increased capacity for team ${team.teamId}`);
    }
  }

  /**
   * Request consensus decision from teams
   */
  private async requestConsensusDecision(description: string, affectedTasks: string[]) {
    await swarmComms.requestConsensus({
      proposalId: `decision_${Date.now()}`,
      description,
      options: ['approve', 'reject', 'modify'],
      votes: {},
      threshold: 0.67,
      deadline: Date.now() + (4 * 3600000), // 4 hours
      requiredParticipants: ['uiux', 'backend', 'ai', 'devtools', 'analytics', 'qa']
    });
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const swarmOrchestrator = new SwarmOrchestrator();