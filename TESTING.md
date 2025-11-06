# Shadow Testing Guide

This document provides comprehensive information about the testing infrastructure for the Shadow platform.

## Overview

We use Vitest as our testing framework across all packages. Tests are organized following a specific philosophy that emphasizes testing behavior over implementation details.

## Test Structure

### Test File Organization

Each test file combines both unit tests and integration tests in a single `.test.ts` file:

```typescript
// Unit tests first (2-3 tests)
describe('ComponentName-unit-test', () => {
  // Test initialization
  it('initializes with required dependencies', () => { ... });

  // Test core behavior
  it('executes main functionality correctly', () => { ... });

  // Test error handling
  it('handles errors gracefully', () => { ... });
});

// Integration test last (1 test)
describe('ComponentName-integration-test', () => {
  it.skipIf(!process.env.REQUIRED_KEY)(
    'executes with real services',
    async () => { ... }
  );
});
```

### Testing Philosophy

1. **Test behavior, not implementation** - Verify that methods are called at the right time and state changes correctly
2. **Access private fields freely** - Use bracket notation: `component['_privateField']`
3. **Use Vitest exclusively** - Always import from 'vitest'
4. **Simple is better** - Keep tests intuitive and straightforward
5. **Don't test mock behavior** - Test how code reacts to mocks, not that mocks return what you configured

## Test Coverage

### Server Package (`apps/server`)

#### Critical Services Tested

1. **TaskInitializationEngine** (`src/initialization/index.test.ts`)
   - Tests workspace preparation (local and remote modes)
   - Tests initialization step execution
   - Tests error handling and task failure scenarios

2. **StreamProcessor** (`src/agent/llm/streaming/stream-processor.test.ts`)
   - Tests LLM streaming with AI SDK
   - Tests model configuration for Anthropic and OpenAI
   - Tests stream error handling
   - Tests tool integration

3. **ChunkHandlers** (`src/agent/llm/streaming/chunk-handlers.test.ts`)
   - Tests text delta processing
   - Tests tool call registration and validation
   - Tests tool result handling
   - Tests reasoning and error chunks

4. **Execution Layer** (`src/execution/index.test.ts`)
   - Tests local vs remote mode switching
   - Tests tool executor creation
   - Tests workspace manager creation
   - Tests git service creation

5. **Socket Server** (`src/socket.test.ts`)
   - Tests Socket.IO server initialization
   - Tests stream chunk emission
   - Tests task room management
   - Tests connection handling

### Sidecar Package (`apps/sidecar`)

#### Critical Services Tested

1. **SocketClient** (`src/services/socket-client.test.ts`)
   - Tests connection initialization
   - Tests event handler setup
   - Tests filesystem change emission
   - Tests heartbeat mechanism
   - Tests connection status tracking

## Running Tests

### Prerequisites

```bash
# Install dependencies in root
npm install

# Build workspace packages (if network allows)
npm run generate
npm run build
```

### Run All Tests

```bash
# Server tests
cd apps/server
npm test

# Sidecar tests
cd apps/sidecar
npm test
```

### Run Specific Test Files

```bash
# Run a single test file
npm test -- src/initialization/index.test.ts

# Run tests in watch mode
npm test:watch

# Run with UI
npm test:ui
```

### Run Tests with Coverage

```bash
npm test:coverage
```

## Integration Tests

Integration tests require specific environment variables:

### Server Integration Tests

- `ANTHROPIC_API_KEY` - Required for LLM streaming integration tests
- `DATABASE_URL` - Required for database integration tests
- `RUN_INTEGRATION_TESTS=1` - Enable general integration tests

### Sidecar Integration Tests

- `SOCKET_SERVER_URL` - Socket server URL for connection tests

Example:
```bash
ANTHROPIC_API_KEY=sk-ant-... npm test:run
```

## Troubleshooting

### Package Resolution Issues

If you encounter errors like "Failed to resolve entry for package @repo/db":

1. Ensure workspace packages are built:
   ```bash
   cd packages/db && npm run generate && npm run build
   cd packages/types && npm run build
   ```

2. Check vitest.config.ts has proper alias configuration

3. Verify vitest.setup.ts is mocking external dependencies

### Prisma Client Issues

If Prisma client generation fails due to network issues:

- Tests use mocked Prisma client by default
- See `vitest.setup.ts` for mock configuration
- Integration tests that need real database will be skipped

### Mock Setup

All external dependencies are mocked in test files using Vitest's `vi.mock()`:

```typescript
vi.mock('@repo/db', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
```

## Best Practices

### 1. Keep Tests Simple

```typescript
// GOOD - Tests behavior directly
it('executes initialization steps in sequence', async () => {
  await engine.initializeTask('task-123', steps, 'user-123', context);

  expect(setInitStatus).toHaveBeenCalledWith('task-123', 'PREPARE_WORKSPACE');
  expect(workspaceManager.prepareWorkspace).toHaveBeenCalled();
  expect(setInitStatus).toHaveBeenCalledWith('task-123', 'ACTIVE');
});

// BAD - Overly complex with nested assertions
it('does everything', async () => {
  // 100 lines of setup and assertions
});
```

### 2. Test One Thing at a Time

Each test should verify a single behavior or scenario.

### 3. Use Descriptive Test Names

```typescript
// GOOD
it('handles initialization errors and marks task as failed')

// BAD
it('test 1')
```

### 4. Mock at the Right Level

Mock external dependencies, not internal implementation:

```typescript
// GOOD - Mock external service
vi.mock('./external-service', () => ({ ... }));

// BAD - Mock internal methods
vi.spyOn(component, 'internalMethod').mockReturnValue(...);
```

## Adding New Tests

When adding tests for new features:

1. Create a `.test.ts` file next to the source file
2. Follow the unit + integration test structure
3. Test critical paths and error scenarios
4. Keep integration tests minimal and focused
5. Update this README with new test coverage

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Push to main branches
- Pre-deployment checks

Integration tests are skipped in CI unless required environment variables are present.

## Future Improvements

- [ ] Add E2E tests for full workflow scenarios
- [ ] Add performance benchmarks
- [ ] Add visual regression tests for frontend
- [ ] Implement test data factories
- [ ] Add mutation testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- Shadow Development Guide (CLAUDE.md)
