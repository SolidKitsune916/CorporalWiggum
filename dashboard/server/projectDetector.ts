import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface FileStatus {
  exists: boolean;
  path: string;
  lastModified?: Date;
}

interface DependencyStatus {
  name: string;
  required: boolean;
  installed: boolean;
  version?: string;
  minVersion?: string;
  installInstructions?: string;
}

interface GitStatus {
  isRepo: boolean;
  branch?: string;
  hasUncommittedChanges?: boolean;
}

interface ProjectConfig {
  name: string;
  path: string;
  mode: 'embedded' | 'standalone';
  detectionReason: string;
  ralphFiles: {
    agentsMd: FileStatus;
    claudeMd: FileStatus;
    implementationPlan: FileStatus;
    audienceJtbd: FileStatus;
    prd: FileStatus;
  };
  dependencies: DependencyStatus[];
  git: GitStatus;
}

interface RalphConfig {
  maxIterations: number;
  maxRuntime: number;
  costLimit: number;
  completionPromise: string;
  loopDetectionThreshold: number;
  backoffEnabled: boolean;
  rollbackOnFailure: boolean;
}

export class ProjectDetector {
  private serverDir: string;
  private projectConfig: ProjectConfig | null = null;
  private ralphConfig: RalphConfig;

  constructor(serverDir: string) {
    this.serverDir = serverDir;
    this.ralphConfig = {
      maxIterations: 100,
      maxRuntime: 14400,
      costLimit: 50,
      completionPromise: 'ALL_TASKS_COMPLETE',
      loopDetectionThreshold: 0.9,
      backoffEnabled: true,
      rollbackOnFailure: true,
    };
    this.detectProject();
  }

  private async detectProject(): Promise<void> {
    // Dashboard is in RalphWiggumV3/dashboard/server
    // So root is ../../
    const ralphRoot = path.resolve(this.serverDir, '../..');
    let projectPath = process.env.PROJECT_PATH;
    let mode: 'embedded' | 'standalone' = 'standalone';
    let detectionReason = '';

    if (projectPath) {
      // Explicit path set
      detectionReason = 'PROJECT_PATH environment variable is set';
    } else {
      // Try to detect embedded mode
      const parentDir = path.resolve(ralphRoot, '..');

      // Check if parent has indicators of being a project
      const parentHasPackageJson = await this.fileExists(
        path.join(parentDir, 'package.json')
      );
      const parentHasGit = await this.fileExists(path.join(parentDir, '.git'));
      const parentHasAgents = await this.fileExists(
        path.join(parentDir, 'AGENTS.md')
      );

      if (parentHasPackageJson || parentHasGit || parentHasAgents) {
        mode = 'embedded';
        projectPath = parentDir;
        detectionReason = `Detected parent project with ${parentHasGit ? '.git' : parentHasPackageJson ? 'package.json' : 'AGENTS.md'}`;
      } else {
        // Standalone mode - use the Ralph directory itself for development
        mode = 'standalone';
        projectPath = ralphRoot;
        detectionReason = 'No parent project detected. Using Ralph directory.';
      }
    }

    // Check Ralph files
    const ralphFiles = await this.checkRalphFiles(projectPath);

    // Check git status
    const git = await this.checkGitStatus(projectPath);

    // Get project name
    const name = path.basename(projectPath);

    this.projectConfig = {
      name,
      path: projectPath,
      mode,
      detectionReason,
      ralphFiles,
      dependencies: [],
      git,
    };
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async checkRalphFiles(projectPath: string): Promise<ProjectConfig['ralphFiles']> {
    const checkFile = async (fileName: string): Promise<FileStatus> => {
      const filePath = path.join(projectPath, fileName);
      const exists = await this.fileExists(filePath);
      let lastModified: Date | undefined;

      if (exists) {
        try {
          const stats = await fs.stat(filePath);
          lastModified = stats.mtime;
        } catch {
          // Ignore stat errors
        }
      }

      return { exists, path: filePath, lastModified };
    };

    return {
      agentsMd: await checkFile('AGENTS.md'),
      claudeMd: await checkFile('CLAUDE.md'),
      implementationPlan: await checkFile('IMPLEMENTATION_PLAN.md'),
      audienceJtbd: await checkFile('AUDIENCE_JTBD.md'),
      prd: await checkFile('PRD.md'),
    };
  }

  private async checkGitStatus(projectPath: string): Promise<GitStatus> {
    const gitDir = path.join(projectPath, '.git');
    const isRepo = await this.fileExists(gitDir);

    if (!isRepo) {
      return { isRepo: false };
    }

    try {
      const branch = execSync('git branch --show-current', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();

      const status = execSync('git status --porcelain', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();

      return {
        isRepo: true,
        branch: branch || 'main',
        hasUncommittedChanges: status.length > 0,
      };
    } catch {
      return { isRepo: true };
    }
  }

  async checkDependencies(): Promise<DependencyStatus[]> {
    const dependencies: DependencyStatus[] = [
      {
        name: 'Node.js',
        required: true,
        installed: false,
        minVersion: '18.0.0',
        installInstructions: 'https://nodejs.org',
      },
      {
        name: 'npm',
        required: true,
        installed: false,
        minVersion: '8.0.0',
        installInstructions: 'Included with Node.js',
      },
      {
        name: 'Git',
        required: false,
        installed: false,
        minVersion: '2.30.0',
        installInstructions: 'https://git-scm.com',
      },
      {
        name: 'Claude CLI',
        required: true,
        installed: false,
        installInstructions: 'https://claude.ai/cli',
      },
      {
        name: 'Bash',
        required: true,
        installed: false,
        installInstructions: 'Included in Unix/macOS, Git Bash for Windows',
      },
    ];

    for (const dep of dependencies) {
      try {
        let version = '';
        switch (dep.name) {
          case 'Node.js':
            version = execSync('node --version', { encoding: 'utf-8' }).trim();
            break;
          case 'npm':
            version = execSync('npm --version', { encoding: 'utf-8' }).trim();
            break;
          case 'Git':
            version = execSync('git --version', { encoding: 'utf-8' }).trim();
            break;
          case 'Claude CLI':
            version = execSync('claude --version', { encoding: 'utf-8' }).trim();
            break;
          case 'Bash':
            version = execSync('bash --version', { encoding: 'utf-8' }).split('\n')[0];
            break;
        }
        dep.installed = true;
        dep.version = version.replace(/[^0-9.]/g, '').substring(0, 10);
      } catch {
        dep.installed = false;
      }
    }

    if (this.projectConfig) {
      this.projectConfig.dependencies = dependencies;
    }

    return dependencies;
  }

  async overridePath(newPath: string): Promise<{ success: boolean; message: string }> {
    // Verify path exists
    const exists = await this.fileExists(newPath);
    if (!exists) {
      return { success: false, message: 'Path does not exist' };
    }

    // Update env file
    try {
      const envPath = path.resolve(this.serverDir, '../../.env');
      let envContent = '';

      try {
        envContent = await fs.readFile(envPath, 'utf-8');
      } catch {
        // Create new .env
        envContent = '';
      }

      // Update or add PROJECT_PATH
      if (envContent.includes('PROJECT_PATH=')) {
        envContent = envContent.replace(
          /PROJECT_PATH=.*/,
          `PROJECT_PATH=${newPath}`
        );
      } else {
        envContent += `\nPROJECT_PATH=${newPath}`;
      }

      await fs.writeFile(envPath, envContent.trim() + '\n', 'utf-8');

      // Update internal state
      process.env.PROJECT_PATH = newPath;
      await this.detectProject();

      return { success: true, message: 'Path updated. Restart may be required.' };
    } catch (error) {
      return { success: false, message: `Failed to update path: ${error}` };
    }
  }

  refresh(): void {
    this.detectProject();
  }

  getProjectConfig(): ProjectConfig | null {
    return this.projectConfig;
  }

  getConfig(): RalphConfig {
    return { ...this.ralphConfig };
  }

  updateConfig(updates: Partial<RalphConfig>): void {
    this.ralphConfig = { ...this.ralphConfig, ...updates };
  }
}
