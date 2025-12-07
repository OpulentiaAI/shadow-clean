import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SocketClient } from './socket-client';
import type { FileSystemEvent } from '@repo/types';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    connected: false,
    disconnect: vi.fn(),
    id: 'mock-socket-id',
  })),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SocketClient-unit-test', () => {
  let socketClient: SocketClient;
  let mockSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get mock socket instance
    const { io } = require('socket.io-client');
    mockSocket = io();

    socketClient = new SocketClient('http://localhost:4000', 'task-123');
  });

  afterEach(() => {
    if (socketClient) {
      socketClient.disconnect();
    }
  });

  it('initializes with server URL and task ID', () => {
    expect(socketClient).toBeDefined();
    expect((socketClient as any).taskId).toBe('task-123');
    expect((socketClient as any).socket).toBeDefined();
  });

  it('sets up event handlers on construction', () => {
    // Verify socket event handlers were registered
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('task-joined', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('config-update', expect.any(Function));
  });

  it('emits join-task on connection', () => {
    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      (call: any) => call[0] === 'connect'
    )?.[1];

    if (connectHandler) {
      // Mark as connected
      (socketClient as any).connected = true;
      mockSocket.connected = true;

      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('join-task', {
        taskId: 'task-123',
        podId: expect.any(String),
      });
    }
  });

  it('emits filesystem change events when connected', () => {
    // Mark as connected
    (socketClient as any).connected = true;
    mockSocket.connected = true;

    const event: FileSystemEvent = {
      taskId: 'task-123',
      type: 'file-modified',
      path: '/test/file.txt',
      timestamp: Date.now(),
    };

    socketClient.emitFileSystemChange(event);

    expect(mockSocket.emit).toHaveBeenCalledWith('fs-change', event);
  });

  it('does not emit filesystem changes when disconnected', () => {
    // Ensure disconnected state
    (socketClient as any).connected = false;
    mockSocket.connected = false;

    const event: FileSystemEvent = {
      taskId: 'task-123',
      type: 'file-modified',
      path: '/test/file.txt',
      timestamp: Date.now(),
    };

    socketClient.emitFileSystemChange(event);

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('sends heartbeat when connected', () => {
    // Mark as connected
    (socketClient as any).connected = true;
    mockSocket.connected = true;

    socketClient.sendHeartbeat();

    expect(mockSocket.emit).toHaveBeenCalledWith('heartbeat');
  });

  it('returns correct connection status', () => {
    // Test disconnected state
    (socketClient as any).connected = false;
    mockSocket.connected = false;
    expect(socketClient.isConnected()).toBe(false);

    // Test connected state
    (socketClient as any).connected = true;
    mockSocket.connected = true;
    expect(socketClient.isConnected()).toBe(true);
  });

  it('provides connection statistics', () => {
    const stats = socketClient.getStats();

    expect(stats).toHaveProperty('connected');
    expect(stats).toHaveProperty('reconnectAttempts');
    expect(stats).toHaveProperty('taskId', 'task-123');
    expect(stats).toHaveProperty('socketId');
  });

  it('disconnects gracefully', () => {
    socketClient.disconnect();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});

describe('SocketClient-integration-test', () => {
  it.skipIf(!process.env.SOCKET_SERVER_URL)('connects to real socket server', async () => {
    // This test requires a real socket server running
    const serverUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:4000';
    const socketClient = new SocketClient(serverUrl, 'integration-test-task');

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if connected
      const stats = socketClient.getStats();
      expect(stats.taskId).toBe('integration-test-task');

      // Clean up
      socketClient.disconnect();
    },
    { timeout: 10000 }
  );
});
