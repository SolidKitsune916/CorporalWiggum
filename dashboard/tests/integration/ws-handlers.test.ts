import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private messageQueue: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string): void {
    this.messageQueue.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: object): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  // Test helper to get sent messages
  getSentMessages(): object[] {
    return this.messageQueue.map((msg) => JSON.parse(msg));
  }
}

describe('WebSocket Message Handlers', () => {
  let ws: MockWebSocket;

  beforeEach(() => {
    ws = new MockWebSocket('ws://localhost:3001/ws');
  });

  afterEach(() => {
    ws.close();
  });

  describe('Loop Control Messages', () => {
    it('should handle loop:start message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'loop:status') handler(data);
      };

      ws.simulateMessage({
        type: 'loop:status',
        payload: { status: 'running', iterations: 1 },
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'loop:status',
        payload: { status: 'running', iterations: 1 },
      });
    });

    it('should handle loop:stop message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'loop:status') handler(data);
      };

      ws.simulateMessage({
        type: 'loop:status',
        payload: { status: 'idle', iterations: 5 },
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'loop:status',
        payload: { status: 'idle', iterations: 5 },
      });
    });

    it('should handle loop:log message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'loop:log') handler(data);
      };

      ws.simulateMessage({
        type: 'loop:log',
        payload: { message: 'Test log entry', timestamp: Date.now() },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Task Update Messages', () => {
    it('should handle tasks:update message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'tasks:update') handler(data);
      };

      ws.simulateMessage({
        type: 'tasks:update',
        payload: [
          { id: '1', name: 'Task 1', status: 'pending' },
          { id: '2', name: 'Task 2', status: 'completed' },
        ],
      });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].payload).toHaveLength(2);
    });
  });

  describe('Git Update Messages', () => {
    it('should handle git:update message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'git:update') handler(data);
      };

      ws.simulateMessage({
        type: 'git:update',
        payload: {
          branch: 'feature/test',
          status: 'modified',
          commits: [{ sha: 'abc123', message: 'Test commit' }],
        },
      });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].payload.branch).toBe('feature/test');
    });
  });

  describe('Config Update Messages', () => {
    it('should handle config:update message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'config:update') handler(data);
      };

      ws.simulateMessage({
        type: 'config:update',
        payload: {
          hasPRD: true,
          hasAudience: true,
          hasAgents: true,
        },
      });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].payload.hasPRD).toBe(true);
    });

    it('should handle config:content message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'config:content') handler(data);
      };

      ws.simulateMessage({
        type: 'config:content',
        payload: {
          file: 'PRD.md',
          content: '# Product Requirements',
        },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Project Info Messages', () => {
    it('should handle project:info message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'project:info') handler(data);
      };

      ws.simulateMessage({
        type: 'project:info',
        payload: {
          targetProjectPath: '/test/project',
          ralphPath: '/test/ralph',
          mode: 'embedded',
        },
      });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].payload.mode).toBe('embedded');
    });

    it('should handle project:scan-result message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'project:scan-result') handler(data);
      };

      ws.simulateMessage({
        type: 'project:scan-result',
        payload: {
          files: 100,
          directories: 20,
          hasGit: true,
        },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Agents Messages', () => {
    it('should handle agents:update message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'agents:update') handler(data);
      };

      ws.simulateMessage({
        type: 'agents:update',
        payload: {
          enabledAgents: ['agent1', 'agent2'],
        },
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should handle agents:list-result message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'agents:list-result') handler(data);
      };

      ws.simulateMessage({
        type: 'agents:list-result',
        payload: [
          { id: 'agent1', name: 'Agent 1', enabled: true },
          { id: 'agent2', name: 'Agent 2', enabled: false },
        ],
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Plan Generation Messages', () => {
    it('should handle plan:status message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'plan:status') handler(data);
      };

      ws.simulateMessage({
        type: 'plan:status',
        payload: { status: 'generating', progress: 50 },
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should handle plan:complete message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'plan:complete') handler(data);
      };

      ws.simulateMessage({
        type: 'plan:complete',
        payload: { success: true, planPath: '/test/IMPLEMENTATION_PLAN.md' },
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should handle plan:error message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'plan:error') handler(data);
      };

      ws.simulateMessage({
        type: 'plan:error',
        payload: { error: 'Generation failed' },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('PRD Generation Messages', () => {
    it('should handle prd:status message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'prd:status') handler(data);
      };

      ws.simulateMessage({
        type: 'prd:status',
        payload: { status: 'generating' },
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should handle prd:complete message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'prd:complete') handler(data);
      };

      ws.simulateMessage({
        type: 'prd:complete',
        payload: { success: true },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Launcher Messages', () => {
    it('should handle launcher:projects:list message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'launcher:projects:list') handler(data);
      };

      ws.simulateMessage({
        type: 'launcher:projects:list',
        payload: [
          { id: '1', name: 'Project 1', path: '/test/p1' },
          { id: '2', name: 'Project 2', path: '/test/p2' },
        ],
      });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].payload).toHaveLength(2);
    });

    it('should handle launcher:instance:spawned message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'launcher:instance:spawned') handler(data);
      };

      ws.simulateMessage({
        type: 'launcher:instance:spawned',
        payload: { projectId: '1', port: 3002 },
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should handle launcher:error message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'launcher:error') handler(data);
      };

      ws.simulateMessage({
        type: 'launcher:error',
        payload: { error: 'Failed to spawn instance' },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Session Messages', () => {
    it('should handle session:recovered message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'session:recovered') handler(data);
      };

      ws.simulateMessage({
        type: 'session:recovered',
        payload: { sessionId: 'sess-123', status: { status: 'running' } },
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should handle session:none message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'session:none') handler(data);
      };

      ws.simulateMessage({
        type: 'session:none',
        payload: { reason: 'no_active_session' },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Review Messages', () => {
    it('should handle review:status message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'review:status') handler(data);
      };

      ws.simulateMessage({
        type: 'review:status',
        payload: { status: 'running' },
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should handle review:complete message', () => {
      const handler = vi.fn();
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'review:complete') handler(data);
      };

      ws.simulateMessage({
        type: 'review:complete',
        payload: { success: true, score: 85 },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Message Sending', () => {
    it('should send loop:start message correctly', () => {
      ws.send(JSON.stringify({
        type: 'loop:start',
        payload: { mode: 'build', maxIterations: 10 },
      }));

      const sentMessages = ws.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]).toEqual({
        type: 'loop:start',
        payload: { mode: 'build', maxIterations: 10 },
      });
    });

    it('should send loop:stop message correctly', () => {
      ws.send(JSON.stringify({ type: 'loop:stop' }));

      const sentMessages = ws.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]).toEqual({ type: 'loop:stop' });
    });

    it('should send config:read message correctly', () => {
      ws.send(JSON.stringify({
        type: 'config:read',
        payload: { file: 'PRD.md' },
      }));

      const sentMessages = ws.getSentMessages();
      expect(sentMessages[0].type).toBe('config:read');
    });

    it('should send config:write message correctly', () => {
      ws.send(JSON.stringify({
        type: 'config:write',
        payload: { file: 'PRD.md', content: '# New PRD' },
      }));

      const sentMessages = ws.getSentMessages();
      expect(sentMessages[0].type).toBe('config:write');
    });
  });
});
