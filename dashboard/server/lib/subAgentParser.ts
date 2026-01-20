/**
 * SubAgentParser - Detects sub-agent spawns from Claude stream-json output
 *
 * Claude Code uses the Task tool to spawn sub-agents. When --output-format=stream-json
 * is used, tool_use blocks appear in the message content array with name: "Task".
 */

export interface SubAgentSpawnResult {
  spawned: boolean;
  toolUseId?: string;
}

interface StreamMessageContent {
  type: string;
  name?: string;
  id?: string;
  input?: unknown;
}

interface StreamMessage {
  type?: string;
  message?: {
    role?: string;
    content?: StreamMessageContent[];
  };
  parent_tool_use_id?: string | null;
}

/**
 * Parse a stream-json line for Task tool invocation (sub-agent spawn)
 *
 * @param line - A single line of stream-json output
 * @returns SubAgentSpawnResult indicating if a sub-agent was spawned
 */
export function parseSubAgentSpawn(line: string): SubAgentSpawnResult {
  // Quick pre-filter: skip lines that don't look like JSON with tool_use
  if (!line.startsWith('{') || !line.includes('"type"')) {
    return { spawned: false };
  }

  try {
    const msg: StreamMessage = JSON.parse(line);

    // Look for tool_use blocks with name="Task"
    if (msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === 'tool_use' && block.name === 'Task') {
          return { spawned: true, toolUseId: block.id };
        }
      }
    }

    return { spawned: false };
  } catch {
    // Not valid JSON or parse error - not a sub-agent spawn
    return { spawned: false };
  }
}

/**
 * Check if a stream line indicates we're inside a sub-agent context
 * (has parent_tool_use_id set to a non-null value)
 */
export function isInsideSubAgent(line: string): boolean {
  if (!line.startsWith('{')) {
    return false;
  }

  try {
    const msg: StreamMessage = JSON.parse(line);
    return msg.parent_tool_use_id != null;
  } catch {
    return false;
  }
}
