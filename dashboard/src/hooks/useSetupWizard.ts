import { useState, useCallback, useEffect } from 'react';
import type { ProjectConfig, DependencyStatus, WSMessage } from '../types';

export type WizardStep =
  | 'welcome'
  | 'dependencies'
  | 'path'
  | 'init'
  | 'configure'
  | 'complete';

interface UseSetupWizardOptions {
  send: (message: WSMessage) => void;
  isConnected: boolean;
}

interface UseSetupWizardReturn {
  currentStep: WizardStep;
  projectConfig: ProjectConfig | null;
  dependencies: DependencyStatus[];
  missingFiles: string[];
  isLoading: boolean;
  error: string | null;
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  handleMessage: (message: WSMessage) => void;
  initializeFiles: (files: string[]) => void;
  overridePath: (path: string) => void;
  isComplete: boolean;
  markComplete: () => void;
  resetWizard: () => void;
}

const STEP_ORDER: WizardStep[] = [
  'welcome',
  'dependencies',
  'path',
  'init',
  'configure',
  'complete',
];

const STORAGE_KEY = 'ralph-wiggum-setup-complete';

export function useSetupWizard({
  send,
  isConnected,
}: UseSetupWizardOptions): UseSetupWizardReturn {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [dependencies, setDependencies] = useState<DependencyStatus[]>([]);
  const [missingFiles, setMissingFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Load completion state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setIsComplete(true);
    }
  }, []);

  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'project:info':
        setProjectConfig(message.payload as ProjectConfig);
        setIsLoading(false);

        // Check for missing files
        const config = message.payload as ProjectConfig;
        const missing: string[] = [];
        if (!config.ralphFiles.agentsMd.exists) missing.push('AGENTS.md');
        if (!config.ralphFiles.claudeMd.exists) missing.push('CLAUDE.md');
        if (!config.ralphFiles.implementationPlan.exists)
          missing.push('IMPLEMENTATION_PLAN.md');
        setMissingFiles(missing);
        break;

      case 'project:path-override-result': {
        const result = message.payload as { success: boolean; message: string };
        if (result.success) {
          setError(null);
          // Refresh project info
          send({ type: 'project:info' });
        } else {
          setError(result.message);
        }
        setIsLoading(false);
        break;
      }

      case 'project:init-result': {
        const initResult = message.payload as { success: boolean; created: string[] };
        if (initResult.success) {
          setError(null);
          // Remove initialized files from missing list
          setMissingFiles((prev) =>
            prev.filter((f) => !initResult.created.includes(f))
          );
          // Refresh project info
          send({ type: 'project:info' });
        } else {
          setError('Failed to initialize files');
        }
        setIsLoading(false);
        break;
      }

      case 'dependencies:status':
        setDependencies(message.payload as DependencyStatus[]);
        break;
    }
  }, [send]);

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
    setError(null);
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
      setError(null);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
      setError(null);
    }
  }, [currentStep]);

  const initializeFiles = useCallback(
    (files: string[]) => {
      if (!isConnected) return;
      setIsLoading(true);
      send({
        type: 'project:init',
        payload: { files },
      });
    },
    [send, isConnected]
  );

  const overridePath = useCallback(
    (path: string) => {
      if (!isConnected) return;
      setIsLoading(true);
      send({
        type: 'project:path-override',
        payload: { newPath: path },
      });
    },
    [send, isConnected]
  );

  const markComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsComplete(true);
  }, []);

  const resetWizard = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsComplete(false);
    setCurrentStep('welcome');
  }, []);

  // Request initial project info when connected
  useEffect(() => {
    if (isConnected) {
      setIsLoading(true);
      send({ type: 'project:info' });
      send({ type: 'dependencies:check' });
    }
  }, [isConnected, send]);

  return {
    currentStep,
    projectConfig,
    dependencies,
    missingFiles,
    isLoading,
    error,
    goToStep,
    nextStep,
    prevStep,
    handleMessage,
    initializeFiles,
    overridePath,
    isComplete,
    markComplete,
    resetWizard,
  };
}
