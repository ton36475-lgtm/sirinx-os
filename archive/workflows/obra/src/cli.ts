#!/usr/bin/env node

/**
 * OBRA CLI - Command Line Interface for OBRA Superpowers Workflow
 * 
 * Usage:
 *   obra [goal]
 *   solar [goal]
 *   automation [goal]
 *   research [topic]
 *   debug [issue]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { runObraWorkflow, ObraWorkflowInput } from './runObraWorkflow.js';

const program = new Command();

/**
 * Main CLI handler
 */
async function handleCommand(
  goal: string,
  options: {
    phase?: string;
    scope?: string[];
    constraints?: string[];
    maxAttempts?: number;
    verbose?: boolean;
  },
  commandType: string
) {
  console.log(chalk.blue.bold(`\n🚀 OBRA Superpowers Workflow (${commandType})\n`));
  console.log(chalk.gray(`Goal: ${goal}\n`));
  
  const spinner = ora('Initializing workflow...').start();
  
  try {
    // Parse phase
    let phase: ObraWorkflowInput['phase'] = 'all';
    if (options.phase && ['brainstorming', 'planning', 'subagent', 'tdd', 'debug'].includes(options.phase)) {
      phase = options.phase as any;
    }
    
    // Build input
    const input: ObraWorkflowInput = {
      goal,
      phase,
      context: {
        scope: options.scope || ['apps/**', 'services/**', 'packages/**'],
        constraints: options.constraints || ['No deploy', 'No push'],
        maxAttempts: options.maxAttempts || 3
      }
    };
    
    spinner.text = `Running ${commandType} workflow...`;
    
    // Execute workflow
    const result = await runObraWorkflow(input);
    
    spinner.stop();
    
    // Display results
    console.log(chalk.green.bold('\n✅ Workflow Complete\n'));
    console.log(chalk.gray(`Workflow ID: ${result.workflowId}`));
    console.log(chalk.gray(`Status: ${result.status}`));
    console.log(chalk.gray(`Duration: ${(result.durationMs / 1000).toFixed(2)}s\n`));
    
    if (options.verbose || result.status === 'failed') {
      console.log(chalk.blue.bold('Phases:\n'));
      result.phases.forEach((phase, i) => {
        const icon = phase.status === 'completed' ? '✅' : '❌';
        console.log(chalk.gray(`${i + 1}. ${icon} ${phase.phase} (${phase.durationMs}ms)`));
        
        if (options.verbose && phase.output) {
          console.log(chalk.dim(JSON.stringify(phase.output, null, 2).substring(0, 200) + '...'));
        }
      });
      console.log('');
    }
    
    console.log(chalk.blue.bold('Files Created:\n'));
    result.filesCreated.forEach(file => {
      console.log(chalk.gray(`  📄 ${file}`));
    });
    console.log('');
    
    console.log(chalk.blue.bold('Test Results:\n'));
    console.log(chalk.gray(`  ✅ Passed: ${result.testsPassed}`));
    console.log(chalk.gray(`  ❌ Failed: ${result.testsFailed}`));
    console.log('');
    
    if (result.status === 'completed') {
      console.log(chalk.green.bold('🎉 All phases completed successfully!\n'));
    } else {
      console.log(chalk.red.bold('⚠️  Workflow completed with errors.\n'));
      process.exit(1);
    }
    
  } catch (error) {
    spinner.stop();
    console.error(chalk.red.bold('\n❌ Workflow Failed\n'));
    console.error(chalk.red(String(error)));
    console.error('');
    process.exit(1);
  }
}

/**
 * Configure CLI commands
 */

// Main obra command
program
  .name('obra')
  .description('OBRA Superpowers Workflow - Generic 5-phase development methodology')
  .argument('[goal]', 'Development goal or task description')
  .option('-p, --phase <phase>', 'Specific phase to run (brainstorming|planning|subagent|tdd|debug)')
  .option('-s, --scope <paths...>', 'File scope (e.g., apps/** services/**)')
  .option('-c, --constraints <constraints...>', 'Constraints (e.g., "No deploy" "No push")')
  .option('-m, --max-attempts <number>', 'Maximum retry attempts', '3')
  .option('-v, --verbose', 'Verbose output')
  .action((goal, options) => handleCommand(goal, options, 'obra'));

// Solar command
program
  .command('solar [goal]')
  .description('Solar feature development workflow')
  .option('-p, --phase <phase>', 'Specific phase to run')
  .option('-s, --scope <paths...>', 'File scope')
  .option('-c, --constraints <constraints...>', 'Constraints')
  .option('-m, --max-attempts <number>', 'Maximum retry attempts', '3')
  .option('-v, --verbose', 'Verbose output')
  .action((goal, options) => handleCommand(goal || 'Solar feature development', options, 'solar'));

// Automation command
program
  .command('automation [goal]')
  .description('Automation workflow development')
  .option('-p, --phase <phase>', 'Specific phase to run')
  .option('-s, --scope <paths...>', 'File scope')
  .option('-c, --constraints <constraints...>', 'Constraints')
  .option('-m, --max-attempts <number>', 'Maximum retry attempts', '3')
  .option('-v, --verbose', 'Verbose output')
  .action((goal || 'Automation task', options) => handleCommand(goal, options, 'automation'));

// Research command
program
  .command('research [topic]')
  .description('Research and analysis workflow')
  .option('-p, --phase <phase>', 'Specific phase to run')
  .option('-s, --scope <paths...>', 'File scope')
  .option('-c, --constraints <constraints...>', 'Constraints')
  .option('-m, --max-attempts <number>', 'Maximum retry attempts', '3')
  .option('-v, --verbose', 'Verbose output')
  .action((topic || 'Research task', options) => handleCommand(topic, options, 'research'));

// Debug command
program
  .command('debug [issue]')
  .description('Debugging workflow (starts at Phase 5)')
  .option('-p, --phase <phase>', 'Specific phase to run')
  .option('-s, --scope <paths...>', 'File scope')
  .option('-c, --constraints <constraints...>', 'Constraints')
  .option('-m, --max-attempts <number>', 'Maximum retry attempts', '3')
  .option('-v, --verbose', 'Verbose output')
  .action((issue || 'Debug issue', options) => {
    options.phase = 'debug';
    handleCommand(issue, options, 'debug');
  });

// Parse and execute
program.parse();
