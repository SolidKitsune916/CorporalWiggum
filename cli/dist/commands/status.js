/**
 * Status command - Show all running loops system-wide
 *
 * Reads from both the SQLite database and PID files to show
 * all running loops with their project, mode, runtime, cost, and status.
 */
import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { getDb, getRalphDir } from '../lib/database.js';
import { colors, tableHeader, tableRow, emptyState } from '../lib/output.js';
import { formatDuration, formatCost, formatStatus } from '../lib/format.js';
/**
 * Check if a process is alive using signal 0
 */
function isProcessAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (err) {
        const error = err;
        // EPERM means process exists but no permission - still alive
        return error.code === 'EPERM';
    }
}
/**
 * Get all active loops from database and verify their liveness
 */
function getActiveLoops() {
    const db = getDb();
    const rows = db
        .prepare(`
      SELECT id, project_id, pid, mode, started_at, current_iteration, cost_spent, state
      FROM active_sessions
      WHERE state IN ('running', 'paused')
      ORDER BY started_at DESC
    `)
        .all();
    return rows.map((row) => ({
        projectId: row.project_id,
        mode: row.mode,
        startedAt: row.started_at,
        iteration: row.current_iteration,
        costSpent: row.cost_spent,
        pid: row.pid,
        isAlive: isProcessAlive(row.pid),
    }));
}
/**
 * List all PID files to catch orphaned processes not in database
 */
async function listPidFiles() {
    const pidDir = path.join(getRalphDir(), 'pids');
    const pidFiles = [];
    try {
        const files = await fs.readdir(pidDir);
        for (const file of files) {
            if (!file.endsWith('.pid')) {
                continue;
            }
            const filePath = path.join(pidDir, file);
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const parsed = JSON.parse(content);
                if (typeof parsed.pid === 'number' &&
                    typeof parsed.projectId === 'string' &&
                    typeof parsed.mode === 'string' &&
                    typeof parsed.startedAt === 'string') {
                    pidFiles.push(parsed);
                }
            }
            catch {
                // Skip invalid PID files
            }
        }
    }
    catch (err) {
        // ENOENT is expected if PID directory doesn't exist yet
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
    return pidFiles;
}
export const statusCommand = new Command('status')
    .description('Show all running loops system-wide')
    .action(async () => {
    try {
        // Get active loops from database
        const loops = getActiveLoops();
        // Also check PID files for orphaned processes
        const pidFiles = await listPidFiles();
        // Merge: use database as primary source, add PID-only entries
        const seen = new Set(loops.map((l) => l.projectId));
        const orphans = [];
        for (const pf of pidFiles) {
            if (!seen.has(pf.projectId) && isProcessAlive(pf.pid)) {
                orphans.push({
                    projectId: pf.projectId,
                    mode: pf.mode,
                    startedAt: pf.startedAt,
                    iteration: 0,
                    costSpent: 0,
                    pid: pf.pid,
                    isAlive: true,
                });
            }
        }
        const allLoops = [...loops, ...orphans];
        if (allLoops.length === 0) {
            emptyState('No running loops', 'Start a loop from the dashboard or with ralph start <project>');
            return;
        }
        // Print table
        console.log(colors.bold('Running Loops:'));
        console.log();
        tableHeader({ text: 'PROJECT', width: 20 }, { text: 'MODE', width: 12 }, { text: 'RUNTIME', width: 12 }, { text: 'COST', width: 10 }, { text: 'STATUS', width: 10 });
        for (const loop of allLoops) {
            const statusText = formatStatus(loop.isAlive);
            const statusColor = loop.isAlive ? colors.running : colors.dead;
            tableRow({ text: loop.projectId, width: 20 }, { text: loop.mode, width: 12 }, { text: formatDuration(loop.startedAt), width: 12 }, { text: formatCost(loop.costSpent), width: 10 }, { text: loop.isAlive ? 'running' : 'dead', width: 10, color: statusColor });
        }
        // Summary
        const alive = allLoops.filter((l) => l.isAlive).length;
        const dead = allLoops.filter((l) => !l.isAlive).length;
        console.log();
        console.log(colors.dim(`${alive} running${dead > 0 ? `, ${dead} dead (run ralph cleanup to remove stale entries)` : ''}`));
    }
    catch (err) {
        console.error(colors.error(`Error: ${err.message}`));
        process.exit(1);
    }
});
//# sourceMappingURL=status.js.map