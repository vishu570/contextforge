// GitHub import progress tracking
export type ProgressStatus =
  | "starting"
  | "scanning"
  | "processing"
  | "completed"
  | "failed"

export interface ImportProgress {
  status: ProgressStatus
  progress: number
  message: string
  totalFiles: number
  processedFiles: number
  currentFile?: string
  errors: string[]
}

// Ensure we reuse a single in-memory store across hot reloads/workers
const globalForProgress = globalThis as unknown as {
  __importProgressStore?: Map<string, ImportProgress>
  __importProgressSubscribers?: Map<
    string,
    Set<(progress: ImportProgress) => void>
  >
}

// Store for tracking import progress
const progressStore =
  globalForProgress.__importProgressStore || new Map<string, ImportProgress>()
globalForProgress.__importProgressStore = progressStore

// Subscribers receive updates whenever progress changes
const progressSubscribers =
  globalForProgress.__importProgressSubscribers ||
  new Map<string, Set<(progress: ImportProgress) => void>>()
globalForProgress.__importProgressSubscribers = progressSubscribers

// Export the store for debugging (read-only access)
export { progressStore }

export type ProgressSubscriber = (progress: ImportProgress) => void

// Helper function to update progress
export function updateProgress(
  importId: string,
  update: Partial<ImportProgress>
): void {
  const current = progressStore.get(importId) || {
    status: "starting" as const,
    progress: 0,
    message: "Starting import...",
    totalFiles: 0,
    processedFiles: 0,
    errors: [],
  }

  const updated = { ...current, ...update }
  progressStore.set(importId, updated)

  // Debug logging
  console.log(`Progress update for ${importId}:`, {
    progress: updated.progress,
    message: updated.message,
    currentFile: updated.currentFile,
  })

  const subscribers = progressSubscribers.get(importId)
  if (subscribers) {
    subscribers.forEach(callback => {
      try {
        callback(updated)
      } catch (error) {
        console.error(
          `Progress subscriber for ${importId} threw an error:`,
          error
        )
      }
    })
  }

  // Clean up completed/failed imports after 5 minutes
  if (updated.status === "completed" || updated.status === "failed") {
    setTimeout(() => {
      progressStore.delete(importId)
      progressSubscribers.delete(importId)
    }, 5 * 60 * 1000)
  }
}

// Get progress for an import
export function getProgress(importId: string): ImportProgress | undefined {
  return progressStore.get(importId)
}

// Clear progress for an import
export function clearProgress(importId: string): void {
  progressStore.delete(importId)
  progressSubscribers.delete(importId)
}

// Subscribe to progress updates for an import. Returns an unsubscribe function.
export function subscribeToProgress(
  importId: string,
  callback: ProgressSubscriber
): () => void {
  let subscribers = progressSubscribers.get(importId)
  if (!subscribers) {
    subscribers = new Set()
    progressSubscribers.set(importId, subscribers)
  }

  subscribers.add(callback)

  return () => {
    const currentSubscribers = progressSubscribers.get(importId)
    if (!currentSubscribers) return
    currentSubscribers.delete(callback)
    if (currentSubscribers.size === 0) {
      progressSubscribers.delete(importId)
    }
  }
}
