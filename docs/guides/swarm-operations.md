# Swarm & Queue Operations

ContextForge ships a hierarchical swarm that coordinates background agents and queue workers. Use this guide when you need to start, inspect, or extend those services.

## Swarm Topology
- **Orchestrator** (`lib/swarm/orchestrator.ts`) assigns work and manages lifecycle events.
- **Specialized Teams** mirror the entries in `swarm-config.json` (`uiux`, `backend`, `ai`, `devtools`, `analytics`, `qa`). Adjust `agentCount` values when you need more concurrency per discipline.
- **Communication Layer** (`lib/swarm/communication.ts`) implements message passing hooks.
- **Monitoring** (`lib/swarm/monitoring.ts`) feeds the metrics emitted by the commands below.

## Swarm Lifecycle Commands
Scripts live in `scripts/swarm-*.ts` and are exposed through pnpm:

```bash
pnpm swarm:start   # Launch orchestrator + agents defined in swarm-config.json
pnpm swarm:status  # Print health checks and active agents
pnpm swarm:metrics # Emit throughput and latency metrics
pnpm swarm:health  # Deep diagnostics for stuck workers
pnpm swarm:stop    # Graceful shutdown of the swarm processes
```

These scripts assume your `.env` contains the same Redis and database settings as the web app. When running locally, start Redis before the swarm (Docker compose ships a service at `localhost:6379`).

### Programmatic Control
Add tasks or feedback loops inside TypeScript code when bootstrapping automation:

```ts
import { swarmOrchestrator } from '@/lib/swarm/orchestrator';

await swarmOrchestrator.addTask({
  title: 'Optimize prompt import flow',
  description: 'Align imports with new pipeline controller',
  type: 'feature',
  priority: 'high',
  estimatedEffort: 8,
  acceptanceCriteria: ['Batch import succeeds', 'Progress UI updates'],
});
```

Hook into monitoring when you need custom alerts:

```ts
import { swarmMonitor } from '@/lib/swarm/monitoring';

swarmMonitor.addFeedbackLoop({
  id: 'imports-latency',
  name: 'Import latency guard',
  trigger: 'threshold',
  condition: { metric: 'importLatency', operator: '>', value: 5_000 },
  actions: [{ type: 'alert', parameters: { severity: 'high', message: 'Slow imports detected' } }],
  enabled: true,
});
```

## Queue Administration
Background work relies on Bull queues located in `lib/queue/` and `scripts/`. Use the helper commands to keep them clean:

```bash
pnpm queue:status  # Inspect queue depth, failed jobs, and processing rates
pnpm queue:clear   # Remove stalled jobs (prompts for confirmation)
```

Clear queues before restarting the swarm if jobs are stuck in an inconsistent state.

## Configuration File
`swarm-config.json` defines team names, agent counts, and specializations. Key fields:
- `swarm.name` — Logical cluster name used in logs.
- `swarm.maxAgents` — Hard cap enforced by the orchestrator.
- `teams.*.agentCount` — Desired concurrency per specialization.

Update this file in the repository when changing staffing assumptions and commit the change alongside any code relying on it.

## Operational Checklist
1. **Before starting**: Verify Redis and database services are available.
2. **During runs**: Monitor the console output or attach to the logging stream specified in `scripts/swarm-start.ts`.
3. **After stopping**: Run `pnpm queue:status` to ensure no orphaned jobs remain and call `pnpm queue:clear` only if safe.
4. **Incidents**: Document unexpected behavior in the issue tracker with timestamps and log snippets.
5. **Metrics targets**: Maintain steady throughput (50% faster context assembly) and high satisfaction scores as outlined in the success metrics tracked by monitoring.

Treat automation scripts as production components—test modifications in a non-production environment and capture learnings in the documentation when behavior changes.
