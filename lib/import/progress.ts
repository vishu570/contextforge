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

// Store for tracking import progress
const progressStore = new Map<string, ImportProgress>()

// Export the store for debugging (read-only access)
export { progressStore }

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

  // Clean up completed/failed imports after 5 minutes
  if (updated.status === "completed" || updated.status === "failed") {
    setTimeout(() => {
      progressStore.delete(importId)
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
}
