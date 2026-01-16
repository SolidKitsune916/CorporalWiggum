#!/usr/bin/env npx tsx
/**
 * Functionality Validation CLI Runner
 *
 * Runs functionality and UI validation checks and outputs a report.
 * Used by loop.sh to catch missing functionality during development.
 *
 * Usage:
 *   npx tsx scripts/validate-functionality.ts [project-path]
 *
 * Exit codes:
 *   0 - No critical issues found
 *   1 - Critical issues found (dead handlers, missing WS handlers)
 *   2 - Error running validation
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Dynamic imports since we're in a separate scripts directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardServerPath = path.join(__dirname, '../dashboard/server');

async function main() {
  const projectPath = process.argv[2] || process.cwd();

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Functionality Validation');
  console.log(`   Project: ${projectPath}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // Import validators dynamically
    const { FunctionalityChecker } = await import(
      path.join(dashboardServerPath, 'functionalityChecker.js')
    );
    const { UIValidator } = await import(
      path.join(dashboardServerPath, 'uiValidator.js')
    );

    // Run functionality checks
    console.log('Running functionality checks...');
    const funcChecker = new FunctionalityChecker(projectPath);
    const funcResult = await funcChecker.check();

    // Run UI validation
    console.log('Running UI validation...');
    const uiValidator = new UIValidator(projectPath);
    const uiResult = await uiValidator.validate();

    // Output summary
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Results Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Functionality checks
    console.log('Functionality Checks:');
    console.log(`  Dead Handlers:      ${funcResult.deadHandlers.length}`);
    console.log(`  Missing WS Handlers: ${funcResult.missingWsHandlers.length}`);
    console.log(`  Orphan State:       ${funcResult.orphanState.length}`);
    console.log('');

    // UI Validation
    console.log('UI Validation:');
    console.log(`  Button Issues:      ${uiResult.buttonIssues.length}`);
    console.log(`  Form Issues:        ${uiResult.formIssues.length}`);
    console.log(`  Async Issues:       ${uiResult.asyncIssues.length}`);
    console.log('');

    // Calculate totals
    const criticalCount =
      funcResult.deadHandlers.length +
      funcResult.missingWsHandlers.length +
      uiResult.buttonIssues.filter((b) => b.issue === 'no-handler').length;

    const warningCount =
      funcResult.orphanState.length +
      uiResult.asyncIssues.length +
      uiResult.formIssues.length;

    const totalCount = criticalCount + warningCount;

    // Output details if issues found
    if (funcResult.deadHandlers.length > 0) {
      console.log('🚨 Dead Handlers:');
      for (const h of funcResult.deadHandlers.slice(0, 10)) {
        console.log(`   ${h.file}:${h.line} - ${h.reason}`);
      }
      if (funcResult.deadHandlers.length > 10) {
        console.log(`   ... and ${funcResult.deadHandlers.length - 10} more`);
      }
      console.log('');
    }

    if (funcResult.missingWsHandlers.length > 0) {
      console.log('🚨 Missing WebSocket Handlers:');
      for (const h of funcResult.missingWsHandlers.slice(0, 10)) {
        console.log(`   ${h.sentFrom}:${h.line} - type: "${h.messageType}"`);
      }
      if (funcResult.missingWsHandlers.length > 10) {
        console.log(`   ... and ${funcResult.missingWsHandlers.length - 10} more`);
      }
      console.log('');
    }

    if (uiResult.buttonIssues.length > 0) {
      console.log('⚠️  Button Issues:');
      for (const b of uiResult.buttonIssues.slice(0, 10)) {
        console.log(`   ${b.file}:${b.line} - ${b.buttonText}: ${b.issue}`);
      }
      if (uiResult.buttonIssues.length > 10) {
        console.log(`   ... and ${uiResult.buttonIssues.length - 10} more`);
      }
      console.log('');
    }

    // Write combined report
    const reportPath = path.join(projectPath, 'FUNCTIONALITY_REPORT.md');
    const report = [
      funcChecker.generateReport(funcResult),
      '',
      '---',
      '',
      uiValidator.generateReport(uiResult),
    ].join('\n');

    await fs.writeFile(reportPath, report, 'utf-8');
    console.log(`📝 Full report written to: FUNCTIONALITY_REPORT.md`);
    console.log('');

    // Final verdict
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (criticalCount > 0) {
      console.log(`❌ FAILED: ${criticalCount} critical issues found`);
      console.log('   Fix these before committing.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      process.exit(1);
    } else if (warningCount > 0) {
      console.log(`⚠️  PASSED with ${warningCount} warnings`);
      console.log('   Consider addressing these issues.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      process.exit(0);
    } else {
      console.log('✅ PASSED: No issues found');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error running validation:', err);
    process.exit(2);
  }
}

main();
