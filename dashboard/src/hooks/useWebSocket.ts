import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage } from '../types';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WSMessage) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (message: WSMessage) => void;
  lastMessage: WSMessage | null;
  reconnect: () => void;
  error: string | null;
}

export function useWebSocket({
  url,
  onMessage,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);

        // Auto-reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setError('Max reconnection attempts reached');
        }
      };

      wsRef.current.onerror = () => {
        setError('WebSocket error');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          setLastMessage(message);
          onMessage?.(message);
        } catch {
          console.error('Failed to parse WebSocket message:', event.data);
        }
      };
    } catch (err) {
      setError(`Failed to connect: ${err}`);
    }
  }, [url, onMessage, reconnectInterval, maxReconnectAttempts]);

  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    isConnected,
    send,
    lastMessage,
    reconnect,
    error,
  };
}
