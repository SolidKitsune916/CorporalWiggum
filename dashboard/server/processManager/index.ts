/**
 * Process Manager Module
 *
 * Provides central process tracking for all running loops across projects.
 * Combines database persistence (SessionRepository) with PID files for
 * reliable tracking that survives dashboard restarts.
 */

export { PidFileManager, type PidFileContent } from './PidFileManager.js';
export {
  ProcessRegistry,
  getProcessRegistry,
  type ActiveLoopInfo,
  type OrphanInfo,
} from './ProcessRegistry.js';
export { GracefulShutdown, type StopResult } from './GracefulShutdown.js';
export {
  OrphanDetector,
  type OrphanedLoop,
  type OrphanDetectionResult,
} from './OrphanDetector.js';
