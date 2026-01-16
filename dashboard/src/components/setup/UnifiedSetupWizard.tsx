import type { WizardStep } from '../../hooks/useSetupWizard';
import type { ProjectConfig, DependencyStatus } from '../../types';
import { ProjectPathInfo } from './ProjectPathInfo';
import { ProjectInitializer } from './ProjectInitializer';
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Settings,
  FolderCheck,
  FileCheck,
  Wrench,
  PartyPopper,
} from 'lucide-react';

interface UnifiedSetupWizardProps {
  currentStep: WizardStep;
  projectConfig: ProjectConfig | null;
  dependencies: DependencyStatus[];
  missingFiles: string[];
  isLoading: boolean;
  error: string | null;
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  initializeFiles: (files: string[]) => void;
  overridePath: (path: string) => void;
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS: { id: WizardStep; label: string; icon: typeof Settings }[] = [
  { id: 'welcome', label: 'Welcome', icon: PartyPopper },
  { id: 'dependencies', label: 'Dependencies', icon: Settings },
  { id: 'path', label: 'Project Path', icon: FolderCheck },
  { id: 'init', label: 'Initialize', icon: FileCheck },
  { id: 'configure', label: 'Configure', icon: Wrench },
  { id: 'complete', label: 'Complete', icon: CheckCircle },
];

export function UnifiedSetupWizard({
  currentStep,
  projectConfig,
  dependencies,
  missingFiles,
  isLoading,
  error,
  goToStep,
  nextStep,
  prevStep,
  initializeFiles,
  overridePath,
  onComplete,
  onSkip,
}: UnifiedSetupWizardProps) {
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'welcome':
        return true;
      case 'dependencies':
        // Can proceed even with warnings (optional deps)
        return true;
      case 'path':
        return projectConfig !== null;
      case 'init':
        return true; // Can skip initialization
      case 'configure':
        return true;
      case 'complete':
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
          <div>
            <h1 className="text-xl font-bold">Ralph Wiggum V3 Setup</h1>
            <p className="text-sm text-muted-foreground">
              Let's get your project configured
            </p>
          </div>
          <button
            onClick={onSkip}
            className="p-2 hover:bg-muted rounded"
            title="Skip setup"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 border-b border-border overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => isCompleted && goToStep(step.id)}
                    disabled={!isCompleted}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">{step.label}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'welcome' && (
            <WelcomeStep projectConfig={projectConfig} />
          )}

          {currentStep === 'dependencies' && (
            <DependenciesStep dependencies={dependencies} />
          )}

          {currentStep === 'path' && (
            <ProjectPathInfo
              projectConfig={projectConfig}
              onOverride={overridePath}
              isLoading={isLoading}
            />
          )}

          {currentStep === 'init' && (
            <ProjectInitializer
              missingFiles={missingFiles}
              onInitialize={initializeFiles}
              isLoading={isLoading}
            />
          )}

          {currentStep === 'configure' && (
            <ConfigureStep projectConfig={projectConfig} />
          )}

          {currentStep === 'complete' && (
            <CompleteStep onComplete={onComplete} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/50">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {currentStep === 'complete' ? (
            <button
              onClick={onComplete}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <CheckCircle className="h-4 w-4" />
              Finish Setup
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed() || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Continue'}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components

function WelcomeStep({ projectConfig }: { projectConfig: ProjectConfig | null }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Welcome to Ralph Wiggum V3</h2>
        <p className="text-muted-foreground">
          The autonomous AI development loop system
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold text-blue-500 mb-2">Embedded Mode</h3>
          <p className="text-sm text-muted-foreground">
            Ralph is cloned into your project directory. Auto-detects the parent
            project.
          </p>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold text-purple-500 mb-2">Standalone Mode</h3>
          <p className="text-sm text-muted-foreground">
            Ralph is cloned anywhere. Point to your project via PROJECT_PATH.
          </p>
        </div>
      </div>

      {projectConfig && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm">
            <strong>Detected Mode:</strong>{' '}
            <span
              className={
                projectConfig.mode === 'embedded'
                  ? 'text-blue-500'
                  : 'text-purple-500'
              }
            >
              {projectConfig.mode === 'embedded' ? 'Embedded' : 'Standalone'}
            </span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {projectConfig.detectionReason}
          </p>
        </div>
      )}
    </div>
  );
}

function DependenciesStep({ dependencies }: { dependencies: DependencyStatus[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-2">Dependency Check</h2>
        <p className="text-muted-foreground">
          Verifying required tools are installed
        </p>
      </div>

      <div className="space-y-2">
        {dependencies.map((dep) => (
          <div
            key={dep.name}
            className={`flex items-center justify-between p-3 rounded-lg ${
              dep.installed
                ? 'bg-green-500/10 border border-green-500/20'
                : dep.required
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-yellow-500/10 border border-yellow-500/20'
            }`}
          >
            <div className="flex items-center gap-3">
              {dep.installed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-red-500" />
              )}
              <div>
                <span className="font-medium">{dep.name}</span>
                {dep.required && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (required)
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm">
              {dep.installed ? (
                <span className="text-green-500">{dep.version || 'installed'}</span>
              ) : (
                <a
                  href={dep.installInstructions}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Install
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigureStep({ projectConfig }: { projectConfig: ProjectConfig | null }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-2">Configure Your Project</h2>
        <p className="text-muted-foreground">
          Review your AGENTS.md configuration
        </p>
      </div>

      {projectConfig?.ralphFiles.agentsMd.exists ? (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">AGENTS.md found</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Your project configuration is ready. You can edit it from the
            dashboard's Setup tab.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-600">
            No AGENTS.md found. Consider creating one from the dashboard's Setup
            tab to configure build commands.
          </p>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>AGENTS.md should contain:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Build commands (build, dev, test)</li>
          <li>Validation commands (typecheck, lint)</li>
          <li>Operational notes for your project</li>
        </ul>
      </div>
    </div>
  );
}

function CompleteStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="p-4 bg-green-500/10 rounded-full">
          <PartyPopper className="h-12 w-12 text-green-500" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
        <p className="text-muted-foreground">
          You're ready to start using Ralph Wiggum V3
        </p>
      </div>

      <div className="text-left p-4 bg-muted rounded-lg space-y-3">
        <h3 className="font-semibold">Next Steps:</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="font-mono bg-primary/10 px-1 rounded">1</span>
            Start the loop in <strong>Build</strong> mode to work on tasks
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono bg-primary/10 px-1 rounded">2</span>
            Use <strong>Plan</strong> mode to generate implementation plans
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono bg-primary/10 px-1 rounded">3</span>
            Monitor costs and telemetry in real-time
          </li>
        </ul>
      </div>

      <button
        onClick={onComplete}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
      >
        Get Started
      </button>
    </div>
  );
}
