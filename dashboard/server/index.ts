import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { FileWatcher } from './fileWatcher.js';
import { LoopController } from './loopController.js';
import { ProjectConfigManager } from './projectConfig.js';
import { PlanGenerator } from './planGenerator.js';
import { PRDGenerator } from './prdGenerator.js';
import { ProjectScanner } from './projectScanner.js';
import { detectProjectRoot, formatProjectInfo, type ProjectRootResult } from './projectRootDetector.js';
import { checkAllDependencies } from './dependencyChecker.js';
import { ProjectRegistry } from './projectRegistry.js';
import { InstanceSpawner } from './instanceSpawner.js';
import { ProjectDiscovery } from './projectDiscovery.js';
import { ReviewRunner } from './reviewRunner.js';
import { ReviewGenerator } from './reviewGenerator.js';
import { TemplateManager, type TemplateName } from './templateManager.js';
import { scanPorts, killProcess } from './portScanner.js';
import { LogManager } from './logManager.js';
import { TroubleshootRunner } from './troubleshootService.js';
import { StoriesGenerator } from './storiesGenerator.js';
import { IterativePrdGenerator } from './iterativePrdGenerator.js';
import * as ExternalRepos from './externalRepos/index.js';
import { validateGitHubToken, setGitHubToken } from './externalRepos/mcpConfigManager.js';
import { RalphDatabase } from './database/index.js';
import { getSessionRepository } from './database/repositories/SessionRepository.js';
import { getProjectRepository } from './database/repositories/ProjectRepository.js';
import { getHealthMonitor } from './healthMonitor.js';
import { OrphanDetector, PidFileManager, type OrphanedLoop } from './processManager/index.js';
import { logger } from './lib/logger.js';
import { metrics, METRICS } from './lib/metrics.js';
import { sendAlert } from './lib/alerts.js';
import { initSentry, captureError, flush as flushSentry } from './lib/sentry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect project root (async initialization)
const RALPH_DEFAULT_PATH = path.resolve(__dirname, '../..');

// Browse directory helper - returns directory entries with metadata
interface BrowseEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isGitRepo: boolean;
  isRalphReady: boolean;
}

async function browseDirectory(dirPath: string): Promise<BrowseEntry[]> {
  const entries: BrowseEntry[] = [];

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      // Skip hidden files/folders (starting with .)
      if (item.name.startsWith('.')) continue;

      // Only include directories (Task 88: Filter to show only directories)
      if (!item.isDirectory()) continue;

      const fullPath = path.join(dirPath, item.name);

      // Check if it's a git repo
      let isGitRepo = false;
      try {
        await fs.access(path.join(fullPath, '.git'));
        isGitRepo = true;
      } catch {
        // Not a git repo
      }

      // Check if it's Ralph-ready (has AGENTS.md and/or CLAUDE.md)
      let isRalphReady = false;
      try {
        const [hasAgents, hasClaude] = await Promise.all([
          fs.access(path.join(fullPath, 'AGENTS.md')).then(() => true).catch(() => false),
          fs.access(path.join(fullPath, 'CLAUDE.md')).then(() => true).catch(() => false),
        ]);
        isRalphReady = hasAgents || hasClaude;
      } catch {
        // Error checking, not Ralph-ready
      }

      entries.push({
        name: item.name,
        path: fullPath,
        isDirectory: true,
        isGitRepo,
        isRalphReady,
      });
    }

    // Sort: Ralph-ready first, then git repos, then alphabetically
    entries.sort((a, b) => {
      if (a.isRalphReady !== b.isRalphReady) return a.isRalphReady ? -1 : 1;
      if (a.isGitRepo !== b.isGitRepo) return a.isGitRepo ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  } catch (err) {
    logger.error(`Error reading directory ${dirPath}`, { error: err instanceof Error ? err.message : 'Unknown error' });
    throw err;
  }

  return entries;
}

// Initialize project detection and return paths
async function initializeProjectPaths(): Promise<ProjectRootResult> {
  // Allow explicit override via environment
  if (process.env.PROJECT_PATH) {
    return {
      targetProjectPath: process.env.PROJECT_PATH,
      ralphPath: RALPH_DEFAULT_PATH,
      mode: 'embedded',
      detectionReason: 'Explicitly set via PROJECT_PATH environment variable',
    };
  }
  return detectProjectRoot(RALPH_DEFAULT_PATH);
}

// Start server after initialization
async function startServer() {
  // Initialize Sentry early
  initSentry();

  const projectRoot = await initializeProjectPaths();
  const TARGET_PROJECT_PATH = projectRoot.targetProjectPath;
  const RALPH_PATH = projectRoot.ralphPath;

  logger.info('Project paths initialized', { projectRoot: formatProjectInfo(projectRoot) });

  // Initialize SQLite database
  logger.info('Initializing database...');
  RalphDatabase.getInstance();
  logger.info('Database initialized', { path: RalphDatabase.getDatabasePath() });

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(cors());
  app.use(express.json());

  // Initialize services with appropriate paths
  const projectConfig = new ProjectConfigManager(TARGET_PROJECT_PATH, RALPH_PATH);
  const fileWatcher = new FileWatcher(TARGET_PROJECT_PATH);
  const loopController = new LoopController(TARGET_PROJECT_PATH, RALPH_PATH);
  const planGenerator = new PlanGenerator(TARGET_PROJECT_PATH, RALPH_PATH);
  const prdGenerator = new PRDGenerator(TARGET_PROJECT_PATH, RALPH_PATH);
  const projectScanner = new ProjectScanner(TARGET_PROJECT_PATH);
  const logManager = new LogManager(TARGET_PROJECT_PATH);
  const troubleshootRunner = new TroubleshootRunner(TARGET_PROJECT_PATH, RALPH_PATH);
  const storiesGenerator = new StoriesGenerator(TARGET_PROJECT_PATH);
  const iterativePrdGenerator = new IterativePrdGenerator(TARGET_PROJECT_PATH, RALPH_PATH);

  // Initialize launcher services
  const projectRegistry = new ProjectRegistry();
  const instanceSpawner = new InstanceSpawner(RALPH_PATH);
  const projectDiscovery = new ProjectDiscovery();
  const templateManager = new TemplateManager();

  // Initialize review runner (LLM-as-Judge - Feature Set 13)
  const reviewRunner = new ReviewRunner(TARGET_PROJECT_PATH);

  // Initialize review generator (Code vs Docs analysis - Feature Set 14)
  const reviewGenerator = new ReviewGenerator(TARGET_PROJECT_PATH, RALPH_PATH);

  // Initialize health monitor for session management
  const healthMonitor = getHealthMonitor();
  healthMonitor.start();

  // Detect orphaned loops from previous dashboard instances
  logger.info('Checking for orphaned loops...');
  const orphanDetector = new OrphanDetector(
    new PidFileManager(),
    getSessionRepository()
  );
  const orphanResult = await orphanDetector.detectOrphans();

  if (orphanResult.staleSessions.length > 0) {
    logger.info(`Cleaned up ${orphanResult.staleSessions.length} stale sessions`);
  }
  if (orphanResult.stalePidFiles.length > 0) {
    logger.info(`Cleaned up ${orphanResult.stalePidFiles.length} stale PID files`);
  }
  if (orphanResult.orphans.length > 0) {
    logger.warn(`Found ${orphanResult.orphans.length} orphaned loop(s)`);
  }

  // Store orphans for WebSocket handlers
  let pendingOrphans: OrphanedLoop[] = orphanResult.orphans;

  // Track connected clients
  const clients = new Set<WebSocket>();

  // Broadcast to all connected clients
  function broadcast(message: object) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Helper to get projectId from TARGET_PROJECT_PATH or message payload
  // Used by external repos handlers that may not receive projectId in payload
  function getProjectIdFromMessage(message: { payload?: { projectId?: string } }): string | null {
    // First try payload
    if (message.payload?.projectId) {
      return message.payload.projectId;
    }
    
    // Fallback: derive from TARGET_PROJECT_PATH using ProjectRepository
    const projectRepo = getProjectRepository();
    const project = projectRepo.getProjectByPath(TARGET_PROJECT_PATH);
    return project?.id || TARGET_PROJECT_PATH; // Use path as ID if project not registered
  }

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    clients.add(ws);
    metrics.setGauge(METRICS.WS_CONNECTIONS_ACTIVE, clients.size);
    logger.info('Client connected', { totalClients: clients.size });

    // Send initial state
    ws.send(JSON.stringify({ type: 'loop:status', payload: loopController.getStatus() }));
    ws.send(JSON.stringify({ type: 'tasks:update', payload: fileWatcher.getTasks() }));
    ws.send(JSON.stringify({ type: 'git:update', payload: fileWatcher.getGitStatus() }));
    ws.send(JSON.stringify({ type: 'config:update', payload: projectConfig.getConfig() }));
    ws.send(JSON.stringify({ type: 'project:info', payload: projectRoot }));

    // Notify about orphaned loops if any
    if (pendingOrphans.length > 0) {
      ws.send(JSON.stringify({
        type: 'orphans:detected',
        payload: { orphans: pendingOrphans }
      }));
    }

    // Handle messages from client
    ws.on('message', async (data) => {
      metrics.incCounter(METRICS.WS_MESSAGES_TOTAL);

      try {
        const message = JSON.parse(data.toString());
        logger.debug('WebSocket message received', { type: message.type });

        switch (message.type) {
          case 'loop:start':
            loopController.start(message.payload);
            break;
          case 'loop:stop':
            loopController.stop();
            break;
          case 'session:current':
            // Return current active session for browser refresh resilience
            try {
              const sessionRepo = getSessionRepository();
              const activeSessions = sessionRepo.getActiveSessions();
              // Find session for current project path
              const projectId = message.payload?.projectId;
              let currentSession = null;

              if (projectId) {
                currentSession = sessionRepo.getActiveSessionForProject(projectId);
              } else if (activeSessions.length > 0) {
                // Return the most recent active session
                currentSession = activeSessions[0];
              }

              if (currentSession) {
                // Check if the process is still alive
                try {
                  process.kill(currentSession.pid, 0);
                  // Process alive - recover the session
                  loopController.recoverSession(currentSession);
                  ws.send(JSON.stringify({
                    type: 'session:recovered',
                    payload: {
                      sessionId: currentSession.id,
                      status: loopController.getStatus(),
                    }
                  }));
                } catch {
                  // Process is dead - mark as crashed
                  sessionRepo.markSessionCrashed(currentSession.id);
                  ws.send(JSON.stringify({
                    type: 'session:none',
                    payload: { reason: 'process_dead' }
                  }));
                }
              } else {
                ws.send(JSON.stringify({
                  type: 'session:none',
                  payload: { reason: 'no_active_session' }
                }));
              }
            } catch (err) {
              ws.send(JSON.stringify({
                type: 'session:error',
                payload: { error: `Failed to recover session: ${err instanceof Error ? err.message : 'Unknown error'}` }
              }));
            }
            break;
          case 'config:read':
            try {
              const content = await projectConfig.readFile(message.payload.file);
              ws.send(JSON.stringify({ type: 'config:content', payload: { file: message.payload.file, content } }));
            } catch (err) {
              // File doesn't exist or can't be read
              ws.send(JSON.stringify({ 
                type: 'config:error', 
                payload: { 
                  file: message.payload.file, 
                  error: err instanceof Error ? err.message : 'File not found' 
                } 
              }));
            }
            break;
          case 'config:write':
            await projectConfig.writeFile(message.payload.file, message.payload.content);
            ws.send(JSON.stringify({ type: 'config:saved', payload: { file: message.payload.file } }));
            // Refresh config if PRD.md or AUDIENCE_JTBD.md was written
            if (message.payload.file === 'PRD.md' || message.payload.file === 'AUDIENCE_JTBD.md') {
              const updatedConfig = await projectConfig.refresh();
              broadcast({ type: 'config:update', payload: updatedConfig });
            }
            break;
          case 'config:refresh':
            try {
              const updatedConfig = await projectConfig.refresh();
              broadcast({ type: 'config:update', payload: updatedConfig });
              ws.send(JSON.stringify({ type: 'config:refreshed' }));
            } catch {
              ws.send(JSON.stringify({ type: 'config:error', payload: { error: 'Failed to refresh config' } }));
            }
            break;
          case 'agents:toggle': {
            await projectConfig.toggleAgent(message.payload.agentId, message.payload.enabled);
            const enabledAgents = projectConfig.getEnabledAgents();
            broadcast({ type: 'agents:update', payload: { enabledAgents } });
            break;
          }
          case 'plan:generate':
            try {
              // Read PRD context if requested
              let prdContext = '';
              if (message.payload.usePrdContext) {
                try {
                  const prdContent = await projectConfig.readFile('PRD.md');
                  const audienceContent = await projectConfig.readFile('AUDIENCE_JTBD.md');
                  prdContext = `
## Context: PRD.md
${prdContent}

## Context: AUDIENCE_JTBD.md
${audienceContent}
`;
                } catch (err) {
                  logger.warn('Could not read PRD files', { error: err instanceof Error ? err.message : 'Unknown error' });
                }
              }
              await planGenerator.generatePlan({ ...message.payload, prdContext });
            } catch (err) {
              logger.error('Error generating plan', { error: err instanceof Error ? err.message : 'Unknown error' });
              captureError(err instanceof Error ? err : new Error(String(err)), { context: 'plan_generation' });
              ws.send(JSON.stringify({
                type: 'plan:error',
                payload: { error: err instanceof Error ? err.message : 'Failed to start plan generation' }
              }));
            }
            break;
          case 'plan:cancel':
            planGenerator.cancel();
            break;
          case 'prd:generate':
            prdGenerator.generatePRD(message.payload);
            break;
          case 'prd:cancel':
            prdGenerator.cancel();
            break;
          case 'project:scan': {
            const scanResult = await projectScanner.scan();
            ws.send(JSON.stringify({ type: 'project:scan-result', payload: scanResult }));
            break;
          }
          case 'project:info':
            ws.send(JSON.stringify({ type: 'project:info', payload: projectRoot }));
            break;
          case 'agents:list': {
            const agents = await projectConfig.listAvailableAgents();
            ws.send(JSON.stringify({ type: 'agents:list-result', payload: agents }));
            break;
          }
          case 'rules:list': {
            const rules = await projectConfig.listCursorRulesDetailed();
            ws.send(JSON.stringify({ type: 'rules:list-result', payload: rules }));
            break;
          }
          case 'rules:toggle': {
            const updatedRules = await projectConfig.toggleCursorRule(message.payload.ruleId, message.payload.enabled);
            broadcast({ type: 'rules:update', payload: updatedRules });
            break;
          }
          case 'docs:read':
            try {
              const docPath = message.payload.docPath;
              // Validate path to prevent directory traversal
              // Use path.resolve to get canonical path and verify it's within project
              if (path.isAbsolute(docPath)) {
                ws.send(JSON.stringify({ type: 'docs:error', payload: { error: 'Invalid path' } }));
                break;
              }
              const fullPath = path.resolve(TARGET_PROJECT_PATH, docPath);
              const projectRoot = path.resolve(TARGET_PROJECT_PATH);
              // Ensure resolved path starts with project root (prevents ../../../etc/passwd attacks)
              if (!fullPath.startsWith(projectRoot + path.sep) && fullPath !== projectRoot) {
                ws.send(JSON.stringify({ type: 'docs:error', payload: { error: 'Invalid path' } }));
                break;
              }
              const docContent = await fs.readFile(fullPath, 'utf-8');
              ws.send(JSON.stringify({ type: 'docs:content', payload: { path: docPath, content: docContent } }));
            } catch {
              ws.send(JSON.stringify({ type: 'docs:error', payload: { error: 'Failed to read document' } }));
            }
            break;
          case 'claude:list':
            try {
              const claudeFiles = await projectConfig.listClaudeMdFiles();
              ws.send(JSON.stringify({ type: 'claude:list-result', payload: claudeFiles }));
            } catch {
              ws.send(JSON.stringify({ type: 'claude:error', payload: { error: 'Failed to list CLAUDE.md files' } }));
            }
            break;
          case 'claude:read':
            try {
              const claudeContent = await projectConfig.readClaudeMdFile(message.payload.path);
              ws.send(JSON.stringify({ type: 'claude:content', payload: { path: message.payload.path, content: claudeContent } }));
            } catch {
              ws.send(JSON.stringify({ type: 'claude:error', payload: { error: 'Failed to read CLAUDE.md' } }));
            }
            break;
          case 'claude:apply':
            try {
              await projectConfig.applyRalphClaudeMd();
              ws.send(JSON.stringify({ type: 'claude:applied' }));
              // Refresh and broadcast config update
              const updatedConfig = await projectConfig.refresh();
              broadcast({ type: 'config:update', payload: updatedConfig });
            } catch {
              ws.send(JSON.stringify({ type: 'claude:error', payload: { error: 'Failed to apply CLAUDE.md' } }));
            }
            break;
          case 'dependencies:check':
            try {
              const depResults = await checkAllDependencies();
              ws.send(JSON.stringify({ type: 'dependencies:result', payload: depResults }));
            } catch {
              ws.send(JSON.stringify({ type: 'dependencies:error', payload: { error: 'Failed to check dependencies' } }));
            }
            break;
          case 'agents:list-repo':
            try {
              const repoAgents = await projectConfig.listRepoAgents();
              ws.send(JSON.stringify({ type: 'agents:repo-result', payload: repoAgents }));
            } catch {
              ws.send(JSON.stringify({ type: 'agents:error', payload: { error: 'Failed to list repo agents' } }));
            }
            break;
          case 'agents:install-global':
            try {
              await projectConfig.installAgentGlobal(message.payload.agentId);
              ws.send(JSON.stringify({ type: 'agents:installed', payload: { agentId: message.payload.agentId, scope: 'global' } }));
              // Send updated repo agents list
              const updatedRepoAgents = await projectConfig.listRepoAgents();
              ws.send(JSON.stringify({ type: 'agents:repo-result', payload: updatedRepoAgents }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'agents:error', payload: { error: `Failed to install agent globally: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;
          case 'agents:install-project':
            try {
              await projectConfig.installAgentProject(message.payload.agentId);
              ws.send(JSON.stringify({ type: 'agents:installed', payload: { agentId: message.payload.agentId, scope: 'project' } }));
              // Send updated repo agents list
              const updatedRepoAgentsAfterProject = await projectConfig.listRepoAgents();
              ws.send(JSON.stringify({ type: 'agents:repo-result', payload: updatedRepoAgentsAfterProject }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'agents:error', payload: { error: `Failed to install agent to project: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;
          case 'agents:install-all-global':
            try {
              await projectConfig.installAllAgentsGlobal();
              ws.send(JSON.stringify({ type: 'agents:installed', payload: { agentId: 'all', scope: 'global' } }));
              // Send updated repo agents list
              const updatedRepoAgentsAll = await projectConfig.listRepoAgents();
              ws.send(JSON.stringify({ type: 'agents:repo-result', payload: updatedRepoAgentsAll }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'agents:error', payload: { error: `Failed to install all agents: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;

          // ============================================
          // Launcher WebSocket Handlers
          // ============================================
          case 'launcher:projects:list':
            try {
              const projects = await projectRegistry.listProjects();
              ws.send(JSON.stringify({ type: 'launcher:projects:list', payload: projects }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'launcher:error', payload: { error: `Failed to list projects: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;

          case 'launcher:projects:add':
            try {
              const newProject = await projectRegistry.addProject(message.payload.path);
              ws.send(JSON.stringify({ type: 'launcher:project:added', payload: newProject }));
              // Broadcast updated list to all clients
              const updatedProjects = await projectRegistry.listProjects();
              broadcast({ type: 'launcher:projects:list', payload: updatedProjects });
            } catch (err) {
              ws.send(JSON.stringify({ type: 'launcher:error', payload: { error: `Failed to add project: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;

          case 'launcher:projects:remove':
            try {
              // Stop instance if running
              if (instanceSpawner.isRunning(message.payload.projectId)) {
                await instanceSpawner.stopInstance(message.payload.projectId);
              }
              await projectRegistry.removeProject(message.payload.projectId);
              ws.send(JSON.stringify({ type: 'launcher:project:removed', payload: { projectId: message.payload.projectId } }));
              // Broadcast updated list to all clients
              const projectsAfterRemove = await projectRegistry.listProjects();
              broadcast({ type: 'launcher:projects:list', payload: projectsAfterRemove });
            } catch (err) {
              ws.send(JSON.stringify({ type: 'launcher:error', payload: { error: `Failed to remove project: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;

          case 'launcher:instance:spawn':
            try {
              const project = await projectRegistry.getProject(message.payload.projectId);
              if (!project) {
                throw new Error('Project not found');
              }
              const instance = await instanceSpawner.spawnInstance(project.id, project.path);
              await projectRegistry.updateLastOpened(project.id);
              ws.send(JSON.stringify({ type: 'launcher:instance:spawned', payload: instance }));
              // Broadcast updated instances list to all clients
              const instances = instanceSpawner.listInstances();
              broadcast({ type: 'launcher:instances:list', payload: instances });
            } catch (err) {
              ws.send(JSON.stringify({ type: 'launcher:error', payload: { error: `Failed to spawn instance: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;

          case 'launcher:instance:stop':
            try {
              await instanceSpawner.stopInstance(message.payload.projectId);
              ws.send(JSON.stringify({ type: 'launcher:instance:stopped', payload: { projectId: message.payload.projectId } }));
              // Broadcast updated instances list to all clients
              const instancesAfterStop = instanceSpawner.listInstances();
              broadcast({ type: 'launcher:instances:list', payload: instancesAfterStop });
            } catch (err) {
              ws.send(JSON.stringify({ type: 'launcher:error', payload: { error: `Failed to stop instance: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;

          case 'launcher:instances:list':
            try {
              const runningInstances = instanceSpawner.listInstances();
              ws.send(JSON.stringify({ type: 'launcher:instances:list', payload: runningInstances }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'launcher:error', payload: { error: `Failed to list instances: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;

          case 'launcher:discover':
            try {
              // Update discovery with current registered projects
              const registeredProjects = await projectRegistry.listProjects();
              projectDiscovery.updateRegistered(registeredProjects);
              const discoveredProjects = await projectDiscovery.discover();
              ws.send(JSON.stringify({ type: 'launcher:discover:result', payload: discoveredProjects }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'launcher:error', payload: { error: `Failed to discover projects: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;

          case 'launcher:browse':
            try {
              const requestedPath = message.payload?.path || '';
              const isWindows = process.platform === 'win32';

              // Handle root/drives listing for Windows
              if (requestedPath === '' || requestedPath === '/' || requestedPath === '\\') {
                if (isWindows) {
                  // On Windows, list available drives
                  const drives: string[] = [];
                  // Check common drive letters
                  for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
                    const drivePath = `${letter}:\\`;
                    try {
                      await fs.access(drivePath);
                      drives.push(drivePath);
                    } catch {
                      // Drive not available
                    }
                  }
                  ws.send(JSON.stringify({
                    type: 'launcher:browse:result',
                    payload: {
                      currentPath: '',
                      parentPath: null,
                      entries: [],
                      drives,
                    }
                  }));
                } else {
                  // On Unix, browse root
                  const entries = await browseDirectory('/');
                  ws.send(JSON.stringify({
                    type: 'launcher:browse:result',
                    payload: {
                      currentPath: '/',
                      parentPath: null,
                      entries,
                    }
                  }));
                }
              } else {
                // Browse the specified directory
                const normalizedPath = path.normalize(requestedPath);
                const entries = await browseDirectory(normalizedPath);

                // Calculate parent path
                let parentPath: string | null = path.dirname(normalizedPath);
                if (isWindows) {
                  // On Windows, check if we're at drive root (e.g., C:\)
                  if (normalizedPath.match(/^[A-Z]:\\$/i)) {
                    parentPath = '';  // Go back to drives list
                  } else if (parentPath === normalizedPath) {
                    parentPath = null;
                  }
                } else {
                  if (parentPath === normalizedPath || normalizedPath === '/') {
                    parentPath = null;
                  }
                }

                ws.send(JSON.stringify({
                  type: 'launcher:browse:result',
                  payload: {
                    currentPath: normalizedPath,
                    parentPath,
                    entries,
                  }
                }));
              }
            } catch (err) {
              ws.send(JSON.stringify({ type: 'launcher:error', payload: { error: `Failed to browse directory: ${err instanceof Error ? err.message : 'Unknown error'}` } }));
            }
            break;

          case 'project:init':
            try {
              const projectId = message.payload?.projectId;
              const templates = message.payload?.templates as TemplateName[] | undefined;

              if (!projectId) {
                throw new Error('projectId is required');
              }

              const project = await projectRegistry.getProject(projectId);
              if (!project) {
                throw new Error('Project not found');
              }

              // Initialize with specified templates or default (AGENTS.md, CLAUDE.md)
              const result = await templateManager.initializeProject(
                project.path,
                templates || ['AGENTS.md', 'CLAUDE.md']
              );

              // Refresh Ralph-ready status after initialization
              await projectRegistry.refreshRalphStatus(projectId);

              ws.send(JSON.stringify({
                type: 'project:init:result',
                payload: {
                  projectId,
                  created: result.created,
                  skipped: result.skipped
                }
              }));

              // Broadcast updated project list
              const updatedProjects = await projectRegistry.listProjects();
              broadcast({ type: 'launcher:projects:list', payload: updatedProjects });
            } catch (err) {
              ws.send(JSON.stringify({
                type: 'project:init:error',
                payload: { error: `Failed to initialize project: ${err instanceof Error ? err.message : 'Unknown error'}` }
              }));
            }
            break;

          // ============================================
          // Review WebSocket Handlers
          // ============================================
          case 'review:run':
            try {
              await reviewRunner.runReview(message.payload);
            } catch (err) {
              ws.send(JSON.stringify({ type: 'review:error', payload: { error: err instanceof Error ? err.message : 'Unknown error' } }));
            }
            break;

          case 'review:cancel':
            reviewRunner.cancel();
            break;

          // ============================================
          // Review Generator WebSocket Handlers (Feature Set 14)
          // ============================================
          case 'review-generator:generate':
            try {
              await reviewGenerator.generateReview(message.payload);
            } catch (err) {
              ws.send(JSON.stringify({ type: 'review-generator:error', payload: { error: err instanceof Error ? err.message : 'Unknown error' } }));
            }
            break;

          case 'review-generator:cancel':
            reviewGenerator.cancel();
            break;

          // ============================================
          // Workflow Mode WebSocket Handlers
          // ============================================
          case 'mode:get': {
            const modePath = path.join(TARGET_PROJECT_PATH, '.ralph-mode');
            let mode = 'simple';
            try {
              const exists = await fs.access(modePath).then(() => true).catch(() => false);
              if (exists) {
                const content = await fs.readFile(modePath, 'utf-8');
                mode = content.trim();
                if (mode !== 'simple' && mode !== 'advanced') {
                  mode = 'simple';
                }
              }
            } catch {
              mode = 'simple';
            }
            ws.send(JSON.stringify({
              type: 'mode:current',
              payload: { mode },
            }));
            break;
          }

          case 'mode:set': {
            const { mode } = message.payload as { mode: 'simple' | 'advanced' };
            const filesCreated: string[] = [];
            
            try {
              // Write the mode file
              const modePath = path.join(TARGET_PROJECT_PATH, '.ralph-mode');
              await fs.writeFile(modePath, mode);
              filesCreated.push('.ralph-mode');
              
              // Auto-generate missing files for the new mode
              if (mode === 'simple') {
                // Create prd.json if missing
                const prdPath = path.join(TARGET_PROJECT_PATH, 'prd.json');
                const prdExists = await fs.access(prdPath).then(() => true).catch(() => false);
                if (!prdExists) {
                  const result = await templateManager.initializeProject(TARGET_PROJECT_PATH, ['prd.json']);
                  if (result.created.includes('prd.json')) {
                    filesCreated.push('prd.json');
                  }
                }
                
                // Create progress.txt if missing
                const progressPath = path.join(TARGET_PROJECT_PATH, 'progress.txt');
                const progressExists = await fs.access(progressPath).then(() => true).catch(() => false);
                if (!progressExists) {
                  // Create with current date
                  const date = new Date().toISOString().split('T')[0];
                  const content = (templateManager.getTemplate('progress.txt') as string).replace('[DATE]', date);
                  await fs.writeFile(progressPath, content);
                  filesCreated.push('progress.txt');
                }
              } else {
                // Create IMPLEMENTATION_PLAN.md if missing
                const planPath = path.join(TARGET_PROJECT_PATH, 'IMPLEMENTATION_PLAN.md');
                const planExists = await fs.access(planPath).then(() => true).catch(() => false);
                if (!planExists) {
                  const result = await templateManager.initializeProject(TARGET_PROJECT_PATH, ['IMPLEMENTATION_PLAN.md']);
                  if (result.created.includes('IMPLEMENTATION_PLAN.md')) {
                    filesCreated.push('IMPLEMENTATION_PLAN.md');
                  }
                }
              }
              
              ws.send(JSON.stringify({
                type: 'mode:updated',
                payload: { success: true, mode, filesCreated },
              }));
              
              // Refresh config and broadcast
              const updatedConfig = await projectConfig.refresh();
              broadcast({ type: 'config:update', payload: updatedConfig });
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'mode:updated',
                payload: {
                  success: false,
                  message: error instanceof Error ? error.message : 'Unknown error',
                },
              }));
            }
            break;
          }

          // ============================================
          // Port Management WebSocket Handlers
          // ============================================
          case 'ports:scan': {
            try {
              const processes = await scanPorts();
              ws.send(JSON.stringify({
                type: 'ports:list',
                payload: processes,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'ports:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to scan ports' },
              }));
            }
            break;
          }

          case 'ports:kill': {
            try {
              const { pid } = message.payload as { pid: number };
              const result = await killProcess(pid);
              
              if (result.success) {
                ws.send(JSON.stringify({
                  type: 'ports:killed',
                  payload: { pid, success: true },
                }));
                // Send updated port list after killing
                const processes = await scanPorts();
                ws.send(JSON.stringify({
                  type: 'ports:list',
                  payload: processes,
                }));
              } else {
                ws.send(JSON.stringify({
                  type: 'ports:error',
                  payload: { error: result.error || 'Failed to kill process' },
                }));
              }
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'ports:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to kill process' },
              }));
            }
            break;
          }

          // Log management handlers
          case 'logs:list': {
            try {
              const sessions = await logManager.listLogs();
              ws.send(JSON.stringify({
                type: 'logs:list',
                payload: sessions.map(s => ({
                  ...s,
                  date: s.date.toISOString(),
                })),
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'logs:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to list logs' },
              }));
            }
            break;
          }

          case 'logs:read': {
            try {
              const { filename } = message.payload as { filename: string };
              const content = await logManager.readLog(filename);
              ws.send(JSON.stringify({
                type: 'logs:content',
                payload: { filename, content },
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'logs:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to read log' },
              }));
            }
            break;
          }

          case 'logs:delete': {
            try {
              const { filename } = message.payload as { filename: string };
              await logManager.deleteLog(filename);
              ws.send(JSON.stringify({
                type: 'logs:deleted',
                payload: { filename },
              }));
              // Send updated list after deletion
              const sessions = await logManager.listLogs();
              ws.send(JSON.stringify({
                type: 'logs:list',
                payload: sessions.map(s => ({
                  ...s,
                  date: s.date.toISOString(),
                })),
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'logs:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to delete log' },
              }));
            }
            break;
          }

          case 'logs:cleanup': {
            try {
              const { keepDays } = message.payload as { keepDays: number };
              const deletedCount = await logManager.cleanupOldLogs(keepDays);
              ws.send(JSON.stringify({
                type: 'logs:cleanup:result',
                payload: { deletedCount },
              }));
              // Send updated list after cleanup
              const sessions = await logManager.listLogs();
              ws.send(JSON.stringify({
                type: 'logs:list',
                payload: sessions.map(s => ({
                  ...s,
                  date: s.date.toISOString(),
                })),
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'logs:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to cleanup logs' },
              }));
            }
            break;
          }

          // Troubleshoot handler - run Claude CLI in background
          case 'troubleshoot:launch': {
            try {
              const { errorLog } = message.payload as { errorLog: string };
              
              // Set up event listeners for this session
              const onStatus = (status: { running: boolean; startedAt: Date | null }) => {
                ws.send(JSON.stringify({
                  type: 'troubleshoot:status',
                  payload: {
                    running: status.running,
                    startedAt: status.startedAt?.toISOString() || null,
                  },
                }));
              };
              
              const onOutput = (text: string) => {
                ws.send(JSON.stringify({
                  type: 'troubleshoot:output',
                  payload: { text },
                }));
              };
              
              const onComplete = (result: { success: boolean; output: string }) => {
                ws.send(JSON.stringify({
                  type: 'troubleshoot:complete',
                  payload: result,
                }));
                // Remove listeners after completion
                troubleshootRunner.off('status', onStatus);
                troubleshootRunner.off('output', onOutput);
                troubleshootRunner.off('complete', onComplete);
                troubleshootRunner.off('error', onError);
                troubleshootRunner.off('cancelled', onCancelled);
              };
              
              const onError = (error: string) => {
                ws.send(JSON.stringify({
                  type: 'troubleshoot:error',
                  payload: { error },
                }));
                // Remove listeners after error
                troubleshootRunner.off('status', onStatus);
                troubleshootRunner.off('output', onOutput);
                troubleshootRunner.off('complete', onComplete);
                troubleshootRunner.off('error', onError);
                troubleshootRunner.off('cancelled', onCancelled);
              };
              
              const onCancelled = () => {
                ws.send(JSON.stringify({ type: 'troubleshoot:cancelled' }));
                // Remove listeners after cancellation
                troubleshootRunner.off('status', onStatus);
                troubleshootRunner.off('output', onOutput);
                troubleshootRunner.off('complete', onComplete);
                troubleshootRunner.off('error', onError);
                troubleshootRunner.off('cancelled', onCancelled);
              };
              
              // Add listeners
              troubleshootRunner.on('status', onStatus);
              troubleshootRunner.on('output', onOutput);
              troubleshootRunner.on('complete', onComplete);
              troubleshootRunner.on('error', onError);
              troubleshootRunner.on('cancelled', onCancelled);
              
              // Start the troubleshoot run
              await troubleshootRunner.run(errorLog);
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'troubleshoot:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to start troubleshoot' },
              }));
            }
            break;
          }

          case 'troubleshoot:cancel': {
            troubleshootRunner.cancel();
            break;
          }

          // Stories generator handlers - convert PRD.md to prd.json
          case 'stories:generate': {
            try {
              // Set up event listeners for this session
              const onStatus = (status: { generating: boolean; startedAt: Date | null }) => {
                ws.send(JSON.stringify({
                  type: 'stories:status',
                  payload: {
                    generating: status.generating,
                    startedAt: status.startedAt?.toISOString() || null,
                  },
                }));
              };
              
              const onOutput = (text: string) => {
                ws.send(JSON.stringify({
                  type: 'stories:output',
                  payload: { text },
                }));
              };
              
              const onComplete = (prdJson: { branchName: string; userStories: unknown[] }) => {
                ws.send(JSON.stringify({
                  type: 'stories:complete',
                  payload: prdJson,
                }));
                // Remove listeners after completion
                storiesGenerator.off('status', onStatus);
                storiesGenerator.off('output', onOutput);
                storiesGenerator.off('complete', onComplete);
                storiesGenerator.off('error', onError);
                storiesGenerator.off('cancelled', onCancelled);
              };
              
              const onError = (error: string) => {
                ws.send(JSON.stringify({
                  type: 'stories:error',
                  payload: { error },
                }));
                // Remove listeners after error
                storiesGenerator.off('status', onStatus);
                storiesGenerator.off('output', onOutput);
                storiesGenerator.off('complete', onComplete);
                storiesGenerator.off('error', onError);
                storiesGenerator.off('cancelled', onCancelled);
              };
              
              const onCancelled = () => {
                ws.send(JSON.stringify({ type: 'stories:cancelled' }));
                // Remove listeners after cancellation
                storiesGenerator.off('status', onStatus);
                storiesGenerator.off('output', onOutput);
                storiesGenerator.off('complete', onComplete);
                storiesGenerator.off('error', onError);
                storiesGenerator.off('cancelled', onCancelled);
              };
              
              // Add listeners
              storiesGenerator.on('status', onStatus);
              storiesGenerator.on('output', onOutput);
              storiesGenerator.on('complete', onComplete);
              storiesGenerator.on('error', onError);
              storiesGenerator.on('cancelled', onCancelled);
              
              // Start the generation
              await storiesGenerator.generate();
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'stories:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to start stories generation' },
              }));
            }
            break;
          }

          case 'stories:cancel': {
            storiesGenerator.cancel();
            break;
          }

          case 'stories:save': {
            try {
              const { prdJson } = message.payload as { prdJson: { branchName: string; userStories: unknown[] } };
              const prdJsonPath = path.join(TARGET_PROJECT_PATH, 'prd.json');
              await fs.writeFile(prdJsonPath, JSON.stringify(prdJson, null, 2), 'utf-8');
              ws.send(JSON.stringify({
                type: 'stories:saved',
                payload: { success: true },
              }));
              // Refresh project config to update hasPrdJson
              const updatedConfig = await projectConfig.refresh();
              broadcast({ type: 'config:update', payload: updatedConfig });
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'stories:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to save prd.json' },
              }));
            }
            break;
          }

          // ============================================================================
          // Iterative PRD Generator handlers (Q&A Interview + Versioning)
          // ============================================================================

          case 'prd-interview:check-versions': {
            try {
              const versions = await iterativePrdGenerator.checkVersions();
              ws.send(JSON.stringify({
                type: 'prd-interview:versions',
                payload: versions,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'prd-interview:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to check versions' },
              }));
            }
            break;
          }

          case 'prd-interview:start': {
            try {
              const { description, additionalContext, contextDocs, previousVersions, startFresh, skipQuestions } = message.payload as {
                description: string;
                additionalContext?: string;
                contextDocs: string[];
                previousVersions: number[];
                startFresh: boolean;
                skipQuestions?: boolean;
              };
              const session = await iterativePrdGenerator.startInterview(
                description,
                contextDocs,
                previousVersions,
                startFresh,
                additionalContext,
                skipQuestions
              );
              ws.send(JSON.stringify({
                type: 'prd-interview:session',
                payload: session,
              }));
              // If skipQuestions, go directly to PRD generation, otherwise start questions
              if (skipQuestions) {
                iterativePrdGenerator.generatePRD();
              } else {
                iterativePrdGenerator.generateQuestions();
              }
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'prd-interview:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to start interview' },
              }));
            }
            break;
          }

          case 'prd-interview:analyze-codebase': {
            try {
              iterativePrdGenerator.analyzeCodebase();
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'prd-interview:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to start codebase analysis' },
              }));
            }
            break;
          }

          case 'prd-interview:answer': {
            try {
              const { roundNumber, answers } = message.payload as {
                roundNumber: number;
                answers: Array<{ questionId: string; answer?: string; skipped: boolean }>;
              };
              const session = await iterativePrdGenerator.submitAnswers(roundNumber, answers);
              ws.send(JSON.stringify({
                type: 'prd-interview:session',
                payload: session,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'prd-interview:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to submit answers' },
              }));
            }
            break;
          }

          case 'prd-interview:more': {
            try {
              iterativePrdGenerator.requestMoreQuestions();
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'prd-interview:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to request more questions' },
              }));
            }
            break;
          }

          case 'prd-interview:generate': {
            try {
              iterativePrdGenerator.generatePRD();
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'prd-interview:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to start PRD generation' },
              }));
            }
            break;
          }

          case 'prd-interview:cancel': {
            iterativePrdGenerator.cancel();
            break;
          }

          case 'prd-interview:resume': {
            try {
              const session = await iterativePrdGenerator.resumeSession();
              if (session) {
                ws.send(JSON.stringify({
                  type: 'prd-interview:session',
                  payload: session,
                }));
              } else {
                // No session to resume - check versions instead
                const versions = await iterativePrdGenerator.checkVersions();
                ws.send(JSON.stringify({
                  type: 'prd-interview:versions',
                  payload: versions,
                }));
              }
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'prd-interview:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to resume session' },
              }));
            }
            break;
          }

          case 'prd-interview:clear': {
            try {
              await iterativePrdGenerator.clearSession();
              const versions = await iterativePrdGenerator.checkVersions();
              ws.send(JSON.stringify({
                type: 'prd-interview:versions',
                payload: versions,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'prd-interview:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to clear session' },
              }));
            }
            break;
          }

          // ============================================================================
          // External Repos WebSocket Handlers
          // ============================================================================

          case 'external-repos:list': {
            try {
              const projectId = getProjectIdFromMessage(message);
              if (!projectId) {
                throw new Error('projectId is required');
              }
              const repos = ExternalRepos.getExternalRepos(projectId);
              ws.send(JSON.stringify({
                type: 'external-repos:list',
                payload: repos,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to list repos' },
              }));
            }
            break;
          }

          case 'external-repos:add': {
            try {
              if (!message.payload) {
                throw new Error('payload is required');
              }
              const projectId = getProjectIdFromMessage(message);
              if (!projectId) {
                throw new Error('projectId is required');
              }
              const { url, alias, branch, fetchStrategy, paths, mcpHints, maxTokens, purpose, cacheTTLHours, disableCache } = message.payload as {
                url: string;
                alias: string;
                branch?: string;
                fetchStrategy?: ExternalRepos.RepoFetchStrategy;
                paths?: string[];
                mcpHints?: string[];
                maxTokens?: number;
                purpose?: string;
                cacheTTLHours?: number;
                disableCache?: boolean;
              };
              const repo = await ExternalRepos.addExternalRepo(projectId, { url, alias, branch, fetchStrategy, paths, mcpHints, maxTokens, purpose, cacheTTLHours, disableCache });
              ws.send(JSON.stringify({
                type: 'external-repos:added',
                payload: repo,
              }));
              // Send updated list
              const repos = ExternalRepos.getExternalRepos(projectId);
              broadcast({ type: 'external-repos:list', payload: repos });
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to add repo' },
              }));
            }
            break;
          }

          case 'external-repos:update': {
            try {
              if (!message.payload) {
                throw new Error('payload is required');
              }
              const projectId = getProjectIdFromMessage(message);
              if (!projectId) {
                throw new Error('projectId is required');
              }
              const { repoId, ...updates } = message.payload as {
                repoId: string;
                [key: string]: unknown;
              };
              if (!repoId) {
                throw new Error('repoId is required');
              }
              const repo = ExternalRepos.updateExternalRepo(projectId, repoId, updates);
              ws.send(JSON.stringify({
                type: 'external-repos:updated',
                payload: repo,
              }));
              // Send updated list
              const repos = ExternalRepos.getExternalRepos(projectId);
              broadcast({ type: 'external-repos:list', payload: repos });
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to update repo' },
              }));
            }
            break;
          }

          case 'external-repos:remove': {
            try {
              if (!message.payload) {
                throw new Error('payload is required');
              }
              const projectId = getProjectIdFromMessage(message);
              if (!projectId) {
                throw new Error('projectId is required');
              }
              const { repoId } = message.payload as { repoId: string };
              if (!repoId) {
                throw new Error('repoId is required');
              }
              ExternalRepos.removeExternalRepo(projectId, repoId);
              ws.send(JSON.stringify({
                type: 'external-repos:removed',
                payload: { repoId },
              }));
              // Send updated list
              const repos = ExternalRepos.getExternalRepos(projectId);
              broadcast({ type: 'external-repos:list', payload: repos });
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to remove repo' },
              }));
            }
            break;
          }

          case 'external-repos:fetch': {
            try {
              if (!message.payload) {
                throw new Error('payload is required');
              }
              const projectId = getProjectIdFromMessage(message);
              if (!projectId) {
                throw new Error('projectId is required');
              }
              const { repoIds, forceRefresh } = message.payload as {
                repoIds: string[];
                forceRefresh?: boolean;
              };
              if (!repoIds || repoIds.length === 0) {
                throw new Error('repoIds is required');
              }
              const result = await ExternalRepos.fetchAndBuildContext(projectId, repoIds, { forceRefresh });
              ws.send(JSON.stringify({
                type: 'external-repos:fetched',
                payload: {
                  contents: result.contents,
                  summary: result.summary,
                },
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to fetch repos' },
              }));
            }
            break;
          }

          case 'external-repos:cache-status': {
            try {
              const projectId = getProjectIdFromMessage(message);
              if (!projectId) {
                throw new Error('projectId is required');
              }
              const repoIds = message.payload?.repoIds as string[] | undefined;
              const status = ExternalRepos.getReposCacheStatus(projectId, repoIds);
              ws.send(JSON.stringify({
                type: 'external-repos:cache-status',
                payload: status,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to get cache status' },
              }));
            }
            break;
          }

          case 'external-repos:clear-cache': {
            try {
              const projectId = getProjectIdFromMessage(message);
              if (!projectId) {
                throw new Error('projectId is required');
              }
              const repoIds = message.payload?.repoIds as string[] | undefined;
              ExternalRepos.clearCache(projectId, repoIds);
              ws.send(JSON.stringify({
                type: 'external-repos:cache-cleared',
                payload: { repoIds: repoIds || 'all' },
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to clear cache' },
              }));
            }
            break;
          }

          case 'external-repos:mcp-status': {
            try {
              const projectId = getProjectIdFromMessage(message);
              if (!projectId) {
                throw new Error('projectId is required');
              }
              const status = ExternalRepos.getMcpStatus(projectId);
              ws.send(JSON.stringify({
                type: 'external-repos:mcp-status',
                payload: status,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to get MCP status' },
              }));
            }
            break;
          }

          case 'external-repos:validate-url': {
            try {
              if (!message.payload) {
                throw new Error('payload is required');
              }
              const { url } = message.payload as { url: string };
              if (!url) {
                throw new Error('url is required');
              }
              const result = await ExternalRepos.validateRepoUrl(url);
              ws.send(JSON.stringify({
                type: 'external-repos:url-validated',
                payload: result,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to validate URL' },
              }));
            }
            break;
          }

          case 'external-repos:validate-token': {
            try {
              if (!message.payload) {
                throw new Error('payload is required');
              }
              const { token } = message.payload as { token: string };
              if (!token) {
                throw new Error('token is required');
              }
              const result = await validateGitHubToken(token);
              ws.send(JSON.stringify({
                type: 'external-repos:token-validated',
                payload: result,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to validate token' },
              }));
            }
            break;
          }

          case 'external-repos:set-token': {
            try {
              if (!message.payload) {
                throw new Error('payload is required');
              }
              const { token } = message.payload as { token: string };
              if (!token) {
                throw new Error('token is required');
              }
              // First validate the token
              const validation = await validateGitHubToken(token);
              if (!validation.valid) {
                ws.send(JSON.stringify({
                  type: 'external-repos:token-set',
                  payload: { success: false, error: validation.error || 'Invalid token' },
                }));
                break;
              }
              // Save the token
              setGitHubToken(token);
              ws.send(JSON.stringify({
                type: 'external-repos:token-set',
                payload: { success: true, login: validation.login, scopes: validation.scopes },
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to set token' },
              }));
            }
            break;
          }

          case 'external-repos:cache-stats': {
            try {
              const stats = ExternalRepos.getCacheStatistics();
              ws.send(JSON.stringify({
                type: 'external-repos:cache-stats',
                payload: stats,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'external-repos:error',
                payload: { error: error instanceof Error ? error.message : 'Failed to get cache stats' },
              }));
            }
            break;
          }

          // ============================================
          // Orphan Detection WebSocket Handlers
          // ============================================
          case 'orphans:cleanup':
            try {
              const { pid, projectId } = message.payload as { pid: number; projectId: string };
              const orphan = pendingOrphans.find(o => o.pid === pid && o.projectId === projectId);
              if (!orphan) {
                ws.send(JSON.stringify({
                  type: 'orphans:error',
                  payload: { error: 'Orphan not found' }
                }));
                break;
              }
              const success = await orphanDetector.cleanupOrphan(orphan);
              if (success) {
                pendingOrphans = pendingOrphans.filter(o => !(o.pid === pid && o.projectId === projectId));
                broadcast({ type: 'orphans:cleaned', payload: { pid, projectId } });
                broadcast({ type: 'orphans:detected', payload: { orphans: pendingOrphans } });
              } else {
                ws.send(JSON.stringify({
                  type: 'orphans:error',
                  payload: { error: 'Failed to cleanup orphan' }
                }));
              }
            } catch (err) {
              ws.send(JSON.stringify({
                type: 'orphans:error',
                payload: { error: err instanceof Error ? err.message : 'Unknown error' }
              }));
            }
            break;

          case 'orphans:cleanup-all':
            try {
              const result = await orphanDetector.cleanupAllOrphans(pendingOrphans);
              pendingOrphans = [];
              broadcast({
                type: 'orphans:all-cleaned',
                payload: { cleaned: result.cleaned, failed: result.failed }
              });
              broadcast({ type: 'orphans:detected', payload: { orphans: [] } });
            } catch (err) {
              ws.send(JSON.stringify({
                type: 'orphans:error',
                payload: { error: err instanceof Error ? err.message : 'Unknown error' }
              }));
            }
            break;

          case 'orphans:ignore':
            // User chose to ignore orphans (keep them running)
            pendingOrphans = [];
            broadcast({ type: 'orphans:detected', payload: { orphans: [] } });
            break;
        }
      } catch (err) {
        logger.error('Error handling WebSocket message', { error: err instanceof Error ? err.message : 'Unknown error' });
        metrics.incCounter(METRICS.WS_MESSAGES_TOTAL, { status: 'error' });
        captureError(err instanceof Error ? err : new Error(String(err)), { context: 'websocket_message' });
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      metrics.setGauge(METRICS.WS_CONNECTIONS_ACTIVE, clients.size);
      logger.info('Client disconnected', { totalClients: clients.size });
    });
  });

  // File watcher events
  fileWatcher.on('tasks', (tasks) => {
    broadcast({ type: 'tasks:update', payload: tasks });
  });

  fileWatcher.on('log', (entry) => {
    broadcast({ type: 'loop:log', payload: entry });
  });

  fileWatcher.on('git', (status) => {
    broadcast({ type: 'git:update', payload: status });
  });

  // File watcher config refresh events (when PRD.md or AUDIENCE_JTBD.md change)
  fileWatcher.on('config:refresh', async () => {
    try {
      const updatedConfig = await projectConfig.refresh();
      broadcast({ type: 'config:update', payload: updatedConfig });
    } catch (err) {
      logger.error('Error refreshing config', { error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  // Loop controller events
  loopController.on('status', (status) => {
    broadcast({ type: 'loop:status', payload: status });
  });

  loopController.on('log', (entry) => {
    broadcast({ type: 'loop:log', payload: entry });
  });

  // Plan generator events
  planGenerator.on('status', (status) => {
    broadcast({ type: 'plan:status', payload: status });
  });

  planGenerator.on('output', (text) => {
    broadcast({ type: 'plan:output', payload: { text } });
  });

  planGenerator.on('log', (text) => {
    broadcast({ type: 'plan:log', payload: { text } });
  });

  planGenerator.on('complete', (result) => {
    broadcast({ type: 'plan:complete', payload: result });
  });

  planGenerator.on('error', (error) => {
    broadcast({ type: 'plan:error', payload: { error } });
  });

  planGenerator.on('cancelled', () => {
    broadcast({ type: 'plan:error', payload: { error: 'Plan generation cancelled' } });
  });

  // PRD generator events
  prdGenerator.on('status', (status) => {
    broadcast({ type: 'prd:status', payload: status });
  });

  prdGenerator.on('output', (text) => {
    broadcast({ type: 'prd:output', payload: { text } });
  });

  prdGenerator.on('log', (text) => {
    broadcast({ type: 'prd:log', payload: { text } });
  });

  prdGenerator.on('complete', (result) => {
    broadcast({ type: 'prd:complete', payload: result });
  });

  prdGenerator.on('error', (error) => {
    broadcast({ type: 'prd:error', payload: { error } });
  });

  prdGenerator.on('cancelled', () => {
    broadcast({ type: 'prd:error', payload: { error: 'PRD generation cancelled' } });
  });

  // Iterative PRD generator events
  iterativePrdGenerator.on('session', (session) => {
    broadcast({ type: 'prd-interview:session', payload: session });
  });

  iterativePrdGenerator.on('analysis', (analysis) => {
    broadcast({ type: 'prd-interview:analysis', payload: analysis });
  });

  iterativePrdGenerator.on('questions', (data) => {
    broadcast({ type: 'prd-interview:questions', payload: data });
  });

  iterativePrdGenerator.on('status', (status) => {
    broadcast({ type: 'prd-interview:status', payload: status });
  });

  iterativePrdGenerator.on('output', (data) => {
    broadcast({ type: 'prd-interview:output', payload: data });
  });

  iterativePrdGenerator.on('complete', (result) => {
    broadcast({ type: 'prd-interview:complete', payload: result });
  });

  iterativePrdGenerator.on('cancelled', () => {
    broadcast({ type: 'prd-interview:cancelled' });
  });

  iterativePrdGenerator.on('log', (text) => {
    logger.debug('PRD Interview', { message: text });
  });

  // Instance spawner events
  instanceSpawner.on('stopped', (data: { projectId: string }) => {
    broadcast({ type: 'launcher:instance:stopped', payload: data });
    const instances = instanceSpawner.listInstances();
    broadcast({ type: 'launcher:instances:list', payload: instances });
  });

  instanceSpawner.on('crashed', (data: { projectId: string; error: string }) => {
    broadcast({ type: 'launcher:instance:crashed', payload: data });
    const instances = instanceSpawner.listInstances();
    broadcast({ type: 'launcher:instances:list', payload: instances });
  });

  instanceSpawner.on('initialized', async (data: { projectId: string; created: string[] }) => {
    // Refresh Ralph-ready status and broadcast the update
    await projectRegistry.refreshRalphStatus(data.projectId);
    broadcast({ type: 'project:init:result', payload: data });
    const projects = await projectRegistry.listProjects();
    broadcast({ type: 'launcher:projects:list', payload: projects });
  });

  // Review runner events
  reviewRunner.on('status', (status) => {
    broadcast({ type: 'review:status', payload: status });
  });

  reviewRunner.on('output', (text) => {
    broadcast({ type: 'review:output', payload: { text } });
  });

  reviewRunner.on('complete', (result) => {
    broadcast({ type: 'review:complete', payload: result });
  });

  reviewRunner.on('error', (error) => {
    broadcast({ type: 'review:error', payload: { error } });
  });

  reviewRunner.on('cancelled', () => {
    broadcast({ type: 'review:error', payload: { error: 'Review cancelled' } });
  });

  // Review generator events (Feature Set 14)
  reviewGenerator.on('status', (status) => {
    broadcast({ type: 'review-generator:status', payload: status });
  });

  reviewGenerator.on('output', (text) => {
    broadcast({ type: 'review-generator:output', payload: { text } });
  });

  reviewGenerator.on('log', (text) => {
    broadcast({ type: 'review-generator:log', payload: { text } });
  });

  reviewGenerator.on('complete', (result) => {
    broadcast({ type: 'review-generator:complete', payload: result });
  });

  reviewGenerator.on('error', (error) => {
    broadcast({ type: 'review-generator:error', payload: { error } });
  });

  reviewGenerator.on('cancelled', () => {
    broadcast({ type: 'review-generator:error', payload: { error: 'Review generation cancelled' } });
  });

  // REST API endpoints
  app.get('/api/status', (req, res) => {
    res.json({
      loop: loopController.getStatus(),
      tasks: fileWatcher.getTasks(),
      git: fileWatcher.getGitStatus(),
      config: projectConfig.getConfig(),
    });
  });

  // New endpoint to get project info
  app.get('/api/project-info', (req, res) => {
    res.json(projectRoot);
  });

  app.get('/api/config/:file', async (req, res) => {
    try {
      const content = await projectConfig.readFile(req.params.file);
      res.json({ content });
    } catch {
      res.status(404).json({ error: 'File not found' });
    }
  });

  app.post('/api/config/:file', async (req, res) => {
    try {
      await projectConfig.writeFile(req.params.file, req.body.content);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to save file' });
    }
  });

  app.post('/api/loop/start', (req, res) => {
    loopController.start(req.body);
    res.json({ success: true });
  });

  app.post('/api/loop/stop', (req, res) => {
    loopController.stop();
    res.json({ success: true });
  });

  // Start file watchers
  fileWatcher.start();

  // Start server
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    logger.info('Ralph Dashboard server started', {
      port: PORT,
      targetProject: TARGET_PROJECT_PATH,
      ralphDirectory: projectRoot.mode === 'embedded' ? RALPH_PATH : undefined,
      mode: projectRoot.mode,
    });
  });

  // Cleanup on exit
  process.on('SIGINT', async () => {
    logger.info('Shutting down server...');
    fileWatcher.stop();
    loopController.stop();
    // Stop health monitor
    healthMonitor.stop();
    // Stop all spawned instances
    await instanceSpawner.stopAll();
    // Flush Sentry events
    await flushSentry();
    // Close database
    RalphDatabase.close();
    server.close();
    logger.info('Server shutdown complete');
    process.exit(0);
  });
}

// Start the server
startServer().catch((err) => {
  logger.fatal('Failed to start server', { error: err instanceof Error ? err.message : 'Unknown error' });
  sendAlert('Server Startup Failed', err instanceof Error ? err.message : 'Unknown error', 'critical', 'server');
  process.exit(1);
});
