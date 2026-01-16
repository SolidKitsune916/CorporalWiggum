# WebSocket API

The WIGGUM dashboard communicates with the backend via WebSocket for real-time updates.

## Connection

### Endpoint

```
ws://localhost:3001/ws
```

### Connection Example

```typescript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  console.log('Connected to WIGGUM');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};

ws.onclose = () => {
  console.log('Disconnected from WIGGUM');
};
```

## Message Format

All messages follow this structure:

```typescript
interface Message {
  type: string;
  payload: unknown;
}
```

## Client → Server Messages

### Loop Control

#### Start Loop

```typescript
{
  type: 'loop:start',
  payload: {
    mode: 'build' | 'plan' | 'plan-slc' | 'plan-work',
    maxIterations?: number,
    workScope?: string  // For plan-work mode
  }
}
```

#### Stop Loop

```typescript
{
  type: 'loop:stop'
}
```

### Configuration

#### Read Config File

```typescript
{
  type: 'config:read',
  payload: { file: 'AGENTS.md' | 'CLAUDE.md' | 'PRD.md' | 'AUDIENCE_JTBD.md' }
}
```

#### Write Config File

```typescript
{
  type: 'config:write',
  payload: {
    file: string,
    content: string
  }
}
```

#### Refresh Config

```typescript
{
  type: 'config:refresh'
}
```

### Project Operations

#### Scan Project

```typescript
{
  type: 'project:scan'
}
```

#### Get Project Info

```typescript
{
  type: 'project:info'
}
```

### Agent Management

#### List Agents

```typescript
{
  type: 'agents:list'
}
```

#### Toggle Agent

```typescript
{
  type: 'agents:toggle',
  payload: {
    agentId: string,
    enabled: boolean
  }
}
```

### Plan Generation

#### Generate Plan

```typescript
{
  type: 'plan:generate',
  payload: {
    mode: 'plan' | 'plan-slc' | 'plan-work',
    workScope?: string,
    usePrdContext?: boolean
  }
}
```

#### Cancel Plan Generation

```typescript
{
  type: 'plan:cancel'
}
```

## Server → Client Messages

### Loop Status Updates

```typescript
{
  type: 'loop:status',
  payload: {
    running: boolean,
    iteration: number,
    maxIterations?: number,
    currentTask?: string,
    mode: string,
    startTime?: string
  }
}
```

### Loop Logs

```typescript
{
  type: 'loop:log',
  payload: {
    timestamp: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: unknown
  }
}
```

### Task Updates

```typescript
{
  type: 'tasks:update',
  payload: Array<{
    id: string,
    text: string,
    completed: boolean,
    inProgress: boolean
  }>
}
```

### Git Updates

```typescript
{
  type: 'git:update',
  payload: {
    branch: string,
    repoName?: string,
    status: 'clean' | 'modified',
    modifiedFiles: string[],
    recentCommits: Array<{
      hash: string,
      message: string,
      date: string
    }>
  }
}
```

### Configuration Updates

```typescript
{
  type: 'config:update',
  payload: {
    hasPRD: boolean,
    hasAudience: boolean,
    hasAgentsMd: boolean,
    hasClaudeMd: boolean,
    hasImplementationPlan: boolean
  }
}
```

### Plan Generation Events

```typescript
// Status
{
  type: 'plan:status',
  payload: {
    status: 'idle' | 'generating' | 'complete' | 'error'
  }
}

// Output stream
{
  type: 'plan:output',
  payload: { text: string }
}

// Completion
{
  type: 'plan:complete',
  payload: {
    success: boolean,
    planPath: string
  }
}

// Error
{
  type: 'plan:error',
  payload: { error: string }
}
```

### Session Management

```typescript
// Session recovered (after browser refresh)
{
  type: 'session:recovered',
  payload: {
    sessionId: string,
    status: LoopStatus
  }
}

// No active session
{
  type: 'session:none',
  payload: { reason: string }
}
```

## Error Handling

### Connection Errors

```typescript
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  if (event.code !== 1000) {
    console.error('Abnormal close:', event.code, event.reason);
    // Implement reconnection logic
  }
};
```

### Reconnection

```typescript
function connect() {
  const ws = new WebSocket('ws://localhost:3001/ws');

  ws.onclose = () => {
    // Reconnect after 3 seconds
    setTimeout(connect, 3000);
  };

  return ws;
}
```

## Example: Custom Monitor

```typescript
class WIGGUMMonitor {
  private ws: WebSocket;
  private listeners: Map<string, Function[]> = new Map();

  constructor(url = 'ws://localhost:3001/ws') {
    this.connect(url);
  }

  private connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);
      this.emit(type, payload);
    };
  }

  on(type: string, callback: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  private emit(type: string, payload: unknown) {
    this.listeners.get(type)?.forEach(cb => cb(payload));
  }

  startLoop(mode: string, maxIterations?: number) {
    this.ws.send(JSON.stringify({
      type: 'loop:start',
      payload: { mode, maxIterations }
    }));
  }

  stopLoop() {
    this.ws.send(JSON.stringify({ type: 'loop:stop' }));
  }
}

// Usage
const monitor = new WIGGUMMonitor();
monitor.on('loop:status', (status) => {
  console.log('Loop status:', status);
});
monitor.on('loop:log', (log) => {
  console.log(`[${log.level}] ${log.message}`);
});
```

## Next Steps

- [Integrations](/integrations/github) - Connect external services
- [Architecture Overview](/architecture/overview) - System design
