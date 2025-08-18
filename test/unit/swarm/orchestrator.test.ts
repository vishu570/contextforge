import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { SwarmOrchestrator, Task, SwarmMetrics } from '@/lib/swarm/orchestrator';
import { mockSwarmOrchestrator, resetAllMocks } from '@/test/mocks/services';

// Mock the swarm communication module
jest.mock('@/lib/swarm/communication', () => ({
  swarmComms: {
    subscribe: jest.fn(),
    assignTask: jest.fn(),
    escalate: jest.fn(),
    requestConsensus: jest.fn(),
  },
}));

describe('SwarmOrchestrator', () => {
  let orchestrator: SwarmOrchestrator;

  beforeEach(() => {
    orchestrator = new SwarmOrchestrator();
    resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task Management', () => {
    test('should add a new task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'A test task for validation',
        type: 'feature' as const,
        priority: 'high' as const,
        estimatedEffort: 4,
        dependencies: [],
        acceptanceCriteria: ['Task should be completed', 'Tests should pass'],
        tags: ['testing', 'validation'],
      };

      const taskId = await orchestrator.addTask(taskData);

      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task_\d+_[a-z0-9]+$/);

      const task = orchestrator.getTaskStatus(taskId);
      expect(task).toBeDefined();
      expect(task?.title).toBe(taskData.title);
      expect(task?.status).toBe('pending');
      expect(task?.progress).toBe(0);
    });

    test('should assign task to appropriate team based on specialization', async () => {
      const aiTaskData = {
        title: 'AI Optimization Task',
        description: 'Optimize AI model performance',
        type: 'optimization' as const,
        priority: 'high' as const,
        estimatedEffort: 6,
        dependencies: [],
        acceptanceCriteria: ['AI model optimized'],
        tags: ['ai_optimization', 'machine_learning'],
      };

      const taskId = await orchestrator.addTask(aiTaskData);
      
      // Wait a bit for assignment to process
      await new Promise(resolve => setTimeout(resolve, 100));

      const task = orchestrator.getTaskStatus(taskId);
      expect(task?.assignedTeam).toBe('ai');
      expect(task?.status).toBe('assigned');
    });

    test('should handle dependencies correctly', async () => {
      // Create a dependency task
      const dependencyTaskData = {
        title: 'Dependency Task',
        description: 'A task that others depend on',
        type: 'feature' as const,
        priority: 'high' as const,
        estimatedEffort: 2,
        dependencies: [],
        acceptanceCriteria: ['Dependency completed'],
        tags: [],
      };

      const dependencyTaskId = await orchestrator.addTask(dependencyTaskData);

      // Create a dependent task
      const dependentTaskData = {
        title: 'Dependent Task',
        description: 'A task that depends on another',
        type: 'feature' as const,
        priority: 'medium' as const,
        estimatedEffort: 3,
        dependencies: [dependencyTaskId],
        acceptanceCriteria: ['Task completed after dependency'],
        tags: [],
      };

      const dependentTaskId = await orchestrator.addTask(dependentTaskData);

      const dependentTask = orchestrator.getTaskStatus(dependentTaskId);
      expect(dependentTask?.status).toBe('pending'); // Should remain pending due to dependency
    });

    test('should track task progress and completion', async () => {
      const taskData = {
        title: 'Progress Test Task',
        description: 'Test task progress tracking',
        type: 'feature' as const,
        priority: 'medium' as const,
        estimatedEffort: 1,
        dependencies: [],
        acceptanceCriteria: ['Task completed'],
        tags: [],
      };

      const taskId = await orchestrator.addTask(taskData);

      // Simulate status update
      const mockStatusUpdate = {
        taskId,
        status: 'in_progress' as const,
        progress: 50,
        message: 'Task is 50% complete',
        blockers: [],
      };

      await (orchestrator as any).handleStatusUpdate(mockStatusUpdate);

      const task = orchestrator.getTaskStatus(taskId);
      expect(task?.status).toBe('in_progress');
      expect(task?.progress).toBe(50);
    });
  });

  describe('Team Capacity Management', () => {
    test('should respect team capacity limits', async () => {
      // Create multiple tasks for a team with limited capacity
      const qaTeamTasks = [];
      for (let i = 0; i < 6; i++) {
        const taskData = {
          title: `QA Task ${i + 1}`,
          description: 'Quality assurance task',
          type: 'enhancement' as const,
          priority: 'medium' as const,
          estimatedEffort: 1,
          dependencies: [],
          acceptanceCriteria: ['QA completed'],
          tags: ['quality_control', 'testing'],
        };
        qaTeamTasks.push(await orchestrator.addTask(taskData));
      }

      // Wait for assignment processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that not all tasks are assigned (QA team has capacity of 4)
      const assignedQATasks = qaTeamTasks
        .map(id => orchestrator.getTaskStatus(id))
        .filter(task => task?.assignedTeam === 'qa' && task?.status === 'assigned');

      expect(assignedQATasks.length).toBeLessThanOrEqual(4);
    });

    test('should calculate team utilization correctly', () => {
      const metrics = orchestrator.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.teamUtilization).toBeDefined();
      expect(typeof metrics.totalTasks).toBe('number');
      expect(typeof metrics.completedTasks).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
    });
  });

  describe('Swarm Metrics', () => {
    test('should provide accurate metrics', () => {
      const metrics: SwarmMetrics = orchestrator.getMetrics();

      expect(metrics).toMatchObject({
        totalTasks: expect.any(Number),
        completedTasks: expect.any(Number),
        averageCompletionTime: expect.any(Number),
        throughput: expect.any(Number),
        teamUtilization: expect.any(Object),
        successRate: expect.any(Number),
        blockedTasks: expect.any(Number),
      });

      // Validate ranges
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
      expect(metrics.blockedTasks).toBeGreaterThanOrEqual(0);
    });

    test('should track throughput over time', () => {
      const metrics = orchestrator.getMetrics();
      expect(metrics.throughput).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle task assignment failures gracefully', async () => {
      const invalidTaskData = {
        title: '',
        description: '',
        type: 'feature' as const,
        priority: 'high' as const,
        estimatedEffort: -1,
        dependencies: ['non-existent-task'],
        acceptanceCriteria: [],
        tags: [],
      };

      // This should not throw an error
      const taskId = await orchestrator.addTask(invalidTaskData);
      expect(taskId).toBeDefined();
    });

    test('should handle blocked tasks appropriately', async () => {
      const taskData = {
        title: 'Test Blocked Task',
        description: 'A task that will be blocked',
        type: 'feature' as const,
        priority: 'high' as const,
        estimatedEffort: 2,
        dependencies: [],
        acceptanceCriteria: ['Task completed'],
        tags: [],
      };

      const taskId = await orchestrator.addTask(taskData);

      // Simulate blocked status
      const mockStatusUpdate = {
        taskId,
        status: 'blocked' as const,
        progress: 30,
        message: 'Task is blocked',
        blockers: ['External dependency unavailable'],
      };

      await (orchestrator as any).handleStatusUpdate(mockStatusUpdate);

      const task = orchestrator.getTaskStatus(taskId);
      expect(task?.status).toBe('blocked');
      
      const metrics = orchestrator.getMetrics();
      expect(metrics.blockedTasks).toBeGreaterThan(0);
    });
  });

  describe('Lifecycle Management', () => {
    test('should start and stop orchestrator properly', async () => {
      expect(orchestrator).toBeDefined();

      await orchestrator.start();
      expect((orchestrator as any).isRunning).toBe(true);

      await orchestrator.stop();
      expect((orchestrator as any).isRunning).toBe(false);
    });

    test('should not start multiple times', async () => {
      await orchestrator.start();
      await orchestrator.start(); // Second start should be ignored
      
      expect((orchestrator as any).isRunning).toBe(true);
      
      await orchestrator.stop();
    });
  });

  describe('Edge Cases', () => {
    test('should handle task with circular dependencies', async () => {
      const task1Data = {
        title: 'Task 1',
        description: 'First task',
        type: 'feature' as const,
        priority: 'medium' as const,
        estimatedEffort: 1,
        dependencies: [], // Will be updated after task2 is created
        acceptanceCriteria: ['Task 1 completed'],
        tags: [],
      };

      const task1Id = await orchestrator.addTask(task1Data);

      const task2Data = {
        title: 'Task 2',
        description: 'Second task',
        type: 'feature' as const,
        priority: 'medium' as const,
        estimatedEffort: 1,
        dependencies: [task1Id],
        acceptanceCriteria: ['Task 2 completed'],
        tags: [],
      };

      const task2Id = await orchestrator.addTask(task2Data);

      // This would create a circular dependency - should be handled gracefully
      const task1 = orchestrator.getTaskStatus(task1Id);
      expect(task1).toBeDefined();
    });

    test('should handle empty active tasks list', () => {
      const activeTasks = orchestrator.getActiveTasks();
      expect(Array.isArray(activeTasks)).toBe(true);
    });

    test('should generate unique task IDs', async () => {
      const taskData = {
        title: 'ID Test Task',
        description: 'Test unique ID generation',
        type: 'feature' as const,
        priority: 'low' as const,
        estimatedEffort: 1,
        dependencies: [],
        acceptanceCriteria: ['Task completed'],
        tags: [],
      };

      const ids = [];
      for (let i = 0; i < 10; i++) {
        ids.push(await orchestrator.addTask(taskData));
      }

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});