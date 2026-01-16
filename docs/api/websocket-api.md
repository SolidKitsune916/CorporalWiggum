# WebSocket API

The dashboard communicates with the backend via WebSocket at `ws://localhost:3001/ws`.

## Connection

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  console.log('Connected');
  // Request current session state
  ws.send(JSON.stringify({ type: 'session:current', payload: {} }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message.type, message.payload);
};
```

## Message Format

All messages follow this structure:

```typescript
interface Message {
  type: string;           // Message type identifier
  payload?: Record<string, unknown>;  // Message data
}
```

## Client → Server Commands

### Loop Control

```javascript
// Start loop
{ type: 'loop:start', payload: { mode: 'build', maxIterations: 10 } }

// Stop loop
{ type: 'loop:stop' }
```

### Configuration

```javascript
// Read file
{ type: 'config:read', payload: { file: 'IMPLEMENTATION_PLAN.md' } }

// Write file
{ type: 'config:write', payload: { file: 'IMPLEMENTATION_PLAN.md', content: '...' } }

// Refresh config
{ type: 'config:refresh' }
```

### Plan Generation

```javascript
// Generate plan
{ type: 'plan:generate', payload: { mode: 'plan', description: '...', usePrd: true } }

// Cancel generation
{ type: 'plan:cancel' }
```

### PRD Generation

```javascript
// Generate PRD
{ type: 'prd:generate', payload: { selectedDocs: ['README.md', 'docs/spec.md'] } }

// Cancel generation
{ type: 'prd:cancel' }
```

### Project Operations

```javascript
// Scan project
{ type: 'project:scan' }
```

### Agent Management

```javascript
// List available agents
{ type: 'agents:list' }

// List repo agents
{ type: 'agents:list-repo' }

// Install agent globally
{ type: 'agents:install-global', payload: { agentId: 'react-typescript-expert' } }

// Install agent to project
{ type: 'agents:install-project', payload: { agentId: 'react-typescript-expert' } }
```

## Server → Client Messages

### Loop Status

```javascript
{ type: 'loop:status', payload: { running: true, mode: 'build', iteration: 5, maxIterations: 10 } }
{ type: 'loop:log', payload: { message: 'Working on task...', timestamp: '...' } }
```

### Task Updates

```javascript
{ type: 'tasks:update', payload: { tasks: [...], completed: 5, total: 10 } }
```

### Git Updates

```javascript
{ type: 'git:update', payload: { branch: 'main', uncommittedCount: 0, commits: [...] } }
```

### Configuration Updates

```javascript
{ type: 'config:update', payload: { hasAgentsMd: true, hasClaudeMd: true, ... } }
{ type: 'config:saved', payload: { file: 'IMPLEMENTATION_PLAN.md' } }
{ type: 'config:content', payload: { file: 'PRD.md', content: '...' } }
```

### Generation Messages

```javascript
// Plan generation
{ type: 'plan:status', payload: { generating: true, mode: 'plan' } }
{ type: 'plan:output', payload: { text: '...' } }
{ type: 'plan:complete', payload: { plan: '...' } }
{ type: 'plan:error', payload: { error: '...' } }

// PRD generation
{ type: 'prd:status', payload: { generating: true } }
{ type: 'prd:output', payload: { text: '...' } }
{ type: 'prd:complete', payload: { prd: '...', audience: '...' } }
{ type: 'prd:error', payload: { error: '...' } }
```

### Session Messages

```javascript
{ type: 'session:recovered', payload: { sessionId: '...', status: {...} } }
{ type: 'session:none', payload: { reason: 'no_active_session' } }
{ type: 'session:error', payload: { error: '...' } }
```

### Project Launcher Messages

```javascript
{ type: 'launcher:projects:list', payload: [...] }
{ type: 'launcher:instance:spawned', payload: { projectId: '...', port: 3002 } }
{ type: 'launcher:instance:stopped', payload: { projectId: '...' } }
```

## Error Handling

All error messages follow this pattern:

```javascript
{ type: '<domain>:error', payload: { error: 'Error message' } }
```

Examples:
- `plan:error`
- `prd:error`
- `config:error`
- `launcher:error`

## TypeScript Types

Full type definitions are available in:
`dashboard/src/types/index.ts`

Key types:
- `ServerMessage` - All possible server messages
- `ClientCommand` - All possible client commands
- `LoopStatus` - Loop state structure
- `TasksState` - Task list structure
