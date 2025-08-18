/**
 * Swarm Communication Layer
 * Handles inter-agent communication, message passing, and coordination protocols
 */

export interface SwarmMessage {
  id: string;
  timestamp: number;
  from: string;
  to: string | string[];
  type: 'task_assignment' | 'status_update' | 'consensus_request' | 'broadcast' | 'escalation';
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresResponse?: boolean;
  correlationId?: string;
}

export interface TaskAssignment {
  taskId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTeam: string;
  assignedAgent?: string;
  deadline: number;
  dependencies: string[];
  description: string;
  acceptanceCriteria: string[];
  estimatedEffort: number;
}

export interface StatusUpdate {
  taskId: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'failed';
  progress: number; // 0-100
  blockers: string[];
  eta: number;
  completedSubtasks: string[];
  nextSteps: string[];
}

export interface ConsensusRequest {
  proposalId: string;
  description: string;
  options: string[];
  votes: Record<string, string>;
  threshold: number;
  deadline: number;
  requiredParticipants: string[];
}

export class SwarmCommunicationHub {
  private channels: Map<string, Set<string>> = new Map();
  private messageQueue: SwarmMessage[] = [];
  private subscribers: Map<string, Array<(message: SwarmMessage) => void>> = new Map();
  private activeConsensus: Map<string, ConsensusRequest> = new Map();

  constructor() {
    this.initializeChannels();
  }

  private initializeChannels() {
    // Initialize communication channels
    this.channels.set('broadcast', new Set(['orchestrator', 'uiux', 'backend', 'ai', 'devtools', 'analytics', 'qa']));
    this.channels.set('cross-team', new Set());
    this.channels.set('escalation', new Set(['orchestrator']));
    
    // Team-specific channels
    this.channels.set('uiux-backend', new Set(['uiux', 'backend']));
    this.channels.set('backend-ai', new Set(['backend', 'ai']));
    this.channels.set('ai-analytics', new Set(['ai', 'analytics']));
    this.channels.set('devtools-backend', new Set(['devtools', 'backend']));
    this.channels.set('qa-all', new Set(['qa', 'uiux', 'backend', 'ai', 'devtools', 'analytics']));
  }

  /**
   * Send a message to specific agents or teams
   */
  async sendMessage(message: Omit<SwarmMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: SwarmMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now()
    };

    this.messageQueue.push(fullMessage);
    await this.routeMessage(fullMessage);
    
    return fullMessage.id;
  }

  /**
   * Subscribe to messages for a specific agent
   */
  subscribe(agentId: string, callback: (message: SwarmMessage) => void) {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, []);
    }
    this.subscribers.get(agentId)!.push(callback);
  }

  /**
   * Assign a task to a team or agent
   */
  async assignTask(task: TaskAssignment): Promise<string> {
    const messageId = await this.sendMessage({
      from: 'orchestrator',
      to: task.assignedTeam,
      type: 'task_assignment',
      payload: task,
      priority: task.priority,
      requiresResponse: true
    });

    return messageId;
  }

  /**
   * Send status update for a task
   */
  async updateTaskStatus(agentId: string, update: StatusUpdate): Promise<void> {
    await this.sendMessage({
      from: agentId,
      to: 'orchestrator',
      type: 'status_update',
      payload: update,
      priority: 'medium'
    });

    // Notify dependent teams if task is completed or blocked
    if (update.status === 'completed' || update.status === 'blocked') {
      await this.sendMessage({
        from: agentId,
        to: 'broadcast',
        type: 'broadcast',
        payload: {
          event: 'task_status_change',
          taskId: update.taskId,
          status: update.status,
          impact: update.status === 'blocked' ? update.blockers : 'task_completed'
        },
        priority: update.status === 'blocked' ? 'high' : 'medium'
      });
    }
  }

  /**
   * Initiate consensus decision making
   */
  async requestConsensus(request: ConsensusRequest): Promise<string> {
    this.activeConsensus.set(request.proposalId, request);

    const messageId = await this.sendMessage({
      from: 'orchestrator',
      to: request.requiredParticipants,
      type: 'consensus_request',
      payload: request,
      priority: 'high',
      requiresResponse: true
    });

    // Set timeout for consensus
    setTimeout(() => {
      this.finalizeConsensus(request.proposalId);
    }, request.deadline - Date.now());

    return messageId;
  }

  /**
   * Submit vote for consensus
   */
  async submitVote(proposalId: string, agentId: string, vote: string): Promise<boolean> {
    const consensus = this.activeConsensus.get(proposalId);
    if (!consensus) {
      throw new Error(`Consensus proposal ${proposalId} not found`);
    }

    consensus.votes[agentId] = vote;

    // Check if we have enough votes to reach consensus
    const totalVotes = Object.keys(consensus.votes).length;
    const requiredVotes = Math.ceil(consensus.requiredParticipants.length * consensus.threshold);

    if (totalVotes >= requiredVotes) {
      return await this.finalizeConsensus(proposalId);
    }

    return false;
  }

  /**
   * Finalize consensus decision
   */
  private async finalizeConsensus(proposalId: string): Promise<boolean> {
    const consensus = this.activeConsensus.get(proposalId);
    if (!consensus) return false;

    // Count votes
    const voteCounts: Record<string, number> = {};
    Object.values(consensus.votes).forEach(vote => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    });

    // Determine winner
    const winner = Object.entries(voteCounts).reduce((a, b) => 
      voteCounts[a[0]] > voteCounts[b[0]] ? a : b
    )[0];

    const totalVotes = Object.keys(consensus.votes).length;
    const winnerVotes = voteCounts[winner] || 0;
    const consensusReached = winnerVotes >= Math.ceil(totalVotes * consensus.threshold);

    // Broadcast result
    await this.sendMessage({
      from: 'orchestrator',
      to: 'broadcast',
      type: 'broadcast',
      payload: {
        event: 'consensus_finalized',
        proposalId,
        decision: consensusReached ? winner : 'no_consensus',
        votes: consensus.votes,
        consensusReached
      },
      priority: 'high'
    });

    this.activeConsensus.delete(proposalId);
    return consensusReached;
  }

  /**
   * Escalate issue to orchestrator
   */
  async escalate(agentId: string, issue: {
    type: 'conflict' | 'blocker' | 'resource_constraint' | 'decision_required';
    description: string;
    affectedTasks: string[];
    suggestedResolution?: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<string> {
    return await this.sendMessage({
      from: agentId,
      to: 'orchestrator',
      type: 'escalation',
      payload: issue,
      priority: issue.urgency === 'critical' ? 'critical' : 'high',
      requiresResponse: true
    });
  }

  /**
   * Route message to appropriate subscribers
   */
  private async routeMessage(message: SwarmMessage): Promise<void> {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    
    for (const recipient of recipients) {
      // Check if recipient is a channel
      if (this.channels.has(recipient)) {
        const channelMembers = this.channels.get(recipient)!;
        for (const member of channelMembers) {
          await this.deliverMessage(member, message);
        }
      } else {
        // Direct delivery to agent
        await this.deliverMessage(recipient, message);
      }
    }
  }

  /**
   * Deliver message to specific agent
   */
  private async deliverMessage(agentId: string, message: SwarmMessage): Promise<void> {
    const callbacks = this.subscribers.get(agentId) || [];
    
    for (const callback of callbacks) {
      try {
        await callback(message);
      } catch (error) {
        console.error(`Error delivering message to agent ${agentId}:`, error);
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get message history for debugging
   */
  getMessageHistory(limit: number = 100): SwarmMessage[] {
    return this.messageQueue.slice(-limit);
  }

  /**
   * Get active consensus requests
   */
  getActiveConsensus(): ConsensusRequest[] {
    return Array.from(this.activeConsensus.values());
  }

  /**
   * Health check for communication system
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      totalMessages: number;
      activeConsensus: number;
      subscriberCount: number;
      queueSize: number;
    };
  } {
    const metrics = {
      totalMessages: this.messageQueue.length,
      activeConsensus: this.activeConsensus.size,
      subscriberCount: Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.length, 0),
      queueSize: this.messageQueue.length
    };

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (metrics.queueSize > 1000) status = 'degraded';
    if (metrics.queueSize > 5000 || metrics.subscriberCount === 0) status = 'unhealthy';

    return { status, metrics };
  }
}

// Singleton instance
export const swarmComms = new SwarmCommunicationHub();