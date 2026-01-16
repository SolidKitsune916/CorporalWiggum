import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { LoopController } from './loopController.js';
import { CostTracker } from './costTracker.js';
import { TelemetryTracker } from './telemetryTracker.js';
import { TemplateManager } from './templateManager.js';
import { ProjectDetector } from './projectDetector.js';

// Load environment from parent directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../.env') });

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Initialize services
const projectDetector = new ProjectDetector(__dirname);
const templateManager = new TemplateManager(path.resolve(__dirname, '../../templates'));
const costTracker = new CostTracker();
const telemetryTracker = new TelemetryTracker();
const loopController = new LoopController({
  projectDetector,
  costTracker,
  telemetryTracker,
  broadcast: broadcastMessage,
});

// Broadcast to all connected clients
function broadcastMessage(message: object) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send initial status
  ws.send(JSON.stringify({
    type: 'loop:status',
    payload: loopController.getStatus(),
  }));

  ws.send(JSON.stringify({
    type: 'cost:update',
    payload: costTracker.getData(),
  }));

  ws.send(JSON.stringify({
    type: 'project:info',
    payload: projectDetector.getProjectConfig(),
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleMessage(ws, message);
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid message format' },
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Message handler
async function handleMessage(ws: WebSocket, message: { type: string; payload?: unknown }) {
  switch (message.type) {
    // Loop messages
    case 'loop:start':
      await loopController.start(message.payload as Parameters<typeof loopController.start>[0]);
      break;

    case 'loop:stop':
      loopController.stop();
      break;

    case 'loop:status':
      ws.send(JSON.stringify({
        type: 'loop:status',
        payload: loopController.getStatus(),
      }));
      break;

    // Cost messages
    case 'cost:update':
      ws.send(JSON.stringify({
        type: 'cost:update',
        payload: costTracker.getData(),
      }));
      break;

    case 'cost:limit': {
      const { limit } = message.payload as { limit: number };
      costTracker.setLimit(limit);
      broadcastMessage({
        type: 'cost:update',
        payload: costTracker.getData(),
      });
      break;
    }

    // Telemetry messages
    case 'telemetry:history':
      ws.send(JSON.stringify({
        type: 'telemetry:history',
        payload: telemetryTracker.getHistory(),
      }));
      break;

    // Project messages
    case 'project:info':
      ws.send(JSON.stringify({
        type: 'project:info',
        payload: projectDetector.getProjectConfig(),
      }));
      break;

    case 'project:path-override': {
      const { newPath } = message.payload as { newPath: string };
      const result = await projectDetector.overridePath(newPath);
      ws.send(JSON.stringify({
        type: 'project:path-override-result',
        payload: result,
      }));
      if (result.success) {
        broadcastMessage({
          type: 'project:info',
          payload: projectDetector.getProjectConfig(),
        });
      }
      break;
    }

    case 'project:init': {
      const { files } = message.payload as { files: string[] };
      const projectPath = projectDetector.getProjectConfig()?.path;
      if (!projectPath) {
        ws.send(JSON.stringify({
          type: 'project:init-result',
          payload: { success: false, created: [] },
        }));
        break;
      }

      const created: string[] = [];
      for (const file of files) {
        try {
          await templateManager.createFile(projectPath, file);
          created.push(file);
        } catch (error) {
          console.error(`Failed to create ${file}:`, error);
        }
      }

      ws.send(JSON.stringify({
        type: 'project:init-result',
        payload: { success: created.length > 0, created },
      }));

      // Refresh project info
      projectDetector.refresh();
      broadcastMessage({
        type: 'project:info',
        payload: projectDetector.getProjectConfig(),
      });
      break;
    }

    case 'project:init-preview': {
      const { file } = message.payload as { file: string };
      const content = templateManager.getTemplate(file);
      ws.send(JSON.stringify({
        type: 'project:init-preview-result',
        payload: { file, content },
      }));
      break;
    }

    // Dependencies
    case 'dependencies:check': {
      const deps = await projectDetector.checkDependencies();
      ws.send(JSON.stringify({
        type: 'dependencies:status',
        payload: deps,
      }));
      break;
    }

    // Config messages
    case 'config:read': {
      const config = projectDetector.getConfig();
      ws.send(JSON.stringify({
        type: 'config:read-result',
        payload: config,
      }));
      break;
    }

    default:
      console.warn('Unknown message type:', message.type);
  }
}

// REST endpoints
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (_req, res) => {
  res.json({
    loop: loopController.getStatus(),
    cost: costTracker.getData(),
    project: projectDetector.getProjectConfig(),
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Ralph Wiggum V3 server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
  console.log(`Project path: ${projectDetector.getProjectConfig()?.path || 'Not detected'}`);
});
