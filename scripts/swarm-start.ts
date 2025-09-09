#!/usr/bin/env ts-node

/**
 * ContextForge Swarm Startup Script
 * Initializes and starts the comprehensive hive-mind swarm system
 */

import { swarmComms } from "../lib/swarm/communication"
import { initializeContextForgeSwarm } from "../lib/swarm/initializer"
import { swarmMonitor } from "../lib/swarm/monitoring"
import { swarmOrchestrator } from "../lib/swarm/orchestrator"

async function startContextForgeSwarm() {
  console.log("🚀 ContextForge Swarm Initialization Starting...")
  console.log("=".repeat(60))

  try {
    // Initialize the swarm
    const result = await initializeContextForgeSwarm()

    if (!result.success) {
      console.error("❌ Swarm initialization failed!")
      console.error("Errors:", result.errors)
      process.exit(1)
    }

    console.log("=".repeat(60))
    console.log("✅ SWARM INITIALIZATION SUCCESSFUL!")
    console.log("=".repeat(60))

    // Display initialization results
    console.log(`🆔 Swarm ID: ${result.swarmId}`)
    console.log(`⏱️  Initialization Time: ${Date.now() - result.startTime}ms`)
    console.log(
      `🏥 Health Status: ${result.healthStatus?.overall || "Unknown"}`
    )
    console.log(
      `🧩 Components Initialized: ${result.componentsInitialized.length}`
    )

    console.log("\n📊 SWARM COMPONENTS STATUS:")
    result.componentsInitialized.forEach((component, index) => {
      console.log(`   ${index + 1}. ✅ ${component}`)
    })

    // Display team overview
    console.log("\n🏢 TEAM STRUCTURE:")
    console.log("   📱 UI/UX Team: Dashboard transformation & user experience")
    console.log(
      "   🔧 Backend Team: Real-time processing & system architecture"
    )
    console.log("   🤖 AI Team: Context optimization & model integration")
    console.log("   🛠️  DevTools Team: CLI, API & developer integration")
    console.log("   📈 Analytics Team: Insights, metrics & recommendations")
    console.log("   🔍 QA Team: Testing, validation & quality assurance")

    // Display initial metrics
    console.log("\n📊 INITIAL METRICS:")
    const metrics = swarmOrchestrator.getMetrics()
    console.log(`   📋 Total Tasks: ${metrics.totalTasks}`)
    console.log(`   ✅ Completed Tasks: ${metrics.completedTasks}`)
    console.log(`   🚧 Blocked Tasks: ${metrics.blockedTasks}`)
    console.log(
      `   📈 Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`
    )
    console.log(`   ⚡ Throughput: ${metrics.throughput} tasks/day`)

    // Display team utilization
    console.log("\n👥 TEAM UTILIZATION:")
    Object.entries(metrics.teamUtilization).forEach(([team, utilization]) => {
      const percentage = (utilization * 100).toFixed(1)
      const bar =
        "█".repeat(Math.floor(utilization * 20)) +
        "░".repeat(20 - Math.floor(utilization * 20))
      console.log(`   ${team.padEnd(10)}: [${bar}] ${percentage}%`)
    })

    // Display active tasks
    const activeTasks = swarmOrchestrator.getActiveTasks()
    console.log(`\n📋 ACTIVE TASKS (${activeTasks.length}):`)
    activeTasks.slice(0, 5).forEach((task, index) => {
      const statusIcon =
        {
          pending: "⏳",
          assigned: "📌",
          in_progress: "🔄",
          blocked: "🚫",
          completed: "✅",
          failed: "❌",
        }[task.status] || "❓"

      console.log(`   ${index + 1}. ${statusIcon} ${task.title}`)
      console.log(
        `      Priority: ${task.priority} | Team: ${
          task.assignedTeam || "Unassigned"
        }`
      )
    })

    if (activeTasks.length > 5) {
      console.log(`   ... and ${activeTasks.length - 5} more tasks`)
    }

    // Display health status
    if (result.healthStatus) {
      console.log("\n🏥 SYSTEM HEALTH:")
      console.log(
        `   Overall: ${getHealthIcon(result.healthStatus.overall)} ${
          result.healthStatus.overall
        }`
      )
      console.log(
        `   Communication: ${getHealthIcon(
          result.healthStatus.components.communication
        )} ${result.healthStatus.components.communication}`
      )
      console.log(
        `   Orchestration: ${getHealthIcon(
          result.healthStatus.components.orchestration
        )} ${result.healthStatus.components.orchestration}`
      )
      console.log(
        `   Resources: ${getHealthIcon(
          result.healthStatus.components.resources
        )} ${result.healthStatus.components.resources}`
      )

      if (result.healthStatus.issues.length > 0) {
        console.log("\n⚠️  ISSUES DETECTED:")
        result.healthStatus.issues.forEach((issue: any, index: number) => {
          const severityIcon =
            {
              low: "💙",
              medium: "💛",
              high: "🧡",
              critical: "❤️",
            }[issue.severity] || "❓"

          console.log(
            `   ${
              index + 1
            }. ${severityIcon} [${issue.severity.toUpperCase()}] ${
              issue.description
            }`
          )
        })
      }
    }

    // Display success metrics targets
    console.log("\n🎯 SUCCESS METRICS TARGETS:")
    console.log("   🚀 Context Assembly Time: 50% reduction")
    console.log("   😊 User Satisfaction: 80% with AI features")
    console.log("   📅 Usage Pattern: Daily active usage")
    console.log("   ⚡ Concurrent Jobs: Support 100+ optimization jobs")

    // Display communication status
    const commHealth = swarmComms.healthCheck()
    console.log("\n📡 COMMUNICATION STATUS:")
    console.log(
      `   Status: ${getHealthIcon(commHealth.status)} ${commHealth.status}`
    )
    console.log(`   Messages: ${commHealth.metrics.totalMessages}`)
    console.log(`   Subscribers: ${commHealth.metrics.subscriberCount}`)
    console.log(`   Queue Size: ${commHealth.metrics.queueSize}`)

    // Display monitoring status
    const monitoringStats = swarmMonitor.getMonitoringStats()
    console.log("\n📊 MONITORING STATUS:")
    console.log(`   Metrics Collected: ${monitoringStats.metricsCollected}`)
    console.log(
      `   Feedback Loops Active: ${monitoringStats.feedbackLoopsActive}`
    )
    console.log(`   Alerts Triggered: ${monitoringStats.alertsTriggered}`)

    console.log("\n" + "=".repeat(60))
    console.log("🎉 CONTEXTFORGE SWARM IS NOW OPERATIONAL!")
    console.log("=".repeat(60))

    console.log("\n🎮 NEXT STEPS:")
    console.log("   1. Monitor swarm dashboard for real-time updates")
    console.log("   2. Review task assignments and progress")
    console.log("   3. Check system health and performance metrics")
    console.log("   4. Observe AI-driven optimizations in action")
    console.log("   5. Track progress toward success metrics")

    console.log("\n💡 USEFUL COMMANDS:")
    console.log("   - View swarm status: pnpm run swarm:status")
    console.log("   - Monitor metrics: pnpm run swarm:metrics")
    console.log("   - Health check: pnpm run swarm:health")
    console.log("   - Stop swarm: pnpm run swarm:stop")

    // Setup graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n🔄 Graceful shutdown initiated...")
      await gracefulShutdown()
      process.exit(0)
    })

    process.on("SIGTERM", async () => {
      console.log("\n🔄 Graceful shutdown initiated...")
      await gracefulShutdown()
      process.exit(0)
    })

    // Keep the process running
    console.log("\n🎯 Swarm is running... Press Ctrl+C to stop")

    // Start periodic status updates
    setInterval(async () => {
      await displayPeriodicUpdate()
    }, 300000) // Every 5 minutes
  } catch (error) {
    console.error("💥 Fatal error during swarm initialization:", error)
    process.exit(1)
  }
}

/**
 * Get health status icon
 */
function getHealthIcon(status: string): string {
  switch (status) {
    case "healthy":
      return "💚"
    case "degraded":
      return "💛"
    case "critical":
      return "❤️"
    default:
      return "❓"
  }
}

/**
 * Display periodic status update
 */
async function displayPeriodicUpdate() {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`\n⏰ ${timestamp} - Swarm Status Update:`)

  const metrics = swarmOrchestrator.getMetrics()
  const health = await swarmMonitor.checkHealth()
  const commHealth = swarmComms.healthCheck()

  console.log(
    `   Tasks: ${metrics.totalTasks} total, ${metrics.completedTasks} completed, ${metrics.blockedTasks} blocked`
  )
  console.log(`   Health: ${getHealthIcon(health.overall)} ${health.overall}`)
  console.log(
    `   Communication: ${commHealth.metrics.queueSize} messages in queue`
  )

  if (health.issues.length > 0) {
    console.log(`   Issues: ${health.issues.length} detected`)
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown() {
  try {
    console.log("🔄 Stopping monitoring system...")
    await swarmMonitor.stopMonitoring()

    console.log("🔄 Stopping orchestrator...")
    await swarmOrchestrator.stop()

    console.log("✅ Swarm shutdown completed successfully")
  } catch (error) {
    console.error("❌ Error during shutdown:", error)
  }
}

// Start the swarm if this script is run directly
if (require.main === module) {
  startContextForgeSwarm().catch((error) => {
    console.error("💥 Failed to start ContextForge swarm:", error)
    process.exit(1)
  })
}

export { gracefulShutdown, startContextForgeSwarm }
