import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, ws } from 'msw';

// Mock WebSocket server for testing
const wsServer = ws.link('ws://localhost:3001/ws');

// Define MSW handlers
export const handlers = [
  // Mock REST API endpoints
  http.get('/api/status', () => {
    return HttpResponse.json({
      loop: {
        status: 'idle',
        iterations: 0,
        currentTask: null,
      },
      tasks: [],
      git: {
        branch: 'main',
        status: 'clean',
        commits: [],
      },
      config: {
        hasPRD: false,
        hasAudience: false,
        hasAgents: false,
      },
    });
  }),

  http.get('/api/project-info', () => {
    return HttpResponse.json({
      targetProjectPath: '/test/project',
      ralphPath: '/test/ralph',
      mode: 'embedded',
      detectionReason: 'Test environment',
    });
  }),

  http.get('/api/config/:file', ({ params }) => {
    return HttpResponse.json({
      content: `# Test ${params.file}`,
    });
  }),

  http.post('/api/config/:file', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/loop/start', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/loop/stop', () => {
    return HttpResponse.json({ success: true });
  }),

  // Mock WebSocket connection
  wsServer.addEventListener('connection', ({ client }) => {
    // Send initial state on connection
    client.send(JSON.stringify({
      type: 'loop:status',
      payload: { status: 'idle', iterations: 0 },
    }));
    client.send(JSON.stringify({
      type: 'tasks:update',
      payload: [],
    }));
    client.send(JSON.stringify({
      type: 'git:update',
      payload: { branch: 'main', status: 'clean' },
    }));
    client.send(JSON.stringify({
      type: 'config:update',
      payload: { hasPRD: false, hasAudience: false },
    }));
    client.send(JSON.stringify({
      type: 'project:info',
      payload: { targetProjectPath: '/test', mode: 'embedded' },
    }));
  }),
];

// Create MSW server
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};
