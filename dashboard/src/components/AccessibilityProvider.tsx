/* eslint-disable react-refresh/only-export-components -- context pattern requires exporting hook alongside provider */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AccessibilityContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announceStatus: (status: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage(message);
      // Clear after announcement
      setTimeout(() => setAssertiveMessage(''), 1000);
    } else {
      setPoliteMessage(message);
      // Clear after announcement
      setTimeout(() => setPoliteMessage(''), 1000);
    }
  }, []);

  const announceStatus = useCallback((status: string) => {
    setStatusMessage(status);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ announce, announceStatus }}>
      {/* Skip to content link - visible on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-wiggum-cyan focus:text-black focus:rounded-md focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Live regions for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>

      {/* Status region for loop status updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="loop-status-region"
      >
        {statusMessage}
      </div>

      {children}
    </AccessibilityContext.Provider>
  );
}

export default AccessibilityProvider;
